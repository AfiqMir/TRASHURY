# TRASHURY

**Kelompok Keren**

**Ketua Kelompok:** Wangsit Nursyahada, 24/545092/TK/60594
**Anggota 1:** Muhammad Afiq Mirza Choiruzan, 24/537942/TK/59646
**Anggota 2:** Bintang Daneswara, 24/541599/TK/60084

**Project Senior Project TI**

**Instansi:** Departemen Teknologi Elektro dan Teknologi Informasi, Fakultas Teknik, Universitas Gadjah Mada

---

## Nama Produk

**TRASHURY.** Aplikasi kasir dan manajemen database lokal berbasis desktop untuk memodernisasi operasional bank sampah kalurahan tanpa ketergantungan internet penuh.

## Jenis Produk

Aplikasi desktop Windows yang dibangun dengan bahasa C# dan Windows Presentation Foundation (WPF), sesuai ketentuan modul praktikum. Kategori aplikasi: Climate Action.

Aplikasi menyimpan data pada basis data lokal sehingga dapat digunakan tanpa ketergantungan internet penuh, sekaligus mendukung sinkronisasi data ke server saat koneksi tersedia.

## Latar Belakang & Permasalahan

Bank sampah tingkat RW/kalurahan umumnya masih mencatat transaksi setoran secara manual menggunakan buku atau spreadsheet, yang rentan terhadap kesalahan pencatatan dan kehilangan data. Platform digital nasional yang sudah ada, seperti Smash.id, dirancang untuk skala nasional dengan ekosistem yang kompleks sehingga kurang praktis diadopsi langsung oleh unit bank sampah kecil yang membutuhkan solusi ringan, cepat dipasang, dan tetap dapat digunakan pada kondisi jaringan yang tidak selalu stabil. Selain itu, belum ditemukan platform yang secara otomatis mengonversi data setoran sampah menjadi estimasi dampak lingkungan (emisi CO2e) yang siap digunakan untuk pelaporan ke Dinas Lingkungan Hidup (DLH).

**Rumusan Permasalahan:**
Bagaimana merancang sistem pencatatan bank sampah digital yang (1) tetap dapat digunakan dalam kondisi konektivitas terbatas, (2) mempermudah proses klasifikasi jenis sampah oleh petugas, dan (3) menghasilkan estimasi dampak lingkungan secara otomatis yang dapat dilaporkan ke pihak berwenang, tanpa kompleksitas adopsi seperti platform nasional yang sudah ada?

## Ide Solusi

TRASHURY mengintegrasikan tiga teknologi pada titik implementasi yang saling melengkapi:

- **Jaringan Komputer.** Transaksi setoran tetap dapat dicatat saat koneksi internet terbatas melalui penyimpanan lokal pada aplikasi desktop, yang kemudian tersinkronisasi otomatis ke server saat koneksi tersedia (*queue-and-replay*).
- **Kecerdasan Buatan.** Layanan Azure Custom Vision membantu petugas mengklasifikasikan jenis sampah dari foto, sekaligus menghitung estimasi dampak lingkungan (CO2e) dari data setoran menggunakan acuan faktor emisi standar (IPCC Guidelines).
- **Komputasi Awan.** Basis data PostgreSQL, API ASP.NET Core, dan dasbor dihosting di Azure sebagai sumber data tunggal dari seluruh transaksi, sekaligus menjadi media *showcase* produk.

Pengembangan diprioritaskan pada fitur inti (MVP): pencatatan transaksi *offline-capable*, klasifikasi AI, dan dasbor CO2e. Fitur seperti prediksi tren volume setoran, laporan otomatis ke DLH, dan dasbor multi-lokasi menjadi pengembangan lanjutan jika waktu memungkinkan.

## Analisis Kompetitor

| Nama | Jenis Kompetitor | Kelebihan | Kekurangan |
|---|---|---|---|
| **Smash.id** (BankSampah.id, mySmash, e-Smash) | Direct Competitor | Skala nasional (18.000+ bank sampah), fitur AI segregasi, Smart Drop-Box, e-wallet Smash-Pay | Kompleks untuk bank sampah RW kecil, tidak ada pelaporan CO2e otomatis, asumsi konektivitas stabil |
| **e-Bank Sampah DKI Jakarta** | Direct Competitor | Dukungan resmi pemerintah daerah, insentif kebijakan publik | Cakupan terbatas DKI Jakarta, tidak ada fitur offline/AI/CO2e |
| **Pencatatan Manual (Buku/Excel)** | Indirect Competitor | Gratis, tanpa kurva belajar | Rawan human error, tidak ada rekap otomatis, tidak ada estimasi dampak lingkungan |

**Diferensiasi TRASHURY:** kombinasi *offline-first* + klasifikasi AI + pelaporan CO2e otomatis dalam satu produk yang dirancang khusus untuk skala bank sampah RW/kalurahan, dan belum digarap bersamaan oleh kompetitor manapun.

---

## Metodologi SDLC

### Metodologi yang Digunakan

**Agile**

### Alasan Pemilihan Metodologi

Kami memilih metodologi Agile karena proyek TRASHURY dikembangkan dalam kurun waktu terbatas (1 semester) dengan kemungkinan requirement yang masih bisa berubah seiring proses riset dan feedback dari asisten/dosen selama pengembangan berlangsung. Agile memungkinkan pengembangan bertahap melalui beberapa iterasi, dengan produk fungsional yang dapat diuji dan dievaluasi sejak tahap awal, bukan menunggu seluruh fitur selesai di akhir seperti model Waterfall.

Hal ini penting karena kelompok kami membagi fitur menjadi fitur inti (MVP) dan fitur pengembangan lanjutan (*stretch goal*), sehingga pendekatan iteratif Agile lebih sesuai untuk mengakomodasi prioritas fitur yang dapat disesuaikan tergantung sisa waktu dan sumber daya tim yang terbatas (3 anggota).

## Perancangan Tahap 1-3 SDLC

### A. Tujuan Produk

Mengembangkan aplikasi TRASHURY sebagai solusi pencatatan dan manajemen operasional bank sampah tingkat RW/kalurahan yang ringan, mudah diadopsi, tetap dapat digunakan pada kondisi konektivitas internet terbatas, serta mampu membantu klasifikasi jenis sampah dan menghasilkan estimasi dampak lingkungan (CO2e) secara otomatis untuk mendukung kebutuhan pelaporan bank sampah kepada Dinas Lingkungan Hidup.

### B. Pengguna Potensial dan Kebutuhannya

#### Petugas/Pengurus Bank Sampah (Operator)

Membutuhkan sistem untuk mencatat transaksi setoran dengan cepat dan akurat, tetap dapat bekerja saat koneksi internet tidak stabil, serta membantu mengklasifikasikan jenis sampah tanpa perlu menghafal seluruh kategori, terutama bagi petugas yang baru bertugas.

#### Nasabah Bank Sampah (Warga)

Membutuhkan kemudahan untuk mengetahui riwayat setoran dan saldo tabungan miliknya, yang disampaikan melalui operator di meja pencatatan karena nasabah tidak mengakses sistem secara langsung.

#### Pengurus Pusat/Ketua Kelompok

Membutuhkan sistem untuk memantau data transaksi dan estimasi dampak lingkungan (CO2e) secara terpusat, guna mendukung keperluan pelaporan berkala kepada Dinas Lingkungan Hidup.

#### Dinas Lingkungan Hidup (DLH) Kabupaten

Membutuhkan akses terhadap laporan bulanan berisi data transaksi dan estimasi dampak lingkungan (CO2e) dari bank sampah, untuk keperluan pemantauan dan evaluasi program pengelolaan sampah di wilayahnya.

### C. Use Case Sistem

| Aktor | Use case |
|---|---|
| Operator Bank Sampah | Kelola data nasabah; kelola kategori dan harga; catat setoran sampah; klasifikasi sampah dari foto; proses penarikan saldo; lihat buku tabungan; ekspor laporan bulanan |
| Pengurus/Ketua | Lihat buku tabungan; lihat dashboard CO2e; ekspor laporan bulanan |
| DLH Kabupaten | Menerima dan menggunakan laporan bulanan |
| Nasabah | Menerima informasi riwayat setoran dan saldo melalui operator |

### D. Functional Requirements

| FR | Deskripsi |
|---|---|
| FR 1 | Sistem dapat mengelola data nasabah (tambah, ubah, hapus, dan cari). |
| FR 2 | Sistem dapat mengelola data kategori sampah beserta harga per kilogramnya. |
| FR 3 | Sistem dapat mencatat transaksi setoran sampah milik nasabah. |
| FR 4 | Sistem dapat melakukan klasifikasi jenis sampah secara otomatis berbasis foto/gambar sebagai bagian dari proses pencatatan setoran. |
| FR 5 | Sistem dapat memproses transaksi penarikan saldo tabungan nasabah. |
| FR 6 | Sistem dapat menampilkan buku tabungan nasabah, termasuk riwayat setoran dan penarikan. |
| FR 7 | Sistem dapat menampilkan *dashboard* estimasi pengurangan emisi karbon (CO2e). |
| FR 8 | Sistem dapat mengekspor rekapitulasi laporan bulanan untuk diserahkan kepada DLH Kabupaten. |

### E. Entity Relationship Diagram

Struktur entitas utama TRASHURY terdiri atas:

| Entitas | Atribut utama |
|---|---|
| **Nasabah** | `id_nasabah (PK)`, `nama`, `nomor_hp`, `alamat`, `total_saldo` |
| **Operator** | `id_operator (PK)`, `nama`, `username`, `password` |
| **Transaksi** | `id_transaksi (PK)`, `id_nasabah (FK)`, `id_operator (FK)`, `tanggal`, `jenis_transaksi`, `total_nominal`, `total_co2e` |
| **Detail Transaksi** | `id_detail (PK)`, `id_transaksi (FK)`, `berat_kg`, `url_foto_sampah`, `subtotal_harga`, `subtotal_co2e` |
| **Kategori Sampah** | `id_kategori (PK)`, `nama_kategori`, `harga_per_kg`, `faktor_co2e_per_kg` |
| **Penarikan Saldo** | `id_penarikan (PK)`, `id_nasabah (FK)`, `tanggal`, `jumlah_tarik`, `saldo_sisa` |

Relasi antartabel:

- Satu **Nasabah** dapat memiliki banyak **Transaksi** dan banyak **Penarikan Saldo**.
- Satu **Operator** dapat mencatat banyak **Transaksi**.
- Satu **Transaksi** memiliki banyak **Detail Transaksi**.
- Satu **Kategori Sampah** dapat digunakan pada banyak **Detail Transaksi**.

Diagram ERD versi lengkap tersedia sebagai berkas yang dapat disunting di [`docs/design/erd-trashury.drawio`](design/erd-trashury.drawio) (buka melalui [app.diagrams.net](https://app.diagrams.net)), sedangkan skema tabelnya dituangkan dalam DDL SQLite di [`docs/design/schema-lokal.sql`](design/schema-lokal.sql).

### F. Gantt Chart Pengerjaan Proyek dalam Satu Semester

Keterangan: `X` menunjukkan pertemuan ketika kegiatan dikerjakan.

| Kegiatan | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Brainstorming & Requirement Analysis | X | X |  |  |  |  |  |  |  |  |  |  |
| Perancangan Sistem (Use Case, ERD, Wireframe) |  | X | X |  |  |  |  |  |  |  |  |  |
| Setup Repositori Git & Project Board |  |  | X |  |  |  |  |  |  |  |  |  |
| Pengembangan MVP: Modul Transaksi & Offline Storage |  |  |  | X | X | X |  |  |  |  |  |  |
| Pengembangan Modul Kalkulasi CO2e & Laporan |  |  |  |  |  | X | X |  |  |  |  |  |
| Evaluasi Tengah Semester (ATS) & Testing Awal |  |  |  |  |  |  |  | X |  |  |  |  |
| Pengembangan Stretch Goals & Integrasi Fitur |  |  |  |  |  |  |  |  | X | X |  |  |
| System Integration Testing (SIT) & Fix Bug |  |  |  |  |  |  |  |  |  |  | X |  |
| Penyusunan Dokumentasi & Final Review |  |  |  |  |  |  |  |  |  |  |  | X |

---

## Dokumen Pendukung

- [Dokumentasi Proyek](dokumentasi-proyek.md): arsitektur sistem, struktur repositori, keputusan desain, alur kerja tim, dan status pekerjaan.
- [Panduan Demo](panduan-demo.md): naskah peragaan produk beserta persiapan dan rencana cadangan.
- [ERD TRASHURY (.drawio)](design/erd-trashury.drawio): diagram relasi antarentitas.
- [Skema Database Lokal (.sql)](design/schema-lokal.sql): DDL SQLite untuk basis data di mesin operator.
- [Skema Database Server (.sql)](design/schema-azure.sql): DDL PostgreSQL untuk basis data terpusat di Azure.
