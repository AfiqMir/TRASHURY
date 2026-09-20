import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import bcrypt from 'bcryptjs';
import type { Express } from 'express';
import request from 'supertest';
import { buatAplikasi } from '../src/aplikasi.js';
import type { Basis } from '../src/db/koneksi.js';

export const JWT_SECRET = 'rahasia-pengujian-yang-cukup-panjang';

const berkasSkema = fileURLToPath(
  new URL('../../docs/design/schema-azure.sql', import.meta.url),
);

function basisPglite(pg: PGlite): Basis {
  const bungkus = (pelaksana: { query: PGlite['query'] }): Basis => ({
    async kueri(teks, params) {
      const hasil = await pelaksana.query(teks, params as unknown[]);
      return { rows: hasil.rows as never[] };
    },
    async dalamTransaksi(jalankan) {
      return pg.transaction(async (tx) => jalankan(bungkus(tx as never))) as never;
    },
    async tutup() {
      await pg.close();
    },
  });
  return bungkus(pg);
}

export interface Lingkungan {
  app: Express;
  basis: Basis;
  tokenOperator: string;
  tokenPengurus: string;
  idKategori: string;
}

export async function siapkanLingkungan(): Promise<Lingkungan> {
  const pg = new PGlite();
  const skema = readFileSync(berkasSkema, 'utf8').replace(
    /CREATE EXTENSION IF NOT EXISTS pgcrypto;/,
    '',
  );
  await pg.exec(skema);

  const basis = basisPglite(pg);
  const sandi = bcrypt.hashSync('rahasia', 4);
  await basis.kueri(
    `INSERT INTO operator (nama, username, password_hash, peran) VALUES
       ('Operator Meja', 'operator', $1, 'operator'),
       ('Ketua Pengurus', 'pengurus', $1, 'pengurus')`,
    [sandi],
  );

  const app = buatAplikasi({ basis, jwtSecret: JWT_SECRET, jwtTtlJam: 1 });

  const masuk = async (username: string): Promise<string> => {
    const balasan = await request(app)
      .post('/api/v1/auth/login')
      .send({ username, password: 'rahasia' });
    return balasan.body.token as string;
  };

  const kategori = await basis.kueri<{ id_kategori: string }>(
    `INSERT INTO kategori_sampah (nama_kategori, harga_per_kg, faktor_co2e_per_kg)
       VALUES ('Plastik PET', 3000, 1.5) RETURNING id_kategori`,
  );

  return {
    app,
    basis,
    tokenOperator: await masuk('operator'),
    tokenPengurus: await masuk('pengurus'),
    idKategori: kategori.rows[0]!.id_kategori,
  };
}
