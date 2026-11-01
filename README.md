# MacroQuest – Petualangan Ekonomi Makro (versi server)

## 1. Struktur folder
index.html · css/style.css · js/data.js (soal bawaan, level, pangkat, badge) · js/app.js (logika klien)
backend/app.py (Flask + SQLite) · backend/requirements.txt · api/index.py + vercel.json (entrypoint Vercel) · tests/ (test keamanan) · SECURITY_AUDIT.md (laporan audit)

## 2. Menjalankan
```
cd backend
pip install -r requirements.txt
python app.py
```
Buka http://localhost:5000. Agar bisa diakses mahasiswa di jaringan yang sama: http://<IP-komputer-dosen>:5000.
Akun awal: ID `dosen`. Set env `MQ_DOSEN_PASS` (min. 8 karakter, kuat & acak — lihat `.env.example`) **sebelum run pertama**; bila tidak diset, server membuat passcode acak dan mencetaknya **sekali** di log. Tidak ada lagi passcode bawaan.
Akun demo hanya dibuat bila `MQ_SEED_DEMO=1` (demo lokal): `1001/ahmad1`, `1002/budi22`. **Jangan aktifkan di produksi.**
Semua passcode (dosen & mahasiswa) tersimpan ter-hash. Passcode acak yang dibuat saat menambah/mengimpor peserta hanya tampil **sekali** di Dashboard Dosen — catat dan bagikan saat itu juga; untuk menggantinya, isi kolom passcode baru saat Edit peserta.

## 3. Dashboard Dosen
- **Peserta**: tambah/edit/hapus/reset progres, impor massal `NIM,Nama,Kelas,Passcode`, ganti passcode dosen.
- **Tugas**: nama, deadline, petunjuk, dan kolom isian per level.
- **Level & Quiz**: jadwal pembukaan, kelola soal (tambah/edit/hapus), upload Excel, ubah materi.
- **Penilaian**: rekap nilai, lihat tugas masuk, beri nilai dan feedback.
Semua perubahan tersimpan di server dan langsung berlaku untuk semua mahasiswa.

## 4. Upload soal dari Excel
Tab Level & Quiz → **Unduh Template** → isi kolom: Level (1–13), Pertanyaan, Opsi A–D, Jawaban (A/B/C/D), Pembahasan → **Upload**.
Centang "Timpa" untuk mengganti seluruh soal pada level yang ada di file. Baris yang tidak valid dilewati dan dilaporkan.

## 5. Mengubah XP, nilai, level (kode)
- XP per jawaban: `judge` di js/app.js (`good?100:10`); bonus level `lvlEnd`; boss `bossEnd`; tugas `submit`. Pangkat: `RK` di data.js.
- Bobot nilai akhir: `grade()`; batas lulus level (60) dan boss (70); komposisi boss: `cf` di `bossItems`.
- Level baru: tambah objek di `LV` (data.js) dan id-nya di `ORD` (app.js); sesuaikan angka `15`.
- Generator hitungan: tambah fungsi di `GEN`; soal benar/salah: `TFB`.

## 6. Database
SQLite `backend/macroquest.db` (ubah dengan env `MQ_DB`; di Vercel otomatis `/tmp/macroquest.db`): `users` (passcode ter-hash), `progress` (state JSON + xp/level/score/badge untuk leaderboard), `sessions` (token ter-hash SHA-256), `config`. Cadangkan file ini secara berkala. Skema sengaja ringkas dan bisa dinormalisasi nanti (answers, scores, submissions, exam_results). Setelah upgrade keamanan ini, sesi lama tidak berlaku lagi (semua pengguna login ulang) dan passcode mahasiswa lama otomatis di-hash saat login berikutnya.

## 7. Deployment ke internet
**Vercel** (sudah dikonfigurasi): impor repo ini sebagai Project Vercel (tanpa build command) — `vercel.json` mengarahkan semua request ke fungsi Python `api/index.py`, dependensi dari `requirements.txt` di root. Set env `MQ_DOSEN_PASS` di Project Settings → Environment Variables sebelum deploy pertama.
⚠️ SQLite di Vercel disimpan di `/tmp`, yang **tidak persisten**: data peserta/progres dapat hilang saat instance fungsi dibuat ulang atau saat deploy baru. Cukup untuk demo/uji coba online; untuk pemakaian kelas sesungguhnya gunakan VPS/PaaS di bawah ini atau migrasi ke database cloud (Postgres/Turso/Supabase).

**VPS atau PaaS (Render/Railway)**: dari folder `backend` jalankan `gunicorn -w 2 -b 0.0.0.0:$PORT app:app`. Arahkan `MQ_DB` ke disk persisten (mis. `/data/macroquest.db`), set `MQ_DOSEN_PASS`, dan aktifkan HTTPS. Free tier tanpa disk persisten menghapus data saat restart.

## 8. Test
```
pip install pytest
python -m pytest tests/ -q
```
25 test keamanan/regresi (auth, hash password & token, anti self-grading, rate limiting, XSS escaping, validasi, dll).

## 9. Catatan keamanan
Detail lengkap: **SECURITY_AUDIT.md**. Ringkasnya:
- Semua passcode ter-hash (scrypt Werkzeug), token sesi ter-hash (SHA-256), sesi 7 hari dan bisa dicabut (logout/ganti passcode), login dibatasi 5 kegagalan/5 menit per IP+NIM, security headers + CSP aktif, semua konten dinamis di-escape di frontend, nilai dosen tidak bisa dibuat/diubah klien, jadwal pembukaan (WIB) dan rentang skor divalidasi server.
- **Sisa risiko yang disadari**: XP dan skor kuis masih dihitung di browser, dan bank soal + kunci jawaban ikut terkirim ke browser (js/data.js & config). Mahasiswa yang paham teknis masih bisa memalsukan XP/skor *dalam rentang wajar*. Cukup untuk latihan formatif; untuk ujian bernilai tinggi pindahkan penilaian ke server.
- Token sesi disimpan di `localStorage`; mitigasi pencuriannya adalah escaping XSS + CSP + masa berlaku 7 hari + pencabutan sesi.
