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
| Kategori | Climate Action |
| Tipe aplikasi | Aplikasi desktop Windows, dibangun dengan C# dan WPF |
| Mata kuliah | Senior Project TI |
| Instansi | Departemen Teknologi Elektro dan Teknologi Informasi, FT UGM |
| Repositori | <https://github.com/AfiqMir/TRASHURY> |
| Halaman publik | <https://afiqmir.github.io/TRASHURY/> |

Kelompok Keren.

Modul praktikum menetapkan tiga tanggung jawab: software architect, backend
developer, dan front end developer. Pembagiannya di kelompok ini:

| Tanggung jawab | Nama | NIM | Akun GitHub | Cakupan |
|---|---|---|---|---|
| Software architect, backend developer | Wangsit Nursyahada | 24/545092/TK/60594 | `wngstnr-code` | Rancangan sistem, basis data, API, sinkronisasi, deployment Azure, dokumentasi |
| Backend developer (layanan cerdas) | Muhammad Afiq Mirza Choiruzan | 24/537942/TK/59646 | `AfiqMir` | Klasifikasi sampah lewat Azure Custom Vision, logika perhitungan CO2e |
| Front end developer | Bintang Daneswara | 24/541599/TK/60084 | `bintangdanes` | Antarmuka WPF, desain UI, pengujian usability |

## 2. Arsitektur Sistem

TRASHURY dirancang *offline-first*: aplikasi tetap dapat mencatat transaksi
tanpa internet, lalu menyusul mengirim data ke server saat koneksi tersedia.

```
+-----------------------------------------------------+
|  TRASHURY Desktop (C# WPF, mesin operator)          |
|                                                     |
|  Jendela kasir  --->  Lapisan data  --->  SQLite    |
|                                           lokal     |
|       |                       |                     |
|       v                       v                     |
|  Foto sampah          Antrian sinkronisasi          |
|                       sync_status='pending'         |
+-----------------------------------------------------+
            |                        |
            | HTTPS                  | HTTPS, queue-and-replay
            v                        v
+----------------------+  +---------------------------+
| Azure Custom Vision  |  | TRASHURY API (ASP.NET     |
| klasifikasi kategori |  | Core) + PostgreSQL Azure  |
| sampah dari foto     |  | sumber data tunggal,      |
|                      |  | rekap CO2e bulanan        |
+----------------------+  +---------------------------+
```

Klasifikasi foto memerlukan koneksi karena dilayani Azure Custom Vision. Saat
koneksi tidak ada, operator memilih kategori secara manual dan transaksi tetap
tercatat, jadi tidak ada fungsi kasir yang berhenti karena internet mati.

Teknologi yang dipakai dan letaknya:

| Teknologi | Titik implementasi | Issue terkait |
|---|---|---|
| C# dan WPF | Aplikasi desktop operator, sesuai ketentuan modul praktikum | #26 sampai #30 |
| SQLite lokal | Basis data di mesin operator agar kasir jalan tanpa internet | #16 |
| ASP.NET Core dan PostgreSQL di Azure | API dan basis data terpusat, sumber data tunggal seluruh transaksi | #14, #15, #18 |
| Azure Custom Vision | Klasifikasi jenis sampah dari foto, layanan pihak ketiga yang disarankan modul | #20, #22 |

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
├── Trashury.sln                   # solution C#
└── src/
    ├── Trashury.Desktop/          # aplikasi WPF kasir        (#26-#30)
    ├── Trashury.Api/              # ASP.NET Core Web API      (#14, #15)
    └── Trashury.Core/             # entitas, aturan bisnis, akses data
```

`Trashury.Core` sengaja dipisah agar aplikasi desktop dan API memakai kelas
entitas serta aturan perhitungan yang sama, tidak ditulis dua kali. Bagian ini
juga yang paling menunjukkan desain berorientasi objek, komponen yang dinilai
tersendiri di modul praktikum.

CI mencari berkas `.sln` di akar repositori. Jika nama solution atau susunan
folder berubah, `.github/workflows/main.yml` harus ikut diubah.

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
| Windows | 10 atau 11 | Menjalankan aplikasi WPF |
| .NET SDK | 8.0 | Membangun aplikasi desktop dan API |
| Visual Studio 2022 | Community | Perancangan antarmuka WPF |

Menyalin repositori:

```bash
git clone https://github.com/AfiqMir/TRASHURY.git
cd TRASHURY
```

Aplikasi WPF hanya berjalan di Windows. Anggota yang memakai macOS atau Linux
masih dapat mengerjakan API, basis data, dan dokumentasi, tetapi membutuhkan
mesin Windows, mesin virtual, atau komputer pinjaman untuk menjalankan dan
menguji aplikasi desktopnya.

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
   folder `docs/`, lalu menjalankan `dotnet build` bila berkas solution sudah
   ada di repositori.

## 7. Status Pekerjaan

| Bidang | Status | Issue |
|---|---|---|
| Rencana sprint & pemisahan MVP/stretch goal | Selesai | #6 |
| GitHub Project & GitHub Action | Selesai | #7 |
| User flow & wireframe lo-fi | Selesai | #9 |
| Klasifikasi sampah lewat Azure Custom Vision | Perlu ditinjau ulang | #19, #20 |
| ERD dan skema database | Selesai | #13 |
| Dokumentasi proyek & panduan demo | Selesai | #8 |
| Desain UI hi-fi | Berjalan | #10 |
| API master data & transaksi | Belum mulai | #14, #15 |
| Sinkronisasi offline ke online | Belum mulai | #16 |
| Rekap & export laporan bulanan | Belum mulai | #17 |
| Deployment Azure | Belum mulai | #18 |
| Aplikasi desktop WPF | Belum mulai | #26 sampai #30 |
| Integrasi & pengujian end-to-end | Belum mulai | #31 sampai #34 |

## 8. Ketentuan Modul Praktikum

Ketentuan berikut mengikat dan menjadi dasar keputusan teknis di atas.

| Ketentuan | Konsekuensi pada proyek |
|---|---|
| Tema Climate Action | TRASHURY mencatat setoran sampah dan mengestimasi pengurangan emisi CO2e |
| Aplikasi wajib ditulis dengan C# | Aplikasi desktop memakai WPF, API memakai ASP.NET Core |
| Tipe aplikasi desktop: Windows Store, Windows Form, atau WPF | Dipilih WPF karena pemisahan tampilan dan logika paling rapi lewat XAML dan data binding |
| Disarankan memakai basis data atau layanan web pihak ketiga | PostgreSQL di Azure sebagai basis data, Azure Custom Vision sebagai layanan klasifikasi foto |
| Tanggung jawab: software architect, backend, front end | Pembagiannya ada di bagian 1 |
| Produk terdokumentasi di GitHub, ada informasi akses demo dan dokumentasi penggunaan | Repositori ini, ditambah panduan demo dan panduan penggunaan yang menyusul sebelum demo |
| Desain berorientasi objek dinilai tersendiri | Entitas dan aturan bisnis dikumpulkan di `Trashury.Core` agar dipakai bersama oleh desktop dan API |
