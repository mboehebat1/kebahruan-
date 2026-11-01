"""MacroQuest server — Flask + SQLite. Jalankan: pip install -r requirements.txt && python app.py

Catatan keamanan (lihat SECURITY_AUDIT.md):
- Semua passcode disimpan ter-hash (Werkzeug/scrypt), token sesi disimpan sebagai hash SHA-256.
- Login dibatasi (rate-limit) per IP+NIM, nilai dosen tidak bisa diubah/dibuat oleh klien.
- Skor/XP masih dihitung di browser (arsitektur asli): server membatasi rentang & jadwal,
  tetapi integritas penuh membutuhkan penilaian sisi server. Jangan gunakan untuk ujian
  bernilai tinggi tanpa pengawasan.
"""
import os, io, re, json, time, hmac, hashlib, secrets, sqlite3, zipfile
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, send_file, g
from werkzeug.security import generate_password_hash, check_password_hash
from openpyxl import Workbook, load_workbook

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
# Di Vercel filesystem bersifat read-only kecuali /tmp (data TIDAK persisten antar-instance).
DB = os.environ.get('MQ_DB') or ('/tmp/macroquest.db' if os.environ.get('VERCEL') else os.path.join(HERE, 'macroquest.db'))
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

SESSION_TTL = 7 * 86400                  # sesi berlaku 7 hari (sebelumnya 30)
LOGIN_WINDOW, LOGIN_MAX_IP, LOGIN_MAX_NIM = 300, 5, 30
MAX_STATE_BYTES = 512 * 1024
MAX_CONFIG_BYTES = 2 * 1024 * 1024
MAX_XLSX_ROWS = 2000
MAX_XLSX_UNZIPPED = 50 * 1024 * 1024
WIB = timezone(timedelta(hours=7))       # jadwal pembukaan ditafsirkan sebagai WIB
ORD = [1, 2, 3, 4, 5, 6, 7, 'UTS', 8, 9, 10, 11, 12, 13, 'UAS']
# Metadata minimal untuk menurunkan nilai akhir di server (meniru grade() di js/app.js).
LV_CAT = {1: 'q', 2: 'h', 3: 'h', 4: 'h', 5: 'q', 6: 'q', 7: 'k', 8: 'k', 9: 'q', 10: 'q', 11: 'k', 12: 'h', 13: 'a'}
LV_GAME = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}   # level 13 hanya tugas analisis
LV_TASK_DEFAULT = {1, 5, 6, 7, 8, 9, 10, 11, 12, 13}
NIM_RE = re.compile(r'^[A-Za-z0-9_.\-]{1,32}$')
HASH_RE = re.compile(r'^(scrypt|pbkdf2):')
DUMMY_HASH = generate_password_hash(secrets.token_hex(16))  # menyamakan timing login user tak-dikenal

SCHEMA = """
CREATE TABLE IF NOT EXISTS users(nim TEXT PRIMARY KEY, name TEXT, kelas TEXT, pass TEXT, role TEXT DEFAULT 'mhs');
CREATE TABLE IF NOT EXISTS progress(nim TEXT PRIMARY KEY, state TEXT, xp INT DEFAULT 0, lv INT DEFAULT 0, score INT DEFAULT 0, bd TEXT DEFAULT '', updated REAL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, nim TEXT, created REAL);
CREATE TABLE IF NOT EXISTS config(k TEXT PRIMARY KEY, v TEXT);
"""
RENAME_NIM_SQL = ('UPDATE users SET nim=? WHERE nim=?',
                  'UPDATE progress SET nim=? WHERE nim=?',
                  'UPDATE sessions SET nim=? WHERE nim=?')
DELETE_USER_SQL = ("DELETE FROM users WHERE nim=? AND nim!='dosen'",
                   'DELETE FROM progress WHERE nim=?',
                   'DELETE FROM sessions WHERE nim=?')


def init_db():
    fresh = DB != ':memory:' and not os.path.exists(DB)
    parent = os.path.dirname(os.path.abspath(DB))
    if parent:
        os.makedirs(parent, exist_ok=True)
    d = sqlite3.connect(DB, timeout=10)
    d.executescript('PRAGMA journal_mode=WAL;' + SCHEMA)
    if not d.execute("SELECT 1 FROM users WHERE role='dsn'").fetchone():
        pw = os.environ.get('MQ_DOSEN_PASS', '')
        generated = not pw
        if generated:
            pw = secrets.token_hex(8)  # JANGAN pakai passcode bawaan yang diketahui publik
        d.execute("INSERT INTO users VALUES('dosen','Dosen','-',?,'dsn')", (generate_password_hash(pw),))
        if generated:
            print(f'[MacroQuest] Passcode dosen awal (SIMPAN, hanya tampil sekali): {pw}', flush=True)
        elif pw == 'dosen123':
            print('[MacroQuest] PERINGATAN: MQ_DOSEN_PASS masih memakai default lemah "dosen123". Segera ganti!', flush=True)
    # Akun demo hanya dibuat bila diminta eksplisit (jangan aktifkan di produksi).
    if fresh and os.environ.get('MQ_SEED_DEMO', '').lower() in ('1', 'true', 'yes'):
        d.executemany("INSERT INTO users VALUES(?,?,?,?,'mhs')",
                      [('1001', 'Ahmad Contoh', 'A', generate_password_hash('ahmad1')),
                       ('1002', 'Budi Contoh', 'A', generate_password_hash('budi22'))])
    d.commit(); d.close()


def db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB, timeout=10); g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_):
    d = g.pop('db', None)
    if d: d.close()


@app.after_request
def security_headers(resp):
    resp.headers.setdefault('Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; font-src 'self'; connect-src 'self'; "
        "frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
    resp.headers.setdefault('X-Content-Type-Options', 'nosniff')
    resp.headers.setdefault('X-Frame-Options', 'DENY')
    resp.headers.setdefault('Referrer-Policy', 'no-referrer')
    resp.headers.setdefault('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    if request.path.startswith('/api/'):
        resp.headers.setdefault('Cache-Control', 'no-store')
    if request.is_secure or request.headers.get('X-Forwarded-Proto') == 'https':
        resp.headers.setdefault('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    return resp


@app.errorhandler(413)
def too_large(_):
    return jsonify(error='Ukuran data/file melebihi batas 5 MB'), 413


def clean(x): return str(x if x is not None else '').strip()
def body():
    d = request.get_json(force=True, silent=True)
    return d if isinstance(d, dict) else {}
def tok_hash(t): return hashlib.sha256(t.encode()).hexdigest()
def is_hash(p): return bool(p and HASH_RE.match(p))
def loads_or(txt, default=None):
    try:
        v = json.loads(txt) if txt else default
    except (TypeError, ValueError):
        return default
    return v if v is not None else default


def verify_pass(stored, pw):
    if is_hash(stored):
        try:
            return check_password_hash(stored, pw)
        except ValueError:
            return False
    # Legacy: passcode plaintext dari versi lama — dibandingkan constant-time lalu di-upgrade saat login.
    return hmac.compare_digest(str(stored or '').encode(), pw.encode())


def upsert_user(d, nim, name, kelas, raw_pass):
    """Buat/perbarui mahasiswa. Passcode selalu ter-hash; kembalikan passcode acak (bila dibuat) agar ditampilkan sekali."""
    exists = d.execute("SELECT 1 FROM users WHERE nim=? AND role='mhs'", (nim,)).fetchone()
    if exists:
        if raw_pass:
            d.execute('UPDATE users SET name=?,kelas=?,pass=? WHERE nim=?',
                      (name, kelas, generate_password_hash(raw_pass), nim))
            d.execute('DELETE FROM sessions WHERE nim=?', (nim,))  # cabut sesi lama setelah ganti passcode
        else:
            d.execute('UPDATE users SET name=?,kelas=? WHERE nim=?', (name, kelas, nim))
        return None
    generated = None
    if not raw_pass:
        raw_pass = generated = secrets.token_hex(4)  # 8 karakter hex
    d.execute("INSERT INTO users VALUES(?,?,?,?,'mhs')", (nim, name, kelas, generate_password_hash(raw_pass)))
    return generated


# --- rate limiting login (in-memory; di serverless berlaku per-instance, tetap menekan brute-force dasar) ---
_fails = {}
def _rate_keys(nim):
    ip = request.access_route[0] if request.access_route else (request.remote_addr or '-')
    return [(f'ip:{ip}|{nim}', LOGIN_MAX_IP), (f'nim:{nim}', LOGIN_MAX_NIM)]
def _is_limited(nim):
    now = time.time()
    for key, limit in _rate_keys(nim):
        hist = [t for t in _fails.get(key, []) if t > now - LOGIN_WINDOW]
        _fails[key] = hist
        if len(hist) >= limit:
            return True
    return False
def _record_fail(nim):
    now = time.time()
    for key, _ in _rate_keys(nim):
        _fails.setdefault(key, []).append(now)
def _clear_fail(nim):
    for key, _ in _rate_keys(nim):
        _fails.pop(key, None)


def auth(role=None):
    def deco(f):
        @wraps(f)
        def w(*a, **k):
            hdr = request.headers.get('Authorization', '')
            t = hdr[7:] if hdr.startswith('Bearer ') else ''
            u = db().execute('SELECT u.* FROM sessions s JOIN users u ON u.nim=s.nim WHERE s.token=? AND s.created>?',
                             (tok_hash(t), time.time() - SESSION_TTL)).fetchone() if t else None
            if not u: return jsonify(error='Sesi berakhir, silakan login ulang'), 401
            if role and u['role'] != role: return jsonify(error='Khusus dosen'), 403
            g.user = u
            g.token_hash = tok_hash(t)
            return f(*a, **k)
        return w
    return deco


def get_cfg():
    r = db().execute("SELECT v FROM config WHERE k='config'").fetchone()
    cfg = loads_or(r['v'], {}) if r else {}
    if not isinstance(cfg, dict):
        cfg = {}
    for k in ('tasks', 'sched', 'mat'):
        if not isinstance(cfg.get(k), dict):
            cfg[k] = {}
    if 'bank' not in cfg:
        cfg['bank'] = None
    return cfg


def payload(u, token=None):
    p = db().execute('SELECT state FROM progress WHERE nim=?', (u['nim'],)).fetchone()
    return {'token': token, 'now': time.time() * 1000, 'config': get_cfg(),
            'user': {k: u[k] for k in ('nim', 'name', 'kelas', 'role')},
            'state': loads_or(p['state']) if p else None}


@app.post('/api/login')
def login():
    b = body()
    nim, pw = clean(b.get('nim'))[:64], clean(b.get('pass'))
    if _is_limited(nim):
        resp = jsonify(error='Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.')
        resp.status_code = 429; resp.headers['Retry-After'] = str(LOGIN_WINDOW)
        return resp
    if len(pw) > 128:
        _record_fail(nim); return jsonify(error='NIM atau passcode salah'), 401
    u = db().execute('SELECT * FROM users WHERE nim=?', (nim,)).fetchone()
    if not u:
        check_password_hash(DUMMY_HASH, pw)  # kurangi bocornya keberadaan akun via timing
        _record_fail(nim); return jsonify(error='NIM atau passcode salah'), 401
    if not verify_pass(u['pass'], pw):
        _record_fail(nim); return jsonify(error='NIM atau passcode salah'), 401
    _clear_fail(nim)
    d = db()
    if not is_hash(u['pass']):  # migrasi transparan passcode lama (plaintext) -> hash
        d.execute('UPDATE users SET pass=? WHERE nim=?', (generate_password_hash(pw), u['nim']))
    d.execute('DELETE FROM sessions WHERE created<?', (time.time() - SESSION_TTL,))
    t = secrets.token_hex(32)
    d.execute('INSERT INTO sessions VALUES(?,?,?)', (tok_hash(t), u['nim'], time.time())); d.commit()
    return jsonify(payload(u, t))


@app.post('/api/logout')
@auth()
def logout():
    db().execute('DELETE FROM sessions WHERE token=?', (g.token_hash,)); db().commit()
    return jsonify(ok=True)


@app.get('/api/session')
@auth()
def session(): return jsonify(payload(g.user))


@app.get('/api/state')
@auth()
def get_state():
    return jsonify(state=payload(g.user)['state'])


def _bounded_int(v, lo, hi):
    if v is None: return 0
    if isinstance(v, bool) or not isinstance(v, (int, float)): raise ValueError
    return max(lo, min(hi, int(v)))


def _sched_ts(v):
    try:
        dt = datetime.fromisoformat(str(v))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=WIB)
    return dt.timestamp()


def _validate_state(st, cfg):
    """Validasi & normalisasi state dari klien. Naikkan ValueError untuk data tidak sah."""
    if len(json.dumps(st)) > MAX_STATE_BYTES:
        raise ValueError('State terlalu besar')
    done = st.get('done', [])
    if not isinstance(done, list):
        raise ValueError('Format progres tidak valid')
    clean_done, now = [], time.time()
    for k in done:
        if isinstance(k, str) and k.isdigit():
            k = int(k)
        if k not in ORD:
            raise ValueError('Level pada progres tidak dikenal')
        ts = _sched_ts(cfg['sched'].get(str(k))) if cfg['sched'].get(str(k)) else None
        if ts is not None and ts > now:
            raise PermissionError('Level belum dibuka')
        if k not in clean_done:
            clean_done.append(k)
    # Level hanya terbuka berurutan, jadi progres sah selalu berupa awalan (prefix) dari ORD.
    if clean_done != ORD[:len(clean_done)]:
        raise ValueError('Progres level harus berurutan')
    st['done'] = clean_done
    for field, keys in (('score', {str(i) for i in range(1, 14)}), ('boss', {'UTS', 'UAS'})):
        vals = st.get(field, {})
        if not isinstance(vals, dict) or any(str(k) not in keys for k in vals):
            raise ValueError(f'Format {field} tidak valid')
        for v in vals.values():
            if isinstance(v, bool) or not isinstance(v, (int, float)) or not 0 <= v <= 100:
                raise ValueError('Skor harus berupa angka 0–100')
    if 'xp' in st:
        st['xp'] = _bounded_int(st['xp'], 0, 1_000_000)
    if not isinstance(st.get('sub', {}), dict):
        raise ValueError('Format tugas tidak valid')
    return st


def _derive_grade(st, cfg):
    """Nilai akhir diturunkan server dari state (bobot sama seperti grade() di klien):
    kuis 20 + hitungan 20 + tugas terkirim 20 + studi kasus 20 + boss 20."""
    scores = st.get('score') or {}
    def avg(cat):
        vals = [float(scores.get(str(i)) or 0) for i, c in LV_CAT.items() if c == cat and i in LV_GAME]
        return sum(vals) / len(vals) if vals else 0
    tasks = set(LV_TASK_DEFAULT)
    for kid, t in (cfg.get('tasks') or {}).items():
        try:
            i = int(kid)
        except (TypeError, ValueError):
            continue
        if isinstance(t, dict) and 'f' in t:
            tasks.add(i) if t.get('f') else tasks.discard(i)
    subs = st.get('sub') or {}
    task_pct = (sum(1 for i in tasks if str(i) in subs) / len(tasks) * 100) if tasks else 0
    boss = st.get('boss') or {}
    boss_avg = (float(boss.get('UTS') or 0) + float(boss.get('UAS') or 0)) / 2
    total = .2 * avg('q') + .2 * avg('h') + .2 * task_pct + .2 * avg('k') + .2 * boss_avg
    return max(0, min(100, int(total + 0.5)))


@app.put('/api/state')
@auth()
def put_state():
    if g.user['role'] == 'dsn': return jsonify(ok=True)
    b = body(); st = b.get('state')
    if not isinstance(st, dict): return jsonify(error='State tidak valid'), 400
    cfg = get_cfg()
    try:
        _validate_state(st, cfg)
        xp = _bounded_int(b.get('xp'), 0, 1_000_000)
    except PermissionError as e:
        return jsonify(error=str(e)), 403
    except ValueError as e:
        return jsonify(error=str(e) or 'Data tidak valid'), 400
    d = db(); nim = g.user['nim']
    row = d.execute('SELECT state FROM progress WHERE nim=?', (nim,)).fetchone()
    old = loads_or(row['state'], {}) if row else {}
    # Nilai & feedback HANYA boleh berasal dari dosen: pertahankan nilai lama bila isi tugas sama,
    # reset bila isi tugas berubah, dan selalu kosong untuk pengiriman baru. Klien tidak bisa menilai dirinya sendiri.
    for k, sb in (st.get('sub') or {}).items():
        if not isinstance(sb, dict):
            continue
        o = (old.get('sub') or {}).get(k) if isinstance(old.get('sub'), dict) else None
        if isinstance(o, dict) and o.get('v') == sb.get('v'):
            sb['nilai'], sb['fb'] = o.get('nilai'), o.get('fb', '')
        else:
            sb['nilai'], sb['fb'] = None, ''
    # Identitas dalam state dipaksa dari akun yang login (cegah penyamaran nama di rekap dosen).
    st['nim'], st['name'], st['kelas'], st['role'] = nim, g.user['name'], g.user['kelas'], 'mhs'
    # lv & score leaderboard diturunkan dari state oleh server, bukan dipercaya dari klien.
    lv = max([k for k in st['done'] if isinstance(k, int)], default=0)
    score = _derive_grade(st, cfg)
    d.execute('INSERT INTO progress(nim,state,xp,lv,score,bd,updated) VALUES(?,?,?,?,?,?,?) ON CONFLICT(nim) DO UPDATE SET '
              'state=excluded.state,xp=excluded.xp,lv=excluded.lv,score=excluded.score,bd=excluded.bd,updated=excluded.updated',
              (nim, json.dumps(st), xp, lv, score, clean(b.get('bd'))[:40], time.time()))
    d.commit(); return jsonify(ok=True)


@app.get('/api/leaderboard')
@auth()
def leaderboard():
    r = db().execute("SELECT u.nim,u.name,COALESCE(p.xp,0) xp,COALESCE(p.lv,0) lv,COALESCE(p.score,0) score,COALESCE(p.bd,'') bd "
                     "FROM users u LEFT JOIN progress p ON p.nim=u.nim WHERE u.role='mhs' ORDER BY xp DESC,score DESC,u.name").fetchall()
    # NIM (username login) tidak diekspos ke mahasiswa lain; cukup penanda "me".
    return jsonify([{'name': x['name'], 'xp': x['xp'], 'lv': x['lv'], 'score': x['score'], 'bd': x['bd'],
                     'me': x['nim'] == g.user['nim']} for x in r])


@app.put('/api/config')
@auth('dsn')
def put_cfg():
    b = body()
    if len(json.dumps(b)) > MAX_CONFIG_BYTES:
        return jsonify(error='Konfigurasi terlalu besar'), 413
    cfg = {}
    for k in ('tasks', 'sched', 'mat'):
        v = b.get(k)
        if v is None:
            v = {}
        if not isinstance(v, dict):
            return jsonify(error=f'Format {k} tidak valid'), 400
        cfg[k] = v
    bank = b.get('bank')
    if bank is not None:
        if not isinstance(bank, dict):
            return jsonify(error='Format bank soal tidak valid'), 400
        for soal_list in bank.values():
            if not isinstance(soal_list, list) or len(soal_list) > 1000 or \
               any(not isinstance(s, str) or len(s) > 8000 for s in soal_list):
                return jsonify(error='Bank soal berisi entri tidak valid/terlalu besar'), 400
    cfg['bank'] = bank
    db().execute("INSERT INTO config VALUES('config',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", (json.dumps(cfg),))
    db().commit(); return jsonify(ok=True)


@app.get('/api/roster')
@auth('dsn')
def roster():
    # Passcode tidak pernah dikembalikan (sudah ter-hash dan tidak dapat dibaca kembali).
    r = db().execute("SELECT u.nim,u.name,u.kelas,p.xp,p.lv FROM users u LEFT JOIN progress p ON p.nim=u.nim "
                     "WHERE u.role='mhs' ORDER BY u.nim").fetchall()
    return jsonify([dict(x) for x in r])


@app.post('/api/roster')
@auth('dsn')
def roster_save():
    b = body(); old, nim, name = clean(b.get('old')), clean(b.get('nim')), clean(b.get('name'))[:100]
    kelas, raw_pass = clean(b.get('kelas'))[:30], clean(b.get('pass'))
    if not NIM_RE.match(nim) or nim == 'dosen' or not name:
        return jsonify(error='NIM hanya boleh huruf/angka/titik/garis (bukan "dosen") dan nama wajib diisi'), 400
    if raw_pass and not 6 <= len(raw_pass) <= 128:
        return jsonify(error='Passcode mahasiswa minimal 6 karakter'), 400
    d = db()
    if old and old != nim and NIM_RE.match(old) and old != 'dosen':
        if d.execute('SELECT 1 FROM users WHERE nim=?', (nim,)).fetchone(): return jsonify(error='NIM sudah dipakai'), 409
        for sql in RENAME_NIM_SQL: d.execute(sql, (nim, old))
    generated = upsert_user(d, nim, name, kelas, raw_pass)
    d.commit()
    out = {'ok': True}
    if generated: out['generated'] = generated
    return jsonify(**out)


@app.post('/api/roster/bulk')
@auth('dsn')
def roster_bulk():
    rows = request.get_json(silent=True)
    if not isinstance(rows, list):
        return jsonify(error='Format impor harus berupa daftar baris'), 400
    if len(rows) > 1000:
        return jsonify(error='Maksimum 1000 baris per impor'), 400
    n, skipped, generated = 0, 0, []
    d = db()
    for r in rows:
        if not isinstance(r, (list, tuple)) or len(r) < 2:
            skipped += 1; continue
        r = [clean(x) for x in list(r)[:4]] + ['', '', '', '']
        nim, name, kelas, raw_pass = r[0], r[1][:100], r[2][:30], r[3]
        if not NIM_RE.match(nim) or nim == 'dosen' or not name or (raw_pass and not 6 <= len(raw_pass) <= 128):
            skipped += 1; continue
        gen = upsert_user(d, nim, name, kelas, raw_pass)
        if gen: generated.append({'nim': nim, 'pass': gen})
        n += 1
    d.commit(); return jsonify(n=n, skipped=skipped, generated=generated)


@app.delete('/api/roster/<nim>')
@auth('dsn')
def roster_del(nim):
    for sql in DELETE_USER_SQL: db().execute(sql, (nim,))
    db().commit(); return jsonify(ok=True)


@app.post('/api/roster/<nim>/reset')
@auth('dsn')
def roster_reset(nim):
    db().execute('DELETE FROM progress WHERE nim=?', (nim,)); db().commit(); return jsonify(ok=True)


@app.post('/api/dosen/pass')
@auth('dsn')
def dosen_pass():
    p = clean(body().get('pass'))
    if not 8 <= len(p) <= 128: return jsonify(error='Passcode dosen minimal 8 karakter'), 400
    d = db()
    d.execute("UPDATE users SET pass=? WHERE nim='dosen'", (generate_password_hash(p),))
    d.execute("DELETE FROM sessions WHERE nim='dosen' AND token<>?", (g.token_hash,))  # cabut sesi dosen lain
    d.commit()
    return jsonify(ok=True)


@app.get('/api/states')
@auth('dsn')
def states():
    r = db().execute("SELECT p.state FROM progress p JOIN users u ON u.nim=p.nim WHERE u.role='mhs'").fetchall()
    return jsonify([{'state': s} for s in (loads_or(x['state']) for x in r) if s])


@app.post('/api/grade')
@auth('dsn')
def grade():
    b = body(); nim = clean(b.get('nim'))
    r = db().execute('SELECT state FROM progress WHERE nim=?', (nim,)).fetchone()
    if not r: return jsonify(error='Data mahasiswa tidak ditemukan'), 404
    st = loads_or(r['state'])
    if not isinstance(st, dict): return jsonify(error='Data mahasiswa rusak'), 500
    sb = (st.get('sub') or {}).get(str(b.get('id')))
    if not isinstance(sb, dict): return jsonify(error='Tugas tidak ditemukan'), 404
    v = b.get('nilai')
    if v is not None and (isinstance(v, bool) or not isinstance(v, (int, float)) or not 0 <= v <= 100):
        return jsonify(error='Nilai harus berupa angka 0–100 atau kosong'), 400
    sb['nilai'] = v; sb['fb'] = clean(b.get('fb'))[:1000]
    db().execute('UPDATE progress SET state=? WHERE nim=?', (json.dumps(st), nim)); db().commit()
    return jsonify(ok=True)


@app.post('/api/questions/parse')
@auth('dsn')
def parse_questions():
    f = request.files.get('file')
    if not f: return jsonify(error='File belum dipilih'), 400
    if not (f.filename or '').lower().endswith('.xlsx'):
        return jsonify(error='File harus berformat .xlsx'), 400
    raw = f.read()
    if not raw.startswith(b'PK'):
        return jsonify(error='File harus berformat .xlsx'), 400
    try:  # tolak zip-bomb sebelum parsing
        infos = zipfile.ZipFile(io.BytesIO(raw)).infolist()
        if len(infos) > 200 or sum(i.file_size for i in infos) > MAX_XLSX_UNZIPPED:
            return jsonify(error='File Excel terlalu besar setelah diekstrak'), 400
    except zipfile.BadZipFile:
        return jsonify(error='File harus berformat .xlsx'), 400
    try: ws = load_workbook(io.BytesIO(raw), read_only=True, data_only=True).active
    except Exception: return jsonify(error='File harus berformat .xlsx'), 400
    if ws is None: return jsonify(error='Sheet tidak ditemukan'), 400
    c = lambda x: clean(x).replace('|', '/').replace("'", '’')
    items, errs = [], []
    for i, r in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        if i - 1 > MAX_XLSX_ROWS:
            errs.append(f'Dihentikan: maksimum {MAX_XLSX_ROWS} baris per unggahan'); break
        r = list(r or []) + [None] * 8
        if all(x in (None, '') for x in r): continue
        try: lv = int(float(r[0]))
        except (TypeError, ValueError): errs.append(f'Baris {i}: Level harus angka 1-13'); continue
        q, o, a = c(r[1]), [c(x) for x in r[2:6]], c(r[6]).upper()[:1]
        if len(q) > 2000 or any(len(x) > 1000 for x in o) or len(c(r[7])) > 2000:
            errs.append(f'Baris {i}: teks soal/opsi/pembahasan terlalu panjang'); continue
        idx = 'ABCD1234'.find(a) % 4 if a and a in 'ABCD1234' else -1
        if not 1 <= lv <= 13 or not q or not all(o) or idx < 0:
            errs.append(f'Baris {i}: level 1-13, pertanyaan, 4 opsi, dan jawaban (A-D) wajib benar'); continue
        items.append({'l': lv, 's': '|'.join([q, *o, str(idx), c(r[7]) or '-'])})
    return jsonify(items=items, errors=errs)


@app.get('/api/template.xlsx')
@auth('dsn')
def template():
    wb = Workbook(); ws = wb.active; ws.title = 'Soal'
    ws.append(['Level', 'Pertanyaan', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Jawaban (A/B/C/D)', 'Pembahasan'])
    ws.append([2, 'Contoh: multiplier keseimbangan 2 sektor adalah...', '1/(1-b)', '1/b', 'b/(1-b)', '1-b', 'A', 'k = 1/(1 − MPC)'])
    for col, w in zip('ABCDEFGH', [8, 60, 24, 24, 24, 24, 18, 50]): ws.column_dimensions[col].width = w
    bio = io.BytesIO(); wb.save(bio); bio.seek(0)
    return send_file(bio, as_attachment=True, download_name='template_soal.xlsx',
                     mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


@app.get('/')
def index(): return send_from_directory(ROOT, 'index.html')
@app.get('/css/<path:p>')
def css(p): return send_from_directory(os.path.join(ROOT, 'css'), p)
@app.get('/js/<path:p>')
def js(p): return send_from_directory(os.path.join(ROOT, 'js'), p)


init_db()
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
