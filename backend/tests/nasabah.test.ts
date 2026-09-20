import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { siapkanLingkungan, type Lingkungan } from './bantuan.js';

let env: Lingkungan;
const ID_TETAP = '11111111-1111-4111-8111-111111111111';

beforeAll(async () => {
  env = await siapkanLingkungan();
});

const sebagaiOperator = () => ({ Authorization: `Bearer ${env.tokenOperator}` });
const sebagaiPengurus = () => ({ Authorization: `Bearer ${env.tokenPengurus}` });

describe('POST /api/v1/nasabah', () => {
  it('membuat nasabah dengan saldo awal nol', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/nasabah')
      .set(sebagaiOperator())
      .send({ nama: 'Sri Wahyuni', nomor_hp: '081234567890' });

    expect(balasan.status).toBe(201);
    expect(balasan.body.total_saldo).toBe(0);
    expect(balasan.body.id_nasabah).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('memakai identifier kiriman klien', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/nasabah')
      .set(sebagaiOperator())
      .send({ id_nasabah: ID_TETAP, nama: 'Nasabah Luring' });

    expect(balasan.status).toBe(201);
    expect(balasan.body.id_nasabah).toBe(ID_TETAP);
  });

  it('aman diulang, pengiriman kedua dibalas 200 tanpa menggandakan', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/nasabah')
      .set(sebagaiOperator())
      .send({ id_nasabah: ID_TETAP, nama: 'Nama Lain' });

    expect(balasan.status).toBe(200);
    expect(balasan.body.nama).toBe('Nasabah Luring');

    const daftar = await request(env.app)
      .get('/api/v1/nasabah?q=Luring')
      .set(sebagaiOperator());
    expect(daftar.body.meta.total).toBe(1);
  });

  it('menolak nama kosong', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/nasabah')
      .set(sebagaiOperator())
      .send({ nama: '   ' });

    expect(balasan.status).toBe(400);
    expect(balasan.body.error.code).toBe('PERMINTAAN_TIDAK_SAH');
    expect(balasan.body.error.field).toBe('nama');
  });

  it('mengabaikan total_saldo kiriman klien', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/nasabah')
      .set(sebagaiOperator())
      .send({ nama: 'Penyusup Saldo', total_saldo: 999_000 });

    expect(balasan.status).toBe(201);
    expect(balasan.body.total_saldo).toBe(0);
  });
});

describe('GET /api/v1/nasabah', () => {
  it('mencari tanpa membedakan huruf besar kecil', async () => {
    const balasan = await request(env.app)
      .get('/api/v1/nasabah?q=sri')
      .set(sebagaiOperator());

    expect(balasan.status).toBe(200);
    expect(balasan.body.data).toHaveLength(1);
    expect(balasan.body.data[0].nama).toBe('Sri Wahyuni');
  });

  it('membungkus daftar beserta metadata halaman', async () => {
    const balasan = await request(env.app)
      .get('/api/v1/nasabah?page=1&per_page=2')
      .set(sebagaiOperator());

    expect(balasan.body.data.length).toBeLessThanOrEqual(2);
    expect(balasan.body.meta).toMatchObject({ page: 1, per_page: 2 });
  });

  it('menolak per_page melebihi batas', async () => {
    const balasan = await request(env.app)
      .get('/api/v1/nasabah?per_page=500')
      .set(sebagaiOperator());
    expect(balasan.status).toBe(400);
  });
});

describe('PATCH dan DELETE /api/v1/nasabah', () => {
  it('mengubah sebagian isian saja', async () => {
    const balasan = await request(env.app)
      .patch(`/api/v1/nasabah/${ID_TETAP}`)
      .set(sebagaiOperator())
      .send({ alamat: 'RT 03 RW 05' });

    expect(balasan.status).toBe(200);
    expect(balasan.body.alamat).toBe('RT 03 RW 05');
    expect(balasan.body.nama).toBe('Nasabah Luring');
  });

  it('membalas 404 untuk nasabah yang tidak ada', async () => {
    const balasan = await request(env.app)
      .get('/api/v1/nasabah/22222222-2222-4222-8222-222222222222')
      .set(sebagaiOperator());

    expect(balasan.status).toBe(404);
    expect(balasan.body.error.code).toBe('NASABAH_TIDAK_DITEMUKAN');
  });

  it('melarang peran operator menghapus nasabah', async () => {
    const balasan = await request(env.app)
      .delete(`/api/v1/nasabah/${ID_TETAP}`)
      .set(sebagaiOperator());

    expect(balasan.status).toBe(403);
    expect(balasan.body.error.code).toBe('TIDAK_BERWENANG');
  });

  it('menolak menghapus nasabah yang sudah punya transaksi', async () => {
    const operator = await env.basis.kueri<{ id_operator: string }>(
      "SELECT id_operator FROM operator WHERE username = 'operator'",
    );
    await env.basis.kueri(
      `INSERT INTO transaksi (id_transaksi, id_nasabah, id_operator, tanggal, total_nominal, total_co2e)
         VALUES (gen_random_uuid(), $1, $2, now(), 9000, 4.5)`,
      [ID_TETAP, operator.rows[0]!.id_operator],
    );

    const balasan = await request(env.app)
      .delete(`/api/v1/nasabah/${ID_TETAP}`)
      .set(sebagaiPengurus());

    expect(balasan.status).toBe(409);
    expect(balasan.body.error.code).toBe('NASABAH_MASIH_TERPAKAI');
  });

  it('menghapus nasabah yang belum punya riwayat', async () => {
    const dibuat = await request(env.app)
      .post('/api/v1/nasabah')
      .set(sebagaiOperator())
      .send({ nama: 'Nasabah Salah Input' });

    const balasan = await request(env.app)
      .delete(`/api/v1/nasabah/${dibuat.body.id_nasabah}`)
      .set(sebagaiPengurus());

    expect(balasan.status).toBe(204);
  });
});
