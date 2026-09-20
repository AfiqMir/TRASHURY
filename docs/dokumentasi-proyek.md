---
title: Dokumentasi Proyek TRASHURY
---

# Dokumentasi Proyek TRASHURY

Dokumen kerja internal kelompok. Status per 17 September 2026: tahap
perancangan selesai sebagian, implementasi kode aplikasi belum dimulai. Bagian
yang menjelaskan struktur kode masih berupa rencana dan wajib diperbarui begitu
folder `backend/` dan `frontend/` benar-benar dibuat.

Ringkasan produk, latar belakang, analisis kompetitor, dan perancangan SDLC
tahap 1-3 ada di [halaman utama](index.md). Dokumen ini melengkapinya dengan
hal-hal teknis: arsitektur, struktur repositori, cara menyiapkan lingkungan
kerja, dan konvensi kerja tim.

## 1. Identitas Proyek

| | |
|---|---|
| Nama produk | TRASHURY |
| Mata kuliah | Senior Project TI |
| Jenis produk | Aplikasi web progresif (PWA) yang dapat dipasang di desktop operator |
| Instansi | Departemen Teknologi Elektro dan Teknologi Informasi, FT UGM |
| Repositori | <https://github.com/AfiqMir/TRASHURY> |
| Halaman publik | <https://afiqmir.github.io/TRASHURY/> |

Kelompok Keren. Modul praktikum menyediakan lima peran: Project Manager,
UIUX Designer, Software Engineer, AI Engineer, dan Cloud Engineer. Karena
anggota hanya tiga orang, sebagian anggota memegang lebih dari satu peran.

| Nama | NIM | Akun GitHub | Peran | Cakupan |
|---|---|---|---|---|
| Wangsit Nursyahada | 24/545092/TK/60594 | `wngstnr-code` | Project Manager, Cloud Engineer | Rencana dan pemantauan proyek, basis data, API, sinkronisasi, deployment Azure, dokumentasi |
| Muhammad Afiq Mirza Choiruzan | 24/537942/TK/59646 | `AfiqMir` | AI Engineer | Ketersediaan dan kelayakan data, model klasifikasi sampah, logika perhitungan CO2e |
| Bintang Daneswara | 24/541599/TK/60084 | `bintangdanes` | UIUX Designer, Software Engineer | Desain antarmuka, pengembangan frontend PWA, pengujian usability |

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

1. Identifier berupa UUID yang dibuat di sisi klien. Beberapa mesin operator
   bisa mencatat transaksi secara offline pada waktu bersamaan; ID
   auto-increment akan bentrok saat semuanya menyinkronkan data ke server yang
   sama.
2. Nilai uang disimpan sebagai `INTEGER` rupiah bulat, bukan `FLOAT`, supaya
   saldo tabungan nasabah tidak pernah meleset karena pembulatan.
3. Waktu disimpan sebagai teks ISO-8601 UTC. Formatnya urut secara leksikal,
   jadi bisa diurutkan dan difilter per bulan (`substr(tanggal, 1, 7)`) tanpa
   fungsi tanggal khusus.
4. Saldo nasabah dijaga oleh trigger database, bukan oleh kode aplikasi, agar
   buku tabungan tetap konsisten walau aplikasi tertutup paksa.
5. Setiap baris transaksional membawa `sync_status` dan `synced_at`, sehingga
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

| Berkas | Isi |
|---|---|
| `docs/design/erd-trashury.drawio` | Diagram ERD. Buka di <https://app.diagrams.net> lewat menu File, Open From, Device, atau pakai ekstensi Draw.io Integration di VS Code. |
| `docs/design/schema-lokal.sql` | DDL SQLite untuk database di mesin operator. |
| `docs/design/schema-azure.sql` | DDL PostgreSQL untuk Azure Database for PostgreSQL, sumber data tunggal seluruh unit. |

Enam entitas: `nasabah`, `operator`, `kategori_sampah`, `transaksi`,
`detail_transaksi`, `penarikan_saldo`. Dua view disiapkan untuk kebutuhan
laporan: `v_buku_tabungan` (FR 6) dan `v_rekap_bulanan` (FR 8).

Membuat database kosong untuk percobaan:

```bash
sqlite3 trashury.db < docs/design/schema-lokal.sql
sqlite3 trashury.db ".tables"
```

### Dua skema, satu ERD

Entitas dan relasinya sama persis di kedua sisi; yang berbeda hanya hal-hal
yang memang harus berbeda:

| Aspek | Lokal (SQLite) | Server (PostgreSQL) |
|---|---|---|
| Identifier | `TEXT` berisi UUID buatan klien | `UUID` native; tabel master boleh `gen_random_uuid()`, tabel transaksional wajib memakai UUID kiriman klien |
| Uang | `INTEGER` rupiah | `BIGINT` rupiah |
| Berat & CO2e | `REAL` | `NUMERIC(10,2)` dan `NUMERIC(12,4)`, presisi pasti tanpa galat pembulatan biner pada angka laporan |
| Waktu | `TEXT` ISO-8601 UTC | `TIMESTAMPTZ` |
| Boolean | `INTEGER` 0/1 | `BOOLEAN` |
| Status sinkronisasi | `sync_status`, `synced_at` | tidak ada, diganti `diterima_at` |

Kolom `sync_status` sengaja tidak ikut ke server: statusnya adalah urusan
masing-masing klien, dan server tidak perlu tahu sebuah baris dulu sempat
mengantre berapa lama. Sebagai gantinya server mencatat `diterima_at`, yaitu
kapan baris itu betul-betul sampai. Selisihnya terhadap `tanggal` sekaligus
menjadi bukti terukur bahwa mekanisme offline memang bekerja, dan itu angka
yang enak ditunjukkan saat demo.

### Sinkronisasi yang aman diulang

Karena primary key transaksi dibuat di klien, server dapat menerima kiriman
yang sama berkali-kali tanpa menggandakan data. Inilah yang membuat
queue-and-replay (#16) aman ketika koneksi terputus di tengah pengiriman dan
klien mencoba lagi:

```sql
INSERT INTO transaksi (id_transaksi, id_nasabah, id_operator, tanggal,
                       total_nominal, total_co2e)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (id_transaksi) DO NOTHING;
```

Konsekuensinya, endpoint sinkronisasi di #15 wajib memakai pola `ON CONFLICT
DO NOTHING` ini, bukan `INSERT` polos. Satu transaksi beserta seluruh
detailnya juga harus dikirim dalam satu transaksi database, supaya tidak
pernah ada transaksi yang tersimpan tanpa detailnya.

### Revisi terhadap ERD di halaman utama

Entitas Detail Transaksi kini memuat `id_kategori` sebagai foreign key. Tanpa
kolom itu relasi "satu kategori sampah dipakai di banyak detail transaksi"
tidak dapat direalisasikan.

Kolom `sumber_klasifikasi` juga ditambahkan untuk mencatat apakah kategori
dipilih oleh model AI atau dikoreksi manual oleh operator. Data ini nantinya
berguna untuk mengevaluasi akurasi model di lapangan (#21).

## 5. Menyiapkan Lingkungan Kerja

Prasyarat yang sudah dipakai sekarang:

| Kebutuhan | Versi | Dipakai untuk |
|---|---|---|
| Git | 2.40+ | Version control |
| SQLite | 3.40+ | Menjalankan `schema-lokal.sql` |
| draw.io / diagrams.net | bebas | Membuka berkas `.drawio` |

Menyalin repositori:

```bash
git clone https://github.com/AfiqMir/TRASHURY.git
cd TRASHURY
```

Prasyarat tambahan yang akan menyusul bersama kodenya: Node.js 22 (frontend
PWA, sudah dipatok di CI) dan Python 3.11 (pelatihan model AI).

## 6. Alur Kerja Tim

1. Semua pekerjaan berangkat dari issue di GitHub Project kelompok. Ambil
   issue yang sudah di-*assign* ke kamu dan pindahkan ke kolom In Progress
   sebelum mulai.
2. Satu branch per anggota, dinamai dengan NIM: `545092`, `537942`, `541599`.
   Kerjakan semuanya di branch itu, jangan membuat branch turunan per tugas.
3. Pesan commit memakai awalan jenis perubahan: `feat:`, `fix:`, `docs:`,
   `chore:`, `refactor:`. Contoh: `docs: add ERD and local database schema`.
4. Pull request dari branch anggota ke `main`, disertai keterangan
   `Closes #<nomor issue>`. Minta minimal satu anggota lain me-*review*
   sebelum di-*merge*.
5. Setelah PR di-merge, samakan kembali branch anggota dengan `main` supaya
   tidak tertinggal:

   ```bash
   git push origin origin/main:refs/heads/545092
   ```

6. CI wajib hijau. Workflow `CI TRASHURY` memeriksa keberadaan `README.md` dan
   folder `docs/`, lalu menjalankan lint dan build frontend bila
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
| Sinkronisasi offline ke online | Belum mulai | #16 |
| Rekap & export laporan bulanan | Belum mulai | #17 |
| Deployment Azure | Belum mulai | #18 |
| Frontend PWA | Belum mulai | #26 sampai #30 |
| Integrasi & pengujian end-to-end | Belum mulai | #31 sampai #34 |

## 8. Ketentuan Modul Praktikum

Modul Senior Project TI mewajibkan produk mengimplementasikan tiga teknologi
sekaligus. Ketiganya dinilai terpisah dan berbobot sama, jadi tidak boleh ada
satu pun yang dikerjakan setengah-setengah.

| Kriteria penilaian produk akhir | Bobot | Letaknya di TRASHURY |
|---|---|---|
| Rumusan permasalahan dan solusi | 10% | Latar belakang dan rumusan masalah di [halaman utama](index.md) |
| Implementasi jaringan komputer | 20% | Pencatatan lokal saat koneksi terbatas dan sinkronisasi queue-and-replay ke server (#16) |
| Implementasi komputasi awan | 20% | Basis data PostgreSQL, API, dan dasbor di Azure (#18) |
| Implementasi kecerdasan buatan | 20% | Klasifikasi jenis sampah dari foto dan estimasi CO2e (#20 sampai #23) |
| Demo produk berjalan lancar | 5% | [Panduan demo](panduan-demo.md) |

Penilaian proses juga memuat komponen dokumentasi sebesar 20%, yang menuntut
tiga hal: riwayat pengembangan terdokumentasi lewat Git, penjelasan singkat
penggunaan produk, dan panduan untuk melakukan demo. Dua yang pertama dipenuhi
oleh repositori ini beserta README, yang ketiga oleh panduan demo. Panduan
penggunaan produk untuk operator masih harus ditulis begitu antarmukanya jadi.

Produk akhir akan dideploy pada akun Azure milik departemen sebagai showcase,
sehingga #18 bukan sekadar kebutuhan teknis melainkan syarat penilaian.
