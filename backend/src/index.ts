import { buatAplikasi } from './aplikasi.js';
import { basisPostgres } from './db/koneksi.js';
import { bacaKonfigurasi } from './konfigurasi.js';

const konfigurasi = bacaKonfigurasi();
const basis = basisPostgres(konfigurasi.databaseUrl);
const app = buatAplikasi({
  basis,
  jwtSecret: konfigurasi.jwtSecret,
  jwtTtlJam: konfigurasi.jwtTtlJam,
});

const server = app.listen(konfigurasi.port, () => {
  console.log(`TRASHURY API berjalan di port ${konfigurasi.port}`);
});

for (const sinyal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sinyal, () => {
    server.close(async () => {
      await basis.tutup();
      process.exit(0);
    });
  });
}
