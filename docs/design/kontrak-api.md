---
title: Kontrak API TRASHURY
---

# Kontrak API TRASHURY

Spesifikasi endpoint untuk issue #14 (master data nasabah dan kategori sampah)
dan #15 (transaksi setoran, penarikan, dan saldo). Dokumen ini mengikat kedua
sisi: backend wajib memenuhinya, frontend boleh merancang layar berbekal
dokumen ini tanpa menunggu backend selesai.

Kontrak ini tidak bergantung pada framework. Bentuk path, body, kode status,
dan aturan validasi berlaku sama baik API ditulis dengan FastAPI, Express,
maupun ASP.NET Core.

Acuan struktur data ada di [`schema-azure.sql`](schema-azure.sql) dan
[`erd-trashury.drawio`](erd-trashury.drawio).

## 1. Ketentuan Umum

| Hal | Ketentuan |
|---|---|
| Base path | `/api/v1` |
| Format | JSON, `Content-Type: application/json; charset=utf-8` |
| Penamaan field | `snake_case`, sama persis dengan nama kolom di basis data |
| Identifier | UUID versi 4 dalam bentuk string |
| Waktu | ISO-8601 UTC dengan akhiran `Z`, contoh `2026-09-21T08:30:00Z` |
| Uang | Bilangan bulat rupiah, tanpa desimal dan tanpa pemisah ribuan |
| Berat | Bilangan desimal kilogram, dua angka di belakang koma |
| CO2e | Bilangan desimal kilogram CO2e, empat angka di belakang koma |

Uang dikirim sebagai bilangan bulat supaya tidak ada pembulatan ganda antara
klien dan server. Nilai `9000` berarti Rp9.000.

## 2. Autentikasi

Seluruh endpoint kecuali `POST /auth/login` mewajibkan header
`Authorization: Bearer <token>`.

### POST /auth/login

```json
{ "username": "wangsit", "password": "rahasia" }
```

Balasan `200`:

```json
{
  "token": "<jwt>",
  "expires_at": "2026-09-21T20:30:00Z",
  "operator": {
    "id_operator": "3f1c...",
    "nama": "Wangsit Nursyahada",
    "peran": "operator"
  }
}
```

Username atau kata sandi salah dibalas `401` dengan kode `KREDENSIAL_SALAH`.
Pesan galat tidak boleh membedakan antara username tidak ditemukan dan kata
sandi salah, supaya daftar operator tidak dapat ditebak dari luar.

Peran `pengurus` boleh mengakses seluruh endpoint. Peran `operator` tidak boleh
mengakses penghapusan master data, yaitu `DELETE /nasabah/{id}`.

## 3. Bentuk Balasan

Daftar selalu dibungkus objek beserta metadata halaman, tidak pernah berupa
array telanjang, supaya penambahan metadata di kemudian hari tidak merusak
klien yang sudah jalan.

```json
{
  "data": [ ... ],
  "meta": { "page": 1, "per_page": 25, "total": 137 }
}
```

Parameter kueri `page` dimulai dari 1, `per_page` bernilai bawaan 25 dan
maksimum 100.

Objek tunggal dibalas apa adanya tanpa pembungkus `data`.

Galat selalu berbentuk sama:

```json
{
  "error": {
    "code": "SALDO_TIDAK_CUKUP",
    "message": "Saldo nasabah Rp5.000 tidak mencukupi penarikan Rp7.000.",
    "field": "jumlah_tarik"
  }
}
```

`field` hanya ada bila galat dapat dikaitkan dengan satu isian tertentu.

| Kode status | Dipakai untuk |
|---|---|
| `200` | Permintaan berhasil, termasuk pengiriman ulang data yang sudah ada |
| `201` | Sumber daya baru berhasil dibuat |
| `400` | Bentuk permintaan tidak sah, misalnya JSON rusak atau UUID tidak valid |
| `401` | Token tidak ada, kedaluwarsa, atau kredensial salah |
| `403` | Peran tidak berwenang |
| `404` | Sumber daya tidak ditemukan |
| `409` | Bentrok keadaan, misalnya nasabah yang sudah punya transaksi hendak dihapus |
| `422` | Bentuk sah tetapi melanggar aturan bisnis, misalnya penarikan melebihi saldo |

## 4. Master Data Nasabah (#14, FR 1)

| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/nasabah` | Daftar nasabah, mendukung pencarian |
| `POST` | `/nasabah` | Tambah nasabah |
| `GET` | `/nasabah/{id_nasabah}` | Detail satu nasabah |
| `PATCH` | `/nasabah/{id_nasabah}` | Ubah sebagian data |
| `DELETE` | `/nasabah/{id_nasabah}` | Hapus nasabah, hanya peran pengurus |

`GET /nasabah` menerima `q` untuk pencarian pada nama dan nomor HP, tidak
membedakan huruf besar kecil dan cocok sebagian.

`POST /nasabah` menerima:

```json
{
  "id_nasabah": "c0a8...",
  "nama": "Sri Wahyuni",
  "nomor_hp": "081234567890",
  "alamat": "RT 03 RW 05 Caturtunggal"
}
```

`id_nasabah` boleh dikirim klien. Bila dikirim, server memakainya apa adanya
sehingga nasabah yang dibuat saat operator sedang luring tetap memiliki
identitas yang sama setelah tersinkronisasi. Bila tidak dikirim, server yang
membuatkan.

Hanya `nama` yang wajib. `total_saldo` tidak boleh dikirim klien dan selalu
dimulai dari `0`; saldo hanya berubah lewat transaksi.

`DELETE /nasabah/{id}` dibalas `409` dengan kode `NASABAH_MASIH_TERPAKAI` bila
nasabah sudah memiliki transaksi atau penarikan. Riwayat transaksi tidak boleh
hilang hanya karena datanya dirapikan.

## 5. Master Data Kategori Sampah (#14, FR 2)

| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/kategori-sampah` | Daftar kategori |
| `POST` | `/kategori-sampah` | Tambah kategori |
| `PATCH` | `/kategori-sampah/{id_kategori}` | Ubah kategori |

```json
{
  "id_kategori": "7d2e...",
  "nama_kategori": "Plastik PET",
  "harga_per_kg": 3000,
  "faktor_co2e_per_kg": 1.5,
  "aktif": true
}
```

`GET /kategori-sampah` secara bawaan hanya mengembalikan kategori aktif.
Tambahkan `?aktif=semua` untuk menyertakan yang sudah tidak dipakai.

Kategori tidak memiliki endpoint penghapusan. Kategori yang tidak dipakai lagi
diubah menjadi `"aktif": false` lewat `PATCH`. Menghapusnya akan memutus
riwayat transaksi lama yang menunjuk kategori tersebut.

Perubahan `harga_per_kg` dan `faktor_co2e_per_kg` hanya berlaku untuk transaksi
sesudahnya. Transaksi lama menyimpan hasil perhitungannya sendiri di
`detail_transaksi`, sehingga tidak ikut berubah saat harga disesuaikan.

## 6. Transaksi Setoran (#15, FR 3)

### POST /transaksi

Satu permintaan memuat satu transaksi beserta seluruh rinciannya, dan disimpan
dalam satu transaksi basis data. Tidak boleh ada transaksi yang tersimpan tanpa
detailnya.

```json
{
  "id_transaksi": "9b1d...",
  "id_nasabah": "c0a8...",
  "tanggal": "2026-09-21T08:30:00Z",
  "detail": [
    {
      "id_detail": "4e77...",
      "id_kategori": "7d2e...",
      "berat_kg": 3.0,
      "url_foto_sampah": null,
      "sumber_klasifikasi": "ai"
    }
  ]
}
```

`id_operator` tidak dikirim klien, melainkan diambil dari token.

Klien tidak mengirim `subtotal_harga`, `subtotal_co2e`, `total_nominal`, dan
`total_co2e`. Seluruhnya dihitung server memakai harga dan faktor yang berlaku
saat itu:

```
subtotal_harga = bulat(berat_kg * harga_per_kg)
subtotal_co2e  = berat_kg * faktor_co2e_per_kg
total_nominal  = jumlah seluruh subtotal_harga
total_co2e     = jumlah seluruh subtotal_co2e
```

Pembulatan memakai pembulatan setengah ke atas. Server yang berwenang atas
angka uang supaya tidak ada dua sumber kebenaran; klien boleh menampilkan
perkiraan, tetapi yang tersimpan adalah hitungan server.

Balasan `201` berisi transaksi utuh beserta detail dan seluruh hasil hitungan.

Aturan validasi:

| Aturan | Kode galat | Status |
|---|---|---|
| `detail` tidak boleh kosong | `DETAIL_KOSONG` | `422` |
| `berat_kg` harus lebih dari 0 | `BERAT_TIDAK_SAH` | `422` |
| `id_kategori` harus ada dan aktif | `KATEGORI_TIDAK_AKTIF` | `422` |
| `id_nasabah` harus ada | `NASABAH_TIDAK_DITEMUKAN` | `404` |
| `tanggal` tidak boleh di masa depan lebih dari 24 jam | `TANGGAL_TIDAK_SAH` | `422` |

Toleransi 24 jam diberikan karena jam mesin operator bisa meleset, dan
transaksi luring yang sah tidak boleh ditolak hanya karena itu.

### Pengiriman ulang yang aman

`id_transaksi` dibuat klien. Bila transaksi dengan `id_transaksi` yang sama
dikirim lagi, server tidak membuat data baru dan tidak mengubah data lama.
Balasannya `200` berisi transaksi yang sudah tersimpan, bukan `201`.

Inilah yang membuat sinkronisasi #16 aman ketika koneksi terputus setelah
server menyimpan data tetapi sebelum balasan sampai ke klien. Klien cukup
mengirim ulang tanpa risiko saldo nasabah bertambah dua kali.

### GET /transaksi

Parameter kueri: `id_nasabah`, `dari` dan `sampai` (tanggal ISO-8601), serta
`page` dan `per_page`. Diurutkan dari yang terbaru.

### GET /transaksi/{id_transaksi}

Mengembalikan satu transaksi beserta detailnya.

Transaksi tidak dapat diubah maupun dihapus. Koreksi dilakukan dengan mencatat
transaksi pembetulan, bukan dengan menyunting riwayat.

## 7. Penarikan Saldo (#15, FR 5)

### POST /penarikan

```json
{
  "id_penarikan": "2ab4...",
  "id_nasabah": "c0a8...",
  "tanggal": "2026-09-21T09:00:00Z",
  "jumlah_tarik": 5000
}
```

`saldo_sisa` dihitung server, tidak dikirim klien.

| Aturan | Kode galat | Status |
|---|---|---|
| `jumlah_tarik` harus lebih dari 0 | `JUMLAH_TIDAK_SAH` | `422` |
| `jumlah_tarik` tidak boleh melebihi saldo | `SALDO_TIDAK_CUKUP` | `422` |

Pemeriksaan saldo dan penyimpanan penarikan dilakukan dalam satu transaksi
basis data dengan penguncian baris nasabah. Tanpa itu, dua penarikan yang
dikirim bersamaan dapat lolos pemeriksaan bersama-sama dan membuat saldo
menjadi negatif.

Balasan galat `SALDO_TIDAK_CUKUP` menyertakan saldo saat itu:

```json
{
  "error": {
    "code": "SALDO_TIDAK_CUKUP",
    "message": "Saldo nasabah Rp5.000 tidak mencukupi penarikan Rp7.000.",
    "field": "jumlah_tarik",
    "saldo_tersedia": 5000
  }
}
```

Penarikan juga bersifat aman diulang berdasarkan `id_penarikan`, dengan
perilaku yang sama seperti transaksi setoran.

## 8. Saldo dan Buku Tabungan (#15, FR 6)

### GET /nasabah/{id_nasabah}/saldo

```json
{
  "id_nasabah": "c0a8...",
  "nama": "Sri Wahyuni",
  "total_saldo": 5000,
  "total_co2e": 12.75,
  "diperbarui_pada": "2026-09-21T09:00:00Z"
}
```

### GET /nasabah/{id_nasabah}/buku-tabungan

Menggabungkan setoran dan penarikan dalam satu urutan waktu, bersumber dari
view `v_buku_tabungan`. Mendukung `dari`, `sampai`, `page`, dan `per_page`.

```json
{
  "data": [
    {
      "tanggal": "2026-09-21T09:00:00Z",
      "jenis": "penarikan",
      "nominal": -5000,
      "co2e": 0,
      "id_acuan": "2ab4..."
    },
    {
      "tanggal": "2026-09-21T08:30:00Z",
      "jenis": "setoran",
      "nominal": 9000,
      "co2e": 4.5,
      "id_acuan": "9b1d..."
    }
  ],
  "meta": { "page": 1, "per_page": 25, "total": 2 }
}
```

Penarikan bernilai negatif supaya klien dapat menjumlahkan kolom `nominal`
begitu saja tanpa memeriksa jenisnya.

## 9. Catatan untuk Pelaksana

Yang perlu disepakati sebelum endpoint dianggap selesai:

1. Seluruh perhitungan uang dan CO2e dilakukan di server.
2. Setiap endpoint pembuatan data bersifat aman diulang berdasarkan
   identifier kiriman klien.
3. Penarikan memakai penguncian baris, bukan sekadar pemeriksaan sebelum
   penyimpanan.
4. Galat memakai kode yang sudah didaftarkan di dokumen ini, supaya frontend
   dapat menampilkan pesan yang tepat tanpa mengurai kalimat.

Endpoint sinkronisasi massal untuk #16 belum termasuk dalam dokumen ini dan
akan disusun tersendiri. Sifat aman diulang pada endpoint di atas sudah
disiapkan untuk keperluan tersebut.

## 10. Pembuktian Perilaku Serentak

Penguncian baris pada penarikan sudah dibuktikan pada PostgreSQL sungguhan,
bukan hanya pada PGlite. Tiga penarikan dikirim bersamaan terhadap saldo yang
hanya cukup untuk satu, dan hasilnya tetap satu berhasil serta dua ditolak
dengan `SALDO_TIDAK_CUKUP`. Saldo tidak pernah menjadi negatif pada sepuluh
kali pengulangan.

Perlu dicatat bahwa `npm test` tidak dapat membuktikan hal ini. PGlite yang
dipakainya hanya melayani satu koneksi, sehingga permintaan yang dikirim
bersamaan pada kenyataannya dijalankan berurutan. Pembuktian perilaku serentak
adalah tugas `npm run smoke`, yang membutuhkan PostgreSQL sungguhan.

### Urutan kunci dan pemeriksaan

Baris nasabah dikunci lebih dahulu, baru sesudah itu diperiksa apakah transaksi
atau penarikan dengan identifier tersebut sudah tersimpan.

Urutan ini penting dan sempat salah. Ketika pemeriksaan dijalankan sebelum
penguncian, dua permintaan kembar yang tiba bersamaan sama-sama menyimpulkan
data belum ada, lalu yang kedua bertabrakan di kunci primer dan dibalas galat
server. Klien yang mengirim ulang karena koneksi buruk justru menerima galat,
padahal itulah keadaan yang paling sering terjadi pada pemakaian luring.

Dengan penguncian didahulukan, permintaan kedua menunggu sampai yang pertama
selesai, sehingga pemeriksaannya melihat data yang sudah tersimpan dan
membalas `200` sebagaimana mestinya.

Lapisan pertahanan terakhir tetap ada dan sudah diuji, yaitu batasan
`CHECK (total_saldo >= 0)` pada basis data, yang menolak penyimpanan walau
seluruh pemeriksaan di atasnya terlewat.
