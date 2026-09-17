---
title: Dokumentasi Proyek TRASHURY
---

# Dokumentasi Proyek TRASHURY

> Dokumen kerja internal kelompok. Status per **17 September 2026**: tahap
> perancangan selesai sebagian, implementasi kode aplikasi **belum dimulai**.
> Bagian yang menjelaskan struktur kode ditandai sebagai *rencana* dan wajib
> diperbarui begitu folder `backend/` dan `frontend/` benar-benar dibuat.

Ringkasan produk, latar belakang, analisis kompetitor, dan perancangan SDLC
tahap 1–3 ada di [halaman utama](index.md). Dokumen ini melengkapinya dengan
hal-hal teknis: arsitektur, struktur repositori, cara menyiapkan lingkungan
kerja, dan konvensi kerja tim.

## 1. Identitas Proyek

| | |
|---|---|
| Nama produk | TRASHURY |
| Mata kuliah | Senior Project TI |
| Instansi | Departemen Teknologi Elektro dan Teknologi Informasi, FT UGM |
| Repositori | <https://github.com/AfiqMir/TRASHURY> |
| Halaman publik | <https://afiqmir.github.io/TRASHURY/> |

**Kelompok Keren**

| Peran | Nama | NIM | Akun GitHub | Fokus pengerjaan |
|---|---|---|---|---|
| Ketua | Wangsit Nursyahada | 24/545092/TK/60594 | `wngstnr-code` | Basis data, API backend, sinkronisasi, deployment Azure, dokumentasi |
| Anggota | Muhammad Afiq Mirza Choiruzan | 24/537942/TK/59646 | `AfiqMir` | Model AI klasifikasi sampah, logika CO2e, forecasting |
| Anggota | Bintang Daneswara | 24/541599/TK/60084 | `bintangdanes` | Desain UI, frontend PWA, pengujian usability |

## 2. Arsitektur Sistem

TRASHURY dirancang *offline-first*: aplikasi tetap dapat mencatat transaksi
tanpa internet, lalu menyusul mengirim data ke server saat koneksi tersedia.

```
+---------------------------------------------------+
|  Aplikasi Desktop Operator (PWA installable)       |
|                                                    |
|  UI kasir  --->  Service worker  --->  DB lokal    |
|                     (cache)           (SQLite)     |
|      |                                    |        |
|      v                                    v        |
|  Model AI ONNX                   Antrian sinkronisasi
|  (klasifikasi foto, jalan lokal)  sync_status='pending'
+---------------------------------------------------+
                        |
                        |  HTTPS, queue-and-replay saat online
                        v
+---------------------------------------------------+
|  Backend API + Database terpusat (Azure)           |
|  - sumber data tunggal seluruh transaksi           |
|  - dashboard CO2e & rekap laporan bulanan DLH      |
+---------------------------------------------------+
```

Tiga teknologi yang diintegrasikan sesuai ketentuan mata kuliah:

| Teknologi | Titik implementasi | Issue terkait |
|---|---|---|
| Jaringan Komputer | Penyimpanan lokal + sinkronisasi *queue-and-replay* ke server | #16 |
| Kecerdasan Buatan | Klasifikasi jenis sampah dari foto (*transfer learning*, diekspor ke ONNX) dan estimasi CO2e | #20, #22, #23 |
| Komputasi Awan | Database, API, dan dashboard dihosting di Azure | #18 |

### Keputusan desain yang sudah dikunci

1. **Identifier berupa UUID yang dibuat di sisi klien.** Beberapa mesin operator
   bisa mencatat transaksi secara offline pada waktu bersamaan; ID auto-increment
   akan bentrok saat semuanya menyinkronkan data ke server yang sama.
2. **Nilai uang disimpan sebagai `INTEGER` rupiah bulat**, bukan `FLOAT`, supaya
   saldo tabungan nasabah tidak pernah meleset karena pembulatan.
3. **Waktu disimpan sebagai teks ISO-8601 UTC.** Formatnya urut secara leksikal,
   jadi bisa diurutkan dan difilter per bulan (`substr(tanggal, 1, 7)`) tanpa
   fungsi tanggal khusus.
4. **Saldo nasabah dijaga oleh trigger database**, bukan oleh kode aplikasi,
   agar buku tabungan tetap konsisten walau aplikasi tertutup paksa.
5. **Setiap baris transaksional membawa `sync_status` dan `synced_at`**, sehingga
   proses sinkronisasi cukup mengambil baris yang belum terkirim.

## 3. Struktur Repositori

Kondisi saat ini:

```
TRASHURY/
├── README.md
├── .github/workflows/main.yml     # CI: cek struktur repo + lint & build frontend
├── docs/                          # GitHub Pages (Jekyll, tema Cayman)
│   ├── _config.yml
│   ├── index.md                   # profil produk + perancangan SDLC 1-3
│   ├── dokumentasi-proyek.md      # dokumen ini
│   ├── panduan-demo.md            # skenario demo
│   └── design/
│       ├── erd-trashury.drawio    # ERD (buka di draw.io / diagrams.net)
│       └── schema-lokal.sql       # DDL SQLite untuk database lokal
└── .vscode/settings.json
```

Rencana penambahan (belum ada, menyusul sesuai issue):

```
├── backend/                       # API + skema server        (#14, #15)
├── frontend/                      # PWA kasir                 (#26-#30)
└── ai/                            # notebook & ekspor model   (#19-#25)
```

Nama folder `frontend/` sudah dipakai sebagai acuan oleh CI (variabel
`FRONTEND_DIR` pada `.github/workflows/main.yml`). Jika folder ini nanti diberi
nama lain, workflow harus ikut diubah.

## 4. Basis Data

- **Diagram:** `docs/design/erd-trashury.drawio` — buka di
  <https://app.diagrams.net> (File → Open From → Device) atau ekstensi
  *Draw.io Integration* di VS Code.
- **Skema:** `docs/design/schema-lokal.sql` — DDL SQLite untuk database lokal
  di mesin operator.

Enam entitas: `nasabah`, `operator`, `kategori_sampah`, `transaksi`,
`detail_transaksi`, `penarikan_saldo`. Dua view disiapkan untuk kebutuhan
laporan: `v_buku_tabungan` (FR 6) dan `v_rekap_bulanan` (FR 8).

Membuat database kosong untuk percobaan:

```bash
sqlite3 trashury.db < docs/design/schema-lokal.sql
sqlite3 trashury.db ".tables"
```

> Catatan revisi terhadap ERD di halaman utama: entitas **Detail Transaksi**
> kini memuat `id_kategori` sebagai *foreign key*. Tanpa kolom itu relasi
> "satu kategori sampah dipakai di banyak detail transaksi" tidak dapat
> direalisasikan. Kolom `sumber_klasifikasi` juga ditambahkan untuk mencatat
> apakah kategori dipilih oleh model AI atau dikoreksi manual oleh operator —
> data ini nantinya berguna untuk mengevaluasi akurasi model di lapangan (#21).

## 5. Menyiapkan Lingkungan Kerja

Prasyarat yang sudah dipakai sekarang:

| Kebutuhan | Versi | Dipakai untuk |
|---|---|---|
| Git | 2.40+ | Version control |
| SQLite | 3.40+ | Menjalankan `schema-lokal.sql` |
| draw.io / diagrams.net | — | Membuka berkas `.drawio` |

Menyalin repositori:

```bash
git clone https://github.com/AfiqMir/TRASHURY.git
cd TRASHURY
```

Prasyarat tambahan yang akan menyusul bersama kodenya: Node.js 22 (frontend
PWA, sudah dipatok di CI) dan Python 3.11 (pelatihan model AI).

## 6. Alur Kerja Tim

1. **Issue dulu.** Semua pekerjaan berangkat dari issue di GitHub Project
   kelompok. Ambil issue yang sudah di-*assign* ke kamu dan pindahkan ke
   kolom *In Progress* sebelum mulai.
2. **Satu branch per anggota**, dinamai dengan NIM: `545092`, `537942`,
   `541599`. Untuk pekerjaan besar, boleh pakai turunan seperti
   `545092-erd-dokumentasi`.
3. **Pesan commit** memakai awalan jenis perubahan: `feat:`, `fix:`, `docs:`,
   `chore:`, `refactor:`. Contoh: `docs: add ERD and local database schema`.
4. **Pull request ke `main`**, disertai keterangan `Closes #<nomor issue>`.
   Minta minimal satu anggota lain me-*review* sebelum di-*merge*.
5. **CI wajib hijau.** Workflow `CI TRASHURY` memeriksa keberadaan `README.md`
   dan folder `docs/`, lalu menjalankan lint dan build frontend bila
   `frontend/package.json` sudah ada.

## 7. Status Pekerjaan

| Bidang | Status | Issue |
|---|---|---|
| Rencana sprint & pemisahan MVP/stretch goal | Selesai | #6 |
| GitHub Project & GitHub Action | Selesai | #7 |
| User flow & wireframe lo-fi | Selesai | #9 |
| Dataset & model klasifikasi sampah | Selesai | #19, #20 |
| ERD dan skema database | Selesai | #13 |
| Dokumentasi proyek & panduan demo | Selesai | #8 |
| Desain UI hi-fi | Berjalan | #10 |
| API master data & transaksi | Belum mulai | #14, #15 |
| Sinkronisasi offline→online | Belum mulai | #16 |
| Rekap & export laporan bulanan | Belum mulai | #17 |
| Deployment Azure | Belum mulai | #18 |
| Frontend PWA | Belum mulai | #26–#30 |
| Integrasi & pengujian end-to-end | Belum mulai | #31–#34 |
