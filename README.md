# MacroQuest – Petualangan Ekonomi Makro (versi server)

## 1. Struktur folder
index.html · css/style.css · js/data.js (soal bawaan, level, pangkat, badge) · js/app.js (logika klien)
backend/app.py (Flask + SQLite) · backend/requirements.txt

## 2. Menjalankan
```
cd backend
pip install -r requirements.txt
python app.py
```
Buka http://localhost:5000. Agar bisa diakses mahasiswa di jaringan yang sama: http://<IP-komputer-dosen>:5000.
Akun awal: ID `dosen` / passcode `dosen123` (ubah di tab Peserta, atau set env `MQ_DOSEN_PASS` sebelum run pertama).
Akun demo `1001/ahmad1` dan `1002/budi22` dibuat saat database baru dibuat; hapus lewat Dashboard Dosen.

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
SQLite `backend/macroquest.db` (ubah dengan env `MQ_DB`): `users`, `progress` (state JSON + xp/level/score/badge untuk leaderboard), `sessions`, `config`. Cadangkan file ini secara berkala. Skema sengaja ringkas dan bisa dinormalisasi nanti (answers, scores, submissions, exam_results).

## 7. Deployment ke internet
VPS atau PaaS (Render/Railway): dari folder `backend` jalankan `gunicorn -w 2 -b 0.0.0.0:$PORT app:app`. Arahkan `MQ_DB` ke disk persisten (mis. `/data/macroquest.db`), set `MQ_DOSEN_PASS`, dan aktifkan HTTPS. Free tier tanpa disk persisten menghapus data saat restart.

## 8. Catatan keamanan
- XP dan skor dihitung di browser, dan soal dikirim ke browser: mahasiswa yang paham teknis bisa memanipulasinya. Cukup untuk latihan; untuk ujian bernilai tinggi pindahkan penilaian ke server.
- Passcode mahasiswa disimpan apa adanya agar dosen bisa membagikannya; passcode dosen disimpan ter-hash.
- Jadwal pembukaan memakai jam server, tetapi isi level belum diblokir di sisi server.
