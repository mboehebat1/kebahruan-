# Laporan Audit Keamanan — MacroQuest

- **Tanggal:** 1 November 2026
- **Ruang lingkup:** seluruh repo pada commit awal `4050b9b` — `backend/app.py` (Flask + SQLite), `js/app.js`, `js/data.js`, `js/config.js`, `index.html`, `css/style.css`, `backend/requirements.txt`
- **Metode:** (1) review kode manual menyeluruh, (2) eksploitasi terprogram dengan Flask `test_client` terhadap database temporer (21 pemeriksaan; bukti-bukti di bawah adalah hasil aktual), (3) `bandit` 1.9.4 untuk Python, (4) `pip-audit` untuk dependensi, (5) grep pola rahasia/sink XSS/SQL.
- **Hasil akhir:** 16 celah terkonfirmasi pada kode awal. Semua yang dapat ditutup tanpa mengubah arsitektur sudah diperbaiki dan dikunci dengan 25 test otomatis (`tests/test_security.py`, semua lulus). Satu risiko arsitektural (F-11) diturunkan dampaknya tetapi **belum tertutup total** — baca bagian "Sisa risiko".

Skala tingkat keparahan: **Kritis** = ambil alih penuh dari internet tanpa kredensial; **Tinggi** = pelanggaran integritas nilai/kredensial dalam skala kelas; **Sedang** = butuh kondisi/kredensial tertentu; **Rendah** = kebocoran info terbatas/pertahanan berlapis.

---

## Ringkasan temuan

| ID | Temuan | Parah | Status |
|---|---|---|---|
| F-01 | Kredensial bawaan & terekspos: passcode dosen `dosen123`, akun demo ter-seed otomatis, dan file publik `/js/config.js` memuat semuanya | **Kritis** (bila online) | ✅ Diperbaiki |
| F-02 | Password mahasiswa plaintext di DB + dikembalikan API roster | Tinggi | ✅ Diperbaiki |
| F-03 | Token sesi plaintext di DB, berlaku 30 hari, logout tidak mencabut sesi | Sedang | ✅ Diperbaiki |
| F-04 | Integritas state: mahasiswa menilai tugasnya sendiri, memalsukan nama, skor/XP/level tanpa batas, melewati jadwal, tipe data jahat memicu 500 | Tinggi | ✅ Diperbaiki (validasi server) |
| F-05 | Stored XSS: soal/materi dari dashboard & Excel dirender via `innerHTML` tanpa escape ke browser mahasiswa; escaper `E()` tak meng-escape `'`; NIM tak divalidasi dipakai pada atribut `data-n` tanpa escape | Tinggi | ✅ Diperbaiki |
| F-06 | Brute-force login tanpa batas + passcode acak hanya 6 heksadesimal + leaderboard membocorkan semua NIM (username) | Sedang | ✅ Diperbaiki |
| F-07 | Validasi input lemah: nilai 9999 diterima, config/state tanpa batas ukuran/tipe, Excel tanpa cek ekstensi/zip-bomb/batas baris, impor massal tanpa validasi baris | Sedang | ✅ Diperbaiki |
| F-08 | Security headers tidak ada (CSP, anti-clickjacking, nosniff, dll.) | Rendah–Sedang | ✅ Diperbaiki |
| F-09 | `/api/template.xlsx` dapat diunduh tanpa login | Rendah | ✅ Diperbaiki |
| F-10 | Dependensi tak ter-pin (`flask>=3.0` dst.): build tidak reproduktibel | Rendah | ✅ Diperbaiki (pin + pip-audit bersih) |
| F-11 | **Penilaian di klien**: XP/skor dihitung browser; seluruh soal *beserta kunci jawaban* dikirim ke browser | Tinggi (integritas) | ⚠️ Mitigasi parsial — lihat sisa risiko |

### Yang sudah aman pada kode awal (teruji, bukan asumsi)
- **SQL injection**: semua query bernilai pengguna ter-parameterisasi (`?`). PoC `' OR '1'='1' --` pada login → 401. Dua temuan Bandit B608 adalah nama tabel dari tuple hard-coded, bukan input (sekarang ditulis sebagai konstanta SQL eksplisit agar pemindai bersih).
- **Path traversal**: `send_from_directory` menolak `/js/../backend/app.py`, varian `%2e%2e%2f`, dan akses `.db` → 404.
- **Otorisasi per peran**: endpoint dosen menolak anon (401) dan mahasiswa (403); mahasiswa hanya bisa membaca/menulis state miliknya (NIM diambil dari token, bukan parameter) — tidak ditemukan IDOR.
- **CSRF**: autentikasi memakai header `Authorization: Bearer` (bukan cookie) sehingga CSRF klasik tidak berlaku; tidak ada header CORS longgar.
- Pesan error login generik (tidak membedakan "NIM tak ada" vs "passcode salah"), token sesi 192-bit dari `secrets`, batas unggah 5 MB, mode debug Flask mati.

---

## Detail temuan, bukti, dan perbaikan

### F-01 — Kredensial bawaan & terekspos publik · Kritis
**Bukti (kode awal):** `GET /js/config.js` **tanpa login** mengembalikan `{"dp":"dosen123","roster":[{"nim":"1001","pass":"ahmad1"},…]}`. File ini bahkan tidak dimuat `index.html` (kode mati). Selain itu `init_db()` membuat dosen dengan `dosen123` bila env tak diset dan meng-seed `1001/ahmad1`, `1002/budi22` pada database baru. Siapa pun yang tahu repo ini dapat login sebagai dosen pada deployment yang lupa mengganti default: kendali penuh atas peserta, soal, dan nilai.

**Perbaikan:**
- `js/config.js` **dihapus** dari repo.
- Bila `MQ_DOSEN_PASS` tidak diset, passcode dosen **acak 16 karakter** dibuat dan dicetak sekali di log server; memakai `dosen123` memicu peringatan keras di log.
- Akun demo hanya dibuat bila `MQ_SEED_DEMO=1` (dokumentasi & `.env.example` memperingatkan untuk tidak mengaktifkannya di produksi).
- Minimal passcode dosen dinaikkan 6 → **8 karakter**; passcode acak mahasiswa 6 → **8 karakter heksadesimal**.

**Catatan:** riwayat Git tetap memuat string lama, tetapi nilainya hanyalah kredensial *bawaan yang sudah publik* — bukan rahasia produksi. Di Vercel, passcode dosen diset lewat environment variable terenkripsi dan tidak pernah masuk Git.

### F-02 — Password mahasiswa plaintext · Tinggi
**Bukti:** `SELECT pass FROM users WHERE nim='1001'` → `ahmad1`. `GET /api/roster` (dosen) mengembalikan kolom `pass` plaintext untuk seluruh kelas, dan Dashboard Dosen menampilkannya. Kebocoran file DB/backup = seluruh kredensial kelas bocor; mahasiswa kerap memakai ulang kredensial.

**Perbaikan:** semua passcode di-hash dengan Werkzeug (scrypt). Basis data lama **dimigrasi transparan**: passcode plaintext lama diverifikasi constant-time lalu langsung di-upgrade menjadi hash saat login berhasil. API roster tidak lagi mengembalikan passcode/hash. Karena hash tak bisa dibaca kembali, alur dosen disesuaikan: passcode hasil *generate* (tambah peserta/impor massal tanpa passcode) ditampilkan **satu kali** lewat dialog untuk dicatat & dibagikan; isi kolom passcode kosong saat Edit berarti "tidak berubah". Mengganti passcode mahasiswa mencabut seluruh sesi mahasiswa tersebut.

### F-03 — Token sesi plaintext, 30 hari, tak bisa dicabut · Sedang
**Bukti:** token yang diterima klien ditemukan *persis sama* sebagai baris di tabel `sessions`. Logout hanya menghapus `localStorage`; token curian tetap berlaku 30 hari, dan ganti passcode dosen tidak mencabut sesi lain.

**Perbaikan:** yang disimpan di DB hanyalah `SHA-256(token)`; masa berlaku 7 hari; ada `POST /api/logout` yang menghapus sesi di server (tombol Keluar memanggilnya); ganti passcode dosen mencabut sesi dosen lain; sesi kedaluwarsa dibersihkan saat login. Upgrade ini sekaligus **membatalkan semua sesi lama** (semua pengguna login ulang sekali).

### F-04 — Integritas `PUT /api/state` · Tinggi
Endpoint ini menerima state JSON dari browser. Pada kode awal terkonfirmasi:

1. **Self-grading:** kirim tugas, lalu kirim ulang dengan isi `v` sedikit diubah dan `nilai: 100, fb: "Sempurna!"` → server menyimpan nilai palsu (logika lama hanya melindungi nilai bila isi *persis sama*). Mahasiswa tampil "sudah dinilai 100" di halaman Tugasnya dan di rekap.
2. **XP/level/score bebas:** `xp: 999999, lv: 99, score: 10000` tersimpan dan tampil di leaderboard.
3. **Penyamaran nama:** `state.name` dari klien tampil di rekap dosen (hanya `nim` yang dipaksa server).
4. **Jadwal hanya di klien:** level terkunci jadwal tetap bisa ditandai selesai via API.
5. **Tipe jahat** (`xp: "banyak"`) memicu HTTP 500 (`int()` tanpa penjagaan).

**Perbaikan (semua di server):**
1. Nilai/feedback **selalu** diambil dari catatan lama bila isi tugas sama, **di-reset** bila berubah, dan dikosongkan untuk pengiriman baru — klien tak pernah bisa menetapkan nilai.
2. `lv` dan `score` leaderboard kini **diturunkan server dari state** (bobot grade yang sama seperti klien) dan klaim klien diabaikan; XP dibatasi 0–1.000.000, skor per level/boss wajib angka 0–100, ukuran state ≤ 512 KB.
3. `nim/name/kelas/role` dalam state dipaksa dari akun yang login.
4. `done` wajib berupa awalan berurutan dari urutan level (tidak bisa hanya `['UAS']`) dan level yang jadwal pembukaannya (WIB) belum lewat ditolak `403`.
5. Semua angka divalidasi tipenya; input invalid → `400`, bukan `500`.

### F-05 — Stored XSS via `innerHTML` · Tinggi
**Bukti:** payload `<img src=x onerror=alert(document.domain)>` sebagai teks pertanyaan — baik lewat `PUT /api/config` (bank soal) maupun unggahan Excel (parser hanya mengganti `|` dan `'`) — tersimpan dan terkirim mentah ke mahasiswa. Di frontend, soal/ops/pembahasan/materi disisipkan dengan `innerHTML` **tanpa escape** (`<h3>${q.q}</h3>`, `${q.o…}`, `${q.e}`, `<p>${L.m}</p>`, `$('#fb').innerHTML = …${mine}…`), dan fungsi escape `E()` tidak meng-escape `'`. NIM bebas karakter (`x"><svg onload=…>`) diterima server dan dirender pada atribut `data-n="${s.nim}"` tanpa escape di tab Penilaian. Skenario nyata: akun dosen terkompromi / file Excel dari sumber tak tepercaya / data roster impor → skrip berjalan di browser mahasiswa/dosen pada origin aplikasi → token di `localStorage` dapat dicuri. (Kontrol sebaliknya: `toast()` sudah aman memakai `textContent`; sebagian besar field memang sudah di-escape — celahnya adalah jalur soal/materi.)

**Perbaikan:** escape di titik render untuk **semua** konten dinamis (soal, opsi, kunci, pembahasan, langkah hitungan, alasan studi kasus, materi, judul level/tugas, badge, riwayat, atribut `data-n`, nilai, dsb.); `E()` kini meng-escape `<>&"'`; materi tidak lagi di-escape saat disimpan (menghindari escape ganda), hanya saat render; NIM divalidasi server `^[A-Za-z0-9_.\-]{1,32}$`. Ditambah CSP `script-src 'self'` (F-08) sebagai lapis kedua: handler inline seperti `onerror=` tidak dijalankan browser.

### F-06 — Permukaan brute-force login · Sedang
**Bukti:** 15 login salah berturut-turut → 15×401 tanpa penundaan/penguncian; passcode acak hanya `token_hex(3)` (±16,7 juta kombinasi); `GET /api/leaderboard` membagikan **NIM seluruh angkatan** ke mahasiswa mana pun (daftar username siap serang).

**Perbaikan:** rate-limit login — maks. 5 kegagalan/5 menit per IP+NIM dan 30/5 menit per NIM, pelanggaran → `429` + `Retry-After`; keberhasilan mereset hitungan; akun tak dikenal tetap menjalankan verifikasi hash dummy (mengaburkan enumerasi via timing); passcode acak 8 heksadesimal; leaderboard tak lagi memuat NIM (diganti penanda `me`). *Keterbatasan:* rate-limiter in-memory bersifat per-instance di serverless — cukup menekan brute-force dasar; untuk skala besar gunakan store bersama (mis. Vercel KV/Redis).

### F-07 — Validasi input & batas sumber daya · Sedang
**Bukti:** `POST /api/grade` menerima `nilai: 9999`; `PUT /api/config` menerima `bank` bertipe apa pun dan berukuran hingga 5 MB; state per mahasiswa hingga 5 MB; parser Excel menerima berkas apa pun yang bisa dibuka openpyxl (tanpa cek ekstensi/magic, tanpa batas baris/ukuran hasil ekstrak — risiko zip-bomb/DoS memori); impor massal menerima baris tak berbentuk; passcode 1 karakter diterima untuk mahasiswa.

**Perbaikan:** nilai wajib angka 0–100 atau kosong, feedback ≤ 1000 karakter; config ≤ 2 MB dengan validasi tipe (`bank` = dict berisi list string ≤ 1000 entri × 8000 karakter); Excel wajib `.xlsx` + magic `PK`, total ukuran ter-ekstrak ≤ 50 MB dan ≤ 200 anggota zip, maks. 2000 baris, panjang per sel dibatasi; impor massal maks. 1000 baris terstruktur dengan laporan `skipped`; passcode mahasiswa min. 6 (dosen 8), maks. 128 karakter (juga mencegah hash-DoS lewat password raksasa saat login).

### F-08 — Security headers · Rendah–Sedang
**Bukti:** respons `/` tanpa `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.

**Perbaikan:** `@app.after_request` menambahkan CSP (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' *(diperlukan atribut style aplikasi)*; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` kamera/mikrofon/geolokasi mati, `Cache-Control: no-store` untuk `/api/*`, dan HSTS saat HTTPS (termasuk di belakang proxy Vercel via `X-Forwarded-Proto`). Konsekuensi yang disadari: aplikasi tak bisa di-*embed* dalam iframe situs lain.

### F-09 — Template Excel tanpa autentikasi · Rendah
`GET /api/template.xlsx` menanggapi 200 untuk anon (isi contoh soal kecil). Kini khusus dosen (`401/403` selain itu) dan tombol unduh mengirim token.

### F-10 — Rantai pasok dependensi · Rendah
`requirements.txt` memakai rentang terbuka (`flask>=3.0`, `gunicorn>=21.2`). Kini di-pin pada versi teruji (Flask 3.1.3, openpyxl 3.1.5, gunicorn 26.2.0 untuk VPS; root untuk Vercel tanpa gunicorn). `pip-audit` atas kedua file: **tidak ada kerentanan diketahui**. Bandit sesudah patch: tersisa 2 catatan Medium yang **diterima secara sadar** — B108 (`/tmp` adalah satu-satunya direktori tulis di Vercel dan terisolasi per-instance) dan B104 (bind `0.0.0.0` memang diperlukan agar dapat diakses di LAN/VPS; pastikan firewall/reverse-proxy di depannya).

### F-11 — Penilaian sisi klien & kunci jawaban terkirim ke browser · Tinggi ⚠️ sisa risiko
Inti permainan (soal PG/benar-salah/kasus di `js/data.js` + bank dari config, generator hitungan `GEN`) membawa **kunci jawaban ke browser**, dan `judge()` menghitung benar/salah & XP di klien. Mitigasi F-04 membuat manipulasi kasar (loncat level, nilai tugas palsu, angka absurd, jadwal) tertolak, **tetapi** mahasiswa teknis tetap dapat: membaca kunci dari `data.js`/DevTools, atau mengirim state berisi skor per level 100 & XP besar *dalam batas wajar* yang lolos validasi bentuk. Ini konsisten dengan catatan README asli dan dapat diterima untuk **latihan formatif**; tidak untuk ujian sumatif/bernilai tinggi.

**Rekomendasi fase berikutnya (agar tertutup total):** pindahkan bank & generator ke server; endpoint `POST /api/quiz/start` mengembalikan soal *tanpa kunci* + id sesi, `POST /api/quiz/answer` menilai di server dan hanya server yang menambah XP/skor/`done`, `PUT /api/state` dibatasi hanya untuk data tugas/progres non-nilai. Struktur `GEN` (fungsi murni berparameter acak) mudah diporting ke Python.

---

## Keamanan deployment Vercel

- Semua request diteruskan ke satu fungsi Python (`api/index.py` → `backend/app.py`) oleh `vercel.json`; header keamanan F-08 berlaku pada HTML/JS/CSS/API. Kode sumber backend tidak diekspos sebagai file statis karena tidak ada rute yang menyajikannya (traversal teruji 404).
- Variabel rahasia (`MQ_DOSEN_PASS`) disimpan sebagai Environment Variable Vercel (terenkripsi, target Production) — tidak ada di repo/fungsi.
- **Keterbatasan penting:** di Vercel database SQLite berada di `/tmp` yang *ephemeral*: data dapat hilang ketika instance fungsi berganti/deploy ulang, dan instance paralel tidak berbagi data. Deployment ini cocok sebagai demo online yang berfungsi penuh untuk diuji; untuk kelas nyata gunakan VPS/PaaS berdisk persisten (`gunicorn`, `MQ_DB=/data/…`) sesuai README §7 atau migrasi ke Postgres/Turso.
- `.gitignore`/`.vercelignore` baru mencegah file `*.db`, `.env`, `__pycache__` ikut ke Git/deployment.

## Verifikasi sesudah perbaikan

| Pengujian | Hasil |
|---|---|
| `python -m pytest tests/ -q` (25 test: auth & peran, SQLi, traversal, header, hash password/token, migrasi plaintext, anti self-grading, rentang nilai, jadwal, leaderboard tanpa NIM, escape XSS, auth template, penolakan Excel non-xlsx, pencabutan sesi, rate-limit 429, alur dasar) | **25 passed** |
| Entrypoint Vercel (`api/index.py` via test client): `/`, JS/CSS, login dosen | 200 semua |
| `node --check js/app.js` dan `js/data.js` | sintaks valid |
| `bandit -r backend/ api/` | 0 High; 2 Medium diterima (B108/B104, lihat F-10) |
| `pip-audit` (root & backend) | tidak ada kerentanan diketahui |
| Uji beban serangan ulang dari PoC awal (A–Q) | semua vektor yang semula `VULN` kini tertolak/terbatas sebagaimana kolom "Perbaikan"; yang semula `SAFE` tetap `SAFE` |
| Uji online pasca-deploy (Vercel) | halaman, aset, header keamanan, 401 tanpa token, `/js/config.js` 404 — lihat ringkasan sesi pengerjaan |

## Checklist operasional untuk dosen/admin

1. Login pertama sebagai `dosen` dengan passcode dari env/log, **segera ganti** lewat Dashboard Dosen → Peserta → Passcode Dosen (min. 8 karakter, unik, jangan dipakai ulang).
2. Bila pernah menjalankan versi lama di jaringan mana pun: anggap passcode lama & akun demo `1001/1002` diketahui publik — hapus akun demo, ganti passcode dosen. (Upgrade ini otomatis membatalkan sesi lama dan meng-hash passcode mahasiswa saat mereka login.)
3. Tambahkan peserta lewat Dashboard Dosen; catat passcode acak yang tampil sekali, atau tentukan passcode sendiri (min. 6 karakter) untuk dibagikan.
4. Jangan aktifkan `MQ_SEED_DEMO` di internet; jangan commit `.env`/file `.db`.
5. Cadangkan file database secara berkala (deployment non-Vercel). Ingat: data di Vercel dapat hilang — ekspor/rekap nilai secara rutin bila memakai deployment Vercel untuk kelas.
6. Perlakukan nilai kuis/boss sebagai latihan (F-11) sampai penilaian dipindah ke server; gunakan pengamatan/proktor untuk penilaian bernilai tinggi.
