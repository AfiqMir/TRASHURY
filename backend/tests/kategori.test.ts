import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { siapkanLingkungan, type Lingkungan } from './bantuan.js';

let env: Lingkungan;

beforeAll(async () => {
  env = await siapkanLingkungan();
});

const sebagaiOperator = () => ({ Authorization: `Bearer ${env.tokenOperator}` });

describe('kategori sampah', () => {
  it('menambah kategori baru', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/kategori-sampah')
      .set(sebagaiOperator())
      .send({ nama_kategori: 'Kardus', harga_per_kg: 1800, faktor_co2e_per_kg: 0.9 });

    expect(balasan.status).toBe(201);
    expect(balasan.body.aktif).toBe(true);
    expect(balasan.body.harga_per_kg).toBe(1800);
  });

  it('menolak nama kategori kembar tanpa membedakan huruf besar kecil', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/kategori-sampah')
      .set(sebagaiOperator())
      .send({ nama_kategori: 'kardus', harga_per_kg: 2000, faktor_co2e_per_kg: 0.9 });

    expect(balasan.status).toBe(409);
    expect(balasan.body.error.code).toBe('KATEGORI_SUDAH_ADA');
  });

  it('menolak harga pecahan', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/kategori-sampah')
      .set(sebagaiOperator())
      .send({ nama_kategori: 'Kaleng', harga_per_kg: 1500.5, faktor_co2e_per_kg: 1.2 });

    expect(balasan.status).toBe(400);
    expect(balasan.body.error.field).toBe('harga_per_kg');
  });

  it('menolak faktor CO2e negatif', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/kategori-sampah')
      .set(sebagaiOperator())
      .send({ nama_kategori: 'Kaca', harga_per_kg: 500, faktor_co2e_per_kg: -1 });

    expect(balasan.status).toBe(400);
  });

  it('menyembunyikan kategori nonaktif kecuali diminta', async () => {
    await request(env.app)
      .patch(`/api/v1/kategori-sampah/${env.idKategori}`)
      .set(sebagaiOperator())
      .send({ aktif: false });

    const bawaan = await request(env.app)
      .get('/api/v1/kategori-sampah')
      .set(sebagaiOperator());
    const semua = await request(env.app)
      .get('/api/v1/kategori-sampah?aktif=semua')
      .set(sebagaiOperator());

    const namaBawaan = bawaan.body.data.map((k: { nama_kategori: string }) => k.nama_kategori);
    const namaSemua = semua.body.data.map((k: { nama_kategori: string }) => k.nama_kategori);

    expect(namaBawaan).not.toContain('Plastik PET');
    expect(namaSemua).toContain('Plastik PET');
  });

  it('membalas 404 saat mengubah kategori yang tidak ada', async () => {
    const balasan = await request(env.app)
      .patch('/api/v1/kategori-sampah/33333333-3333-4333-8333-333333333333')
      .set(sebagaiOperator())
      .send({ harga_per_kg: 100 });

    expect(balasan.status).toBe(404);
    expect(balasan.body.error.code).toBe('KATEGORI_TIDAK_DITEMUKAN');
  });

  it('tidak menyediakan penghapusan kategori', async () => {
    const balasan = await request(env.app)
      .delete(`/api/v1/kategori-sampah/${env.idKategori}`)
      .set(sebagaiOperator());

    expect(balasan.status).toBe(404);
  });
});
