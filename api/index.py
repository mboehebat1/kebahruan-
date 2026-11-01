"""Entrypoint Vercel (Python serverless) — memuat aplikasi Flask dari backend/app.py.

Di Vercel, database diarahkan ke /tmp/macroquest.db (filesystem lain read-only).
PERINGATAN: /tmp di serverless TIDAK persisten — data dapat hilang saat instance
baru dibuat / fungsi di-deploy ulang. Untuk pemakaian kelas sesungguhnya gunakan
VPS/PaaS dengan disk persisten (lihat README §6-7) atau migrasi ke database cloud.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))

from app import app  # noqa: E402,F401  (Vercel menjalankan objek WSGI bernama `app`)
