import pg from 'pg';

export interface HasilKueri<T = Record<string, unknown>> {
  rows: T[];
}

export interface Basis {
  kueri<T = Record<string, unknown>>(teks: string, params?: unknown[]): Promise<HasilKueri<T>>;
  dalamTransaksi<T>(jalankan: (basis: Basis) => Promise<T>): Promise<T>;
  tutup(): Promise<void>;
}

export function basisPostgres(databaseUrl: string): Basis {
  const kolam = new pg.Pool({ connectionString: databaseUrl });

  const bungkus = (pelaksana: pg.Pool | pg.PoolClient): Basis => ({
    async kueri(teks, params) {
      const hasil = await pelaksana.query(teks, params as unknown[]);
      return { rows: hasil.rows };
    },
    async dalamTransaksi(jalankan) {
      const klien = await kolam.connect();
      try {
        await klien.query('BEGIN');
        const hasil = await jalankan(bungkus(klien));
        await klien.query('COMMIT');
        return hasil;
      } catch (kesalahan) {
        await klien.query('ROLLBACK');
        throw kesalahan;
      } finally {
        klien.release();
      }
    },
    async tutup() {
      await kolam.end();
    },
  });

  return bungkus(kolam);
}
