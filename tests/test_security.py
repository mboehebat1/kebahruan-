"""Test keamanan & regresi MacroQuest. Jalankan: pip install pytest && python -m pytest tests/ -q

Setiap test memetakan temuan pada SECURITY_AUDIT.md (kode F-xx).
"""
import hashlib
import io
import json
import os
import sqlite3
import sys
import tempfile

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = tempfile.mkdtemp(prefix='mqtest_')
os.environ['MQ_DB'] = os.path.join(TMP, 'test.db')
os.environ['MQ_DOSEN_PASS'] = 'DosenKuat#2026'
os.environ.pop('MQ_SEED_DEMO', None)
sys.path.insert(0, os.path.join(ROOT, 'backend'))

import app as M  # noqa: E402

client = M.app.test_client()
DB = os.environ['MQ_DB']


def login(nim, pw):
    return client.post('/api/login', json={'nim': nim, 'pass': pw})


@pytest.fixture(scope='module')
def dosen():
    r = login('dosen', 'DosenKuat#2026')
    assert r.status_code == 200, r.get_json()
    return {'Authorization': 'Bearer ' + r.get_json()['token']}


@pytest.fixture(scope='module')
def siswa(dosen):
    r = client.post('/api/roster', json={'nim': '2001', 'name': 'Siswa Uji', 'kelas': 'A', 'pass': 'siswa123'}, headers=dosen)
    assert r.status_code == 200, r.get_json()
    r = login('2001', 'siswa123')
    assert r.status_code == 200, r.get_json()
    tok = r.get_json()['token']
    return {'Authorization': 'Bearer ' + tok}, tok


def base_state(**kw):
    st = {'xp': 0, 'done': [], 'score': {}, 'boss': {}, 'sub': {}, 'bd': [], 'h': [], 'perfect': 0}
    st.update(kw)
    return st


# --- F-01 kredensial bawaan & file rahasia ---
def test_config_js_tidak_ada_lagi():
    assert client.get('/js/config.js').status_code == 404


def test_dosen123_tidak_bisa_login():
    assert login('dosen', 'dosen123').status_code == 401


def test_akun_demo_tidak_dibuat_tanpa_optin():
    assert login('1001', 'ahmad1').status_code == 401


# --- dasar: auth, otorisasi, SQLi, traversal ---
def test_endpoint_tanpa_token_401():
    assert client.get('/api/roster').status_code == 401
    assert client.get('/api/states').status_code == 401
    assert client.get('/api/leaderboard').status_code == 401


def test_mahasiswa_ditolak_dari_endpoint_dosen(siswa):
    h, _ = siswa
    assert client.get('/api/roster', headers=h).status_code == 403
    assert client.put('/api/config', json={}, headers=h).status_code == 403


def test_sql_injection_login_gagal():
    assert login("' OR '1'='1' --", 'x').status_code == 401
    assert login("dosen' --", 'x').status_code == 401


def test_path_traversal_404():
    for p in ('/js/../backend/app.py', '/js/%2e%2e%2fbackend%2fapp.py', '/css/../../backend/test.db'):
        assert client.get(p).status_code == 404, p


def test_security_headers():
    r = client.get('/')
    for h in ('Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy'):
        assert h in r.headers, h
    assert "script-src 'self'" in r.headers['Content-Security-Policy']
    assert client.get('/api/session').headers.get('Cache-Control') == 'no-store'


# --- F-02/F-03 password & token ter-hash ---
def test_password_mahasiswa_terhash_dan_tidak_dibocorkan(dosen, siswa):
    d = sqlite3.connect(DB)
    stored = d.execute("SELECT pass FROM users WHERE nim='2001'").fetchone()[0]
    assert stored != 'siswa123' and stored.startswith(('scrypt:', 'pbkdf2:')), stored
    rows = client.get('/api/roster', headers=dosen).get_json()
    assert rows and all('pass' not in x for x in rows)


def test_token_sesi_terhash_di_db(siswa):
    _, tok = siswa
    d = sqlite3.connect(DB)
    toks = [x[0] for x in d.execute('SELECT token FROM sessions').fetchall()]
    assert tok not in toks
    assert hashlib.sha256(tok.encode()).hexdigest() in toks


def test_migrasi_password_plaintext_lama(dosen):
    d = sqlite3.connect(DB)
    d.execute("INSERT OR REPLACE INTO users VALUES('2002','Pengguna Lama','A','lama123','mhs')")
    d.commit()
    assert login('2002', 'lama123').status_code == 200
    stored = d.execute("SELECT pass FROM users WHERE nim='2002'").fetchone()[0]
    assert stored.startswith(('scrypt:', 'pbkdf2:'))


def test_passcode_acak_ditampilkan_sekali_dan_bisa_login(dosen):
    r = client.post('/api/roster', json={'nim': '2003', 'name': 'Acak', 'kelas': 'B', 'pass': ''}, headers=dosen)
    gen = r.get_json().get('generated')
    assert gen and len(gen) >= 8
    assert login('2003', gen).status_code == 200


def test_validasi_nim_dan_passcode(dosen):
    bad_nim = client.post('/api/roster', json={'nim': 'x"><svg onload=alert(1)>', 'name': 'E', 'kelas': 'A', 'pass': 'pass123'}, headers=dosen)
    assert bad_nim.status_code == 400
    pendek = client.post('/api/roster', json={'nim': '2004', 'name': 'P', 'kelas': 'A', 'pass': 'abc'}, headers=dosen)
    assert pendek.status_code == 400
    assert client.post('/api/dosen/pass', json={'pass': 'pendek7'}, headers=dosen).status_code == 400


# --- F-04 self-grading & spoofing ditolak ---
def test_self_grading_diblokir(siswa, dosen):
    h, _ = siswa
    st = base_state(sub={'1': {'v': {'Judul': 'x'}, 'nilai': None, 'fb': '', 't': '1/1/2026'}})
    assert client.put('/api/state', json={'state': st, 'xp': 0, 'lv': 0, 'score': 0, 'bd': ''}, headers=h).status_code == 200
    st2 = json.loads(json.dumps(st))
    st2['sub']['1'] = {'v': {'Judul': 'diubah'}, 'nilai': 100, 'fb': 'palsu', 't': '1/1/2026'}
    client.put('/api/state', json={'state': st2, 'xp': 0, 'lv': 0, 'score': 0, 'bd': ''}, headers=h)
    got = client.get('/api/state', headers=h).get_json()['state']
    assert got['sub']['1']['nilai'] is None and got['sub']['1']['fb'] == ''
    # dosen menilai -> nilai bertahan selama isi tugas sama, reset bila mahasiswa mengubah isi
    assert client.post('/api/grade', json={'nim': '2001', 'id': '1', 'nilai': 80, 'fb': 'bagus'}, headers=dosen).status_code == 200
    client.put('/api/state', json={'state': got, 'xp': 0, 'lv': 0, 'score': 0, 'bd': ''}, headers=h)
    got = client.get('/api/state', headers=h).get_json()['state']
    assert got['sub']['1']['nilai'] == 80 and got['sub']['1']['fb'] == 'bagus'


def test_nilai_dosen_harus_0_100(dosen):
    assert client.post('/api/grade', json={'nim': '2001', 'id': '1', 'nilai': 9999, 'fb': ''}, headers=dosen).status_code == 400
    assert client.post('/api/grade', json={'nim': '2001', 'id': '1', 'nilai': '100', 'fb': ''}, headers=dosen).status_code == 400


def test_spoofing_nama_dan_batas_skor(siswa):
    h, _ = siswa
    st = base_state(xp=50, score={'1': 90})
    st['name'] = 'Nama Palsu'
    client.put('/api/state', json={'state': st, 'xp': 50, 'lv': 99, 'score': 10000, 'bd': ''}, headers=h)
    got = client.get('/api/state', headers=h).get_json()['state']
    assert got['name'] == 'Siswa Uji'
    lb = client.get('/api/leaderboard', headers=h).get_json()
    me = [x for x in lb if x['me']][0]
    assert me['lv'] <= 13 and me['score'] <= 100
    # progres harus berurutan (tidak bisa lompat ke level/boss akhir)
    assert client.put('/api/state', json={'state': base_state(done=[2]), 'xp': 0}, headers=h).status_code == 400
    assert client.put('/api/state', json={'state': base_state(done=['UAS']), 'xp': 0}, headers=h).status_code == 400
    # tipe/rentang tidak valid -> 400, bukan 500
    assert client.put('/api/state', json={'state': base_state(score={'1': 500}), 'xp': 0}, headers=h).status_code == 400
    assert client.put('/api/state', json={'state': base_state(), 'xp': 'banyak'}, headers=h).status_code == 400
    assert client.put('/api/state', json={'state': base_state(junk='x' * 600_000), 'xp': 0}, headers=h).status_code == 400


def test_level_terjadwal_belum_buka_ditolak(siswa, dosen):
    h, _ = siswa
    assert client.put('/api/config', json={'tasks': {}, 'sched': {'1': '2999-01-01T00:00'}, 'mat': {}, 'bank': None}, headers=dosen).status_code == 200
    r = client.put('/api/state', json={'state': base_state(done=[1]), 'xp': 0, 'lv': 1, 'score': 0, 'bd': ''}, headers=h)
    assert r.status_code == 403
    assert client.put('/api/config', json={'tasks': {}, 'sched': {}, 'mat': {}, 'bank': None}, headers=dosen).status_code == 200


def test_leaderboard_tidak_mengekspos_nim(siswa):
    h, _ = siswa
    lb = client.get('/api/leaderboard', headers=h).get_json()
    assert lb and all('nim' not in x and 'me' in x for x in lb)


def test_config_bank_tidak_valid_ditolak(dosen):
    assert client.put('/api/config', json={'tasks': {}, 'sched': {}, 'mat': {}, 'bank': {'1': [123]}}, headers=dosen).status_code == 400


# --- F-05 XSS: konten dinamis di-escape saat render + CSP ---
def test_frontend_meng_escape_konten_dinamis():
    js = open(os.path.join(ROOT, 'js', 'app.js'), encoding='utf-8').read()
    for frag in ('E(q.q)', 'E(L.m)', 'E(mine)', 'E(q.e)', "E(s.nim)"):
        assert frag in js, frag
    assert '<h3>${q.q}</h3>' not in js and '<p>${L.m}</p>' not in js
    assert "[<>&\"']" in js  # escaper mencakup apostrof (konteks atribut)


def test_template_khusus_dosen(dosen, siswa):
    h, _ = siswa
    assert client.get('/api/template.xlsx').status_code == 401
    assert client.get('/api/template.xlsx', headers=h).status_code == 403
    assert client.get('/api/template.xlsx', headers=dosen).status_code == 200


def test_upload_excel_menolak_ekstensi_lain(dosen):
    r = client.post('/api/questions/parse', headers=dosen,
                  data={'file': (io.BytesIO(b'bukan excel'), 'jahat.txt')}, content_type='multipart/form-data')
    assert r.status_code == 400


# --- sesi: logout mencabut token ---
def test_logout_mencabut_sesi(dosen):
    client.post('/api/roster', json={'nim': '2005', 'name': 'Logout Uji', 'kelas': 'A', 'pass': 'logout123'}, headers=dosen)
    tok = login('2005', 'logout123').get_json()['token']
    h = {'Authorization': 'Bearer ' + tok}
    assert client.get('/api/session', headers=h).status_code == 200
    assert client.post('/api/logout', headers=h).status_code == 200
    assert client.get('/api/session', headers=h).status_code == 401


# --- F-06 rate limiting login ---
def test_rate_limit_login():
    codes = [login('target-rate-limit', 'salah').status_code for _ in range(7)]
    assert 429 in codes, codes


# --- alur dasar tetap berfungsi ---
def test_alur_mahasiswa_dasar(siswa):
    h, _ = siswa
    st = base_state(xp=600, done=[1], score={'1': 100})
    assert client.put('/api/state', json={'state': st, 'xp': 600, 'lv': 1, 'score': 20, 'bd': ''}, headers=h).status_code == 200
    got = client.get('/api/state', headers=h).get_json()['state']
    assert got['done'] == [1] and got['score']['1'] == 100
    # lv & score leaderboard diturunkan server dari state (bukan dipercaya dari klien):
    # hanya 1 dari 5 level kuis bernilai 100 -> kontribusi 0.2 * 20 = 4
    me = [x for x in client.get('/api/leaderboard', headers=h).get_json() if x['me']][0]
    assert me['lv'] == 1 and me['score'] == 4
