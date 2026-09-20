---
title: Panduan Demo TRASHURY
---

# Panduan Demo TRASHURY

Status per 17 September 2026: aplikasi belum dapat dijalankan karena backend,
frontend, dan integrasi model AI masih dalam pengerjaan. Dokumen ini adalah
naskah demo yang disepakati di awal supaya setiap fitur dibangun dengan target
peragaan yang jelas. Bagian "Demo Saat Ini" berisi yang benar-benar bisa
diperagakan hari ini, sedangkan "Naskah Demo Akhir" adalah targetnya.

## Demo Saat Ini (tahap perancangan)

Durasi: ±5 menit. Semuanya sudah bisa dijalankan hari ini.

1. Halaman publik proyek. Buka <https://afiqmir.github.io/TRASHURY/>,
   tunjukkan profil produk, analisis kompetitor, functional requirement, dan
   Gantt chart satu semester.
2. Papan kerja. Buka GitHub Project kelompok, tunjukkan pembagian issue per
   anggota dan kolom In Progress.
3. CI berjalan. Buka tab Actions, tunjukkan workflow `CI TRASHURY` hijau pada
   commit terakhir.
4. ERD. Buka `docs/design/erd-trashury.drawio` di draw.io, telusuri enam
   entitas dan relasinya.
5. Skema database hidup. Jalankan di terminal:

   ```bash
   sqlite3 /tmp/demo-trashury.db < docs/design/schema-lokal.sql
   sqlite3 /tmp/demo-trashury.db ".tables"
   ```

   Lalu peragakan bahwa saldo nasabah dijaga otomatis oleh database:

   ```bash
   sqlite3 /tmp/demo-trashury.db <<'SQL'
   INSERT INTO nasabah  (id_nasabah, nama) VALUES ('n1', 'Bu Sri');
   INSERT INTO operator (id_operator, nama, username, password_hash)
        VALUES ('o1', 'Wangsit', 'wangsit', 'hash-contoh');
   INSERT INTO kategori_sampah
        VALUES ('k1', 'Plastik PET', 3000, 1.5, 1);
   INSERT INTO transaksi (id_transaksi, id_nasabah, id_operator, tanggal,
                          total_nominal, total_co2e)
        VALUES ('t1', 'n1', 'o1', '2026-09-17T08:00:00Z', 9000, 4.5);
   INSERT INTO detail_transaksi
        VALUES ('d1', 't1', 'k1', 3.0, NULL, 'ai', 9000, 4.5);
   SELECT nama, total_saldo FROM nasabah;      -- Bu Sri | 9000
   SELECT * FROM v_buku_tabungan;              -- baris setoran
   SELECT * FROM v_rekap_bulanan;              -- rekap per kategori
   SQL
   ```

   Poin yang ditekankan: saldo bertambah sendiri lewat *trigger*, dan rekap
   bulanan untuk DLH sudah tersedia sebagai view sejak tahap skema.

## Naskah Demo Akhir (target akhir semester)

Durasi: ±10 menit. Perbarui daftar ini setiap kali satu fitur selesai.

### Persiapan sebelum tampil

- [ ] Database lokal terisi data contoh: minimal 5 nasabah, 6 kategori sampah
      beserta harga dan faktor CO2e, serta riwayat transaksi 2 bulan terakhir
      supaya dashboard dan rekap tidak tampil kosong.
- [ ] Satu foto sampah disiapkan di layar utama untuk peragaan klasifikasi AI,
      ditambah satu foto cadangan yang sudah diuji dikenali dengan benar.
- [ ] Akun operator dan akun pengurus siap, kata sandinya dicatat.
- [ ] Mode pesawat / pemutus Wi-Fi siap dipakai untuk peragaan offline.
- [ ] Aplikasi sudah terpasang sebagai PWA dan dibuka satu kali sebelum demo
      agar service worker selesai memuat aset.
- [ ] Dashboard Azure sudah terbuka di tab terpisah.

### Alur peragaan

| No | Langkah | Yang ditunjukkan | FR |
|---|---|---|---|
| 1 | Masuk sebagai operator | Autentikasi operator | |
| 2 | Tambah satu nasabah baru | Kelola data nasabah | FR 1 |
| 3 | Buka master kategori sampah | Harga per kg dan faktor CO2e per kategori | FR 2 |
| 4 | Mulai transaksi setoran, foto sampah | Model AI mengusulkan kategori, operator mengoreksi bila perlu | FR 3, FR 4 |
| 5 | Masukkan berat, simpan transaksi | Total rupiah dan CO2e dihitung otomatis | FR 3 |
| 6 | Putuskan koneksi internet, catat satu transaksi lagi | Transaksi tetap tersimpan, indikator "menunggu sinkronisasi" muncul | FR 3 |
| 7 | Sambungkan kembali internet | Antrian terkirim sendiri, status berubah menjadi tersinkronisasi | |
| 8 | Buka dashboard Azure | Transaksi offline tadi sudah muncul di server | |
| 9 | Proses penarikan saldo nasabah | Saldo berkurang, tercatat di buku tabungan | FR 5 |
| 10 | Buka buku tabungan nasabah | Riwayat setoran dan penarikan berurutan | FR 6 |
| 11 | Buka dashboard CO2e | Estimasi pengurangan emisi per periode | FR 7 |
| 12 | Ekspor laporan bulanan | Berkas rekap siap diserahkan ke DLH | FR 8 |

Langkah 6 sampai 8 adalah inti pembeda produk ini; beri waktu paling lama di situ dan
sebutkan bahwa inilah bentuk nyata komponen Jaringan Komputer. Langkah 4
mewakili komponen Kecerdasan Buatan, langkah 8 mewakili Komputasi Awan.

### Rencana cadangan

| Risiko | Antisipasi |
|---|---|
| Model AI salah mengenali sampah | Segera koreksi manual di layar, lalu jelaskan bahwa koreksi ini memang dicatat (`sumber_klasifikasi`) sebagai bahan evaluasi akurasi |
| Internet lokasi demo tidak stabil | Justru manfaatkan: fitur utama produk ini memang jalan tanpa internet |
| Backend Azure lambat merespons | Tunjukkan data lokal dulu, jelaskan sinkronisasi bersifat asinkron dan tidak memblokir kasir |
| Aplikasi gagal dibuka | Sediakan rekaman layar demo lengkap sebagai cadangan |

### Pembagian peran saat tampil

| Bagian | Penanggung jawab |
|---|---|
| Pembuka, latar belakang, penutup | Wangsit (ketua) |
| Peragaan alur kasir dan buku tabungan | Bintang (frontend) |
| Penjelasan model AI dan perhitungan CO2e | Afiq (AI) |
| Peragaan offline ke online dan dashboard Azure | Wangsit (backend) |
