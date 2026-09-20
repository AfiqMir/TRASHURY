# Smoke test end-to-end

Menjalankan API sungguhan lewat HTTP terhadap PostgreSQL sungguhan, bukan
aplikasi di dalam proses uji. Dipakai untuk menemukan celah yang tidak terlihat
oleh `npm test`, terutama perilaku di bawah koneksi serentak.

## Menyiapkan

```bash
createdb trashury
psql -d trashury -f docs/design/schema-azure.sql
npm run build
DATABASE_URL=postgres://localhost/trashury JWT_SECRET=rahasia-yang-panjang PORT=3100 node backend/dist/index.js
```

Tambahkan satu operator dan satu pengurus dengan kata sandi yang sama:

```bash
node -e "console.log(require('bcryptjs').hashSync(process.env.SMOKE_PASSWORD ?? 'rahasia123', 8))"
```

Masukkan hash tersebut ke tabel `operator` dengan username `operator` berperan
`operator`, dan `pengurus` berperan `pengurus`.

## Menjalankan

```bash
bash scripts/smoke/alur.sh
node scripts/smoke/serentak.mjs
node scripts/smoke/balapan.mjs
```

Alamat dan kata sandi dapat diubah lewat `SMOKE_API` dan `SMOKE_PASSWORD`.

## Isi pengujian

`alur.sh` menjalankan 29 pemeriksaan sepanjang alur operator, mulai dari masuk,
mengelola master data, mencatat setoran, hingga penarikan dan buku tabungan.

`serentak.mjs` mengirim tiga penarikan sekaligus terhadap saldo yang hanya cukup
untuk satu, lalu menuntut tepat satu berhasil dan saldo tidak pernah negatif.

`balapan.mjs` menguji empat keadaan berebut: setoran identik serentak, beberapa
setoran berbeda serentak, penarikan identik serentak, serta penarikan dan
setoran nasabah berbeda yang berjalan bersamaan.

Ketiganya membutuhkan PostgreSQL sungguhan. PGlite yang dipakai `npm test` hanya
melayani satu koneksi, sehingga tidak dapat membuktikan perilaku penguncian.
