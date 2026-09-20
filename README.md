# TRASHURY

Aplikasi kasir dan manajemen database lokal untuk memodernisasi operasional
bank sampah kalurahan tanpa ketergantungan internet penuh.

[![CI TRASHURY](https://github.com/AfiqMir/TRASHURY/actions/workflows/main.yml/badge.svg)](https://github.com/AfiqMir/TRASHURY/actions/workflows/main.yml)

Bank sampah tingkat RW umumnya masih mencatat setoran di buku atau spreadsheet:
rawan salah catat, tidak ada rekap otomatis, dan tidak ada data dampak
lingkungan untuk dilaporkan ke Dinas Lingkungan Hidup. Platform nasional yang
ada terlalu kompleks untuk unit sekecil itu dan mengandaikan koneksi internet
yang stabil.

TRASHURY menjawabnya dengan tiga hal sekaligus dalam satu produk:

- **Tetap jalan tanpa internet** — transaksi dicatat ke basis data lokal, lalu
  menyusul terkirim ke server begitu koneksi tersedia (*queue-and-replay*).
- **Klasifikasi sampah dibantu AI** — petugas memotret sampah, model
  *computer vision* mengusulkan kategorinya.
- **Estimasi CO2e otomatis** — berat setoran dikonversi menjadi estimasi
  pengurangan emisi memakai faktor acuan IPCC, siap dipakai untuk pelaporan
  bulanan ke DLH.

## Status

Tahap perancangan. **Kode aplikasi belum dimulai** — lihat
[status pekerjaan](docs/dokumentasi-proyek.md#7-status-pekerjaan) untuk rincian
per bidang.

| Sudah ada | Belum ada |
|---|---|
| Perancangan SDLC tahap 1–3, ERD, skema database lokal, dokumentasi, panduan demo, CI | Backend API, frontend PWA, integrasi model AI, deployment Azure |

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [Halaman produk](https://afiqmir.github.io/TRASHURY/) | Latar belakang, analisis kompetitor, use case, functional requirement, ERD, Gantt chart |
| [Dokumentasi proyek](docs/dokumentasi-proyek.md) | Arsitektur, struktur repositori, keputusan desain, alur kerja tim |
| [Panduan demo](docs/panduan-demo.md) | Naskah peragaan, checklist persiapan, rencana cadangan |
| [ERD](docs/design/erd-trashury.drawio) | Diagram relasi antarentitas (buka di [app.diagrams.net](https://app.diagrams.net)) |
| [Skema database lokal](docs/design/schema-lokal.sql) | DDL SQLite untuk basis data di mesin operator |

## Mencoba skema database

```bash
sqlite3 trashury.db < docs/design/schema-lokal.sql
sqlite3 trashury.db ".tables"
```

## Berkontribusi

Pekerjaan berangkat dari issue, satu branch per anggota (dinamai NIM), lalu
pull request ke `main` dengan keterangan `Closes #<nomor issue>`. CI wajib hijau
sebelum di-merge. Selengkapnya di
[alur kerja tim](docs/dokumentasi-proyek.md#6-alur-kerja-tim).

## Tim

**Kelompok Keren** — Senior Project TI, Departemen Teknologi Elektro dan
Teknologi Informasi, Fakultas Teknik, Universitas Gadjah Mada.

| Peran | Nama | NIM | Fokus |
|---|---|---|---|
| Ketua | Wangsit Nursyahada | 24/545092/TK/60594 | Basis data, API, sinkronisasi, deployment |
| Anggota | Muhammad Afiq Mirza Choiruzan | 24/537942/TK/59646 | Model AI, logika CO2e |
| Anggota | Bintang Daneswara | 24/541599/TK/60084 | Desain UI, frontend, pengujian |
