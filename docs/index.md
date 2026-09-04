# TRASHURY

**Kelompok Keren**

**Ketua Kelompok:** Wangsit Nursyahada – 24/545092/TK/60594
**Anggota 1:** Muhammad Afiq Mirza Choiruzan – 24/537942/TK/59646
**Anggota 2:** Bintang Daneswara – 24/541599/TK/60084

**Project Senior Project TI**

**Instansi:** Departemen Teknologi Elektro dan Teknologi Informasi, Fakultas Teknik, Universitas Gadjah Mada

---

## Nama Produk

**TRASHURY** — Aplikasi kasir dan manajemen database lokal berbasis desktop untuk memodernisasi operasional bank sampah kalurahan tanpa ketergantungan internet penuh.

## Jenis Produk

Aplikasi Web (Progressive Web App/PWA) — dapat diinstal seperti aplikasi desktop tanpa proses distribusi lewat app store, sekaligus mendukung kemampuan bekerja pada kondisi konektivitas internet terbatas.

## Latar Belakang & Permasalahan

Bank sampah tingkat RW/kalurahan umumnya masih mencatat transaksi setoran secara manual menggunakan buku atau spreadsheet, yang rentan terhadap kesalahan pencatatan dan kehilangan data. Platform digital nasional yang sudah ada, seperti Smash.id, dirancang untuk skala nasional dengan ekosistem yang kompleks sehingga kurang praktis diadopsi langsung oleh unit bank sampah kecil yang membutuhkan solusi ringan, cepat dipasang, dan tetap dapat digunakan pada kondisi jaringan yang tidak selalu stabil. Selain itu, belum ditemukan platform yang secara otomatis mengonversi data setoran sampah menjadi estimasi dampak lingkungan (emisi CO2e) yang siap digunakan untuk pelaporan ke Dinas Lingkungan Hidup (DLH).

**Rumusan Permasalahan:**
Bagaimana merancang sistem pencatatan bank sampah digital yang (1) tetap dapat digunakan dalam kondisi konektivitas terbatas, (2) mempermudah proses klasifikasi jenis sampah oleh petugas, dan (3) menghasilkan estimasi dampak lingkungan secara otomatis yang dapat dilaporkan ke pihak berwenang, tanpa kompleksitas adopsi seperti platform nasional yang sudah ada?

## Ide Solusi

TRASHURY mengintegrasikan tiga teknologi pada titik implementasi yang saling melengkapi:

- **Jaringan Komputer** — Transaksi setoran tetap dapat dicatat saat koneksi internet terbatas melalui penyimpanan lokal (IndexedDB) di sisi klien, yang kemudian tersinkronisasi otomatis ke server saat koneksi tersedia (*queue-and-replay*).
- **Kecerdasan Buatan** — Model *computer vision* berbasis *transfer learning* membantu petugas mengklasifikasikan jenis sampah dari foto, sekaligus menghitung estimasi dampak lingkungan (CO2e) dari data setoran menggunakan acuan faktor emisi standar (IPCC Guidelines).
- **Komputasi Awan** — Basis data, API backend, dan dasbor dihosting di Azure sebagai sumber data tunggal dari seluruh transaksi, sekaligus menjadi media *showcase* produk.

Pengembangan diprioritaskan pada fitur inti (MVP): pencatatan transaksi *offline-capable*, klasifikasi AI, dan dasbor CO2e. Fitur seperti prediksi tren volume setoran, laporan otomatis ke DLH, dan dasbor multi-lokasi menjadi pengembangan lanjutan jika waktu memungkinkan.

## Analisis Kompetitor

| Nama | Jenis Kompetitor | Kelebihan | Kekurangan |
|---|---|---|---|
| **Smash.id** (BankSampah.id, mySmash, e-Smash) | Direct Competitor | Skala nasional (18.000+ bank sampah), fitur AI segregasi, Smart Drop-Box, e-wallet Smash-Pay | Kompleks untuk bank sampah RW kecil, tidak ada pelaporan CO2e otomatis, asumsi konektivitas stabil |
| **e-Bank Sampah DKI Jakarta** | Direct Competitor | Dukungan resmi pemerintah daerah, insentif kebijakan publik | Cakupan terbatas DKI Jakarta, tidak ada fitur offline/AI/CO2e |
| **Pencatatan Manual (Buku/Excel)** | Indirect Competitor | Gratis, tanpa kurva belajar | Rawan human error, tidak ada rekap otomatis, tidak ada estimasi dampak lingkungan |

**Diferensiasi TRASHURY:** kombinasi *offline-first* + klasifikasi AI + pelaporan CO2e otomatis dalam satu produk yang dirancang khusus untuk skala bank sampah RW/kalurahan — belum digarap bersamaan oleh kompetitor manapun.

