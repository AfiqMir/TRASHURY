import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { siapkanLingkungan, type Lingkungan } from './bantuan.js';

let env: Lingkungan;
let idNasabah: string;

const ID_TRANSAKSI = '44444444-4444-4444-8444-444444444444';

beforeEach(async () => {
  env = await siapkanLingkungan();
  const nasabah = await request(env.app)
    .post('/api/v1/nasabah')
    .set({ Authorization: `Bearer ${env.tokenOperator}` })
    .send({ nama: 'Sri Wahyuni' });
  idNasabah = nasabah.body.id_nasabah;
});

const sebagai = () => ({ Authorization: `Bearer ${env.tokenOperator}` });
const kini = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

const setoran = (ubahan: Record<string, unknown> = {}) => ({
  id_transaksi: ID_TRANSAKSI,
  id_nasabah: idNasabah,
  tanggal: kini(),
  detail: [{ id_kategori: env.idKategori, berat_kg: 3, sumber_klasifikasi: 'ai' }],
  ...ubahan,
});

describe('POST /api/v1/transaksi', () => {
  it('menghitung subtotal dan total di server', async () => {
    const balasan = await request(env.app).post('/api/v1/transaksi').set(sebagai()).send(setoran());

    expect(balasan.status).toBe(201);
    expect(balasan.body.total_nominal).toBe(9000);
    expect(balasan.body.total_co2e).toBe(4.5);
    expect(balasan.body.detail[0].subtotal_harga).toBe(9000);
    expect(balasan.body.detail[0].nama_kategori).toBe('Plastik PET');
  });

  it('mengabaikan total kiriman klien', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/transaksi')
      .set(sebagai())
      .send({ ...setoran(), total_nominal: 999_000, total_co2e: 999 });

    expect(balasan.status).toBe(201);
    expect(balasan.body.total_nominal).toBe(9000);
  });

  it('menambah saldo nasabah sesuai total transaksi', async () => {
    await request(env.app).post('/api/v1/transaksi').set(sebagai()).send(setoran());

    const saldo = await request(env.app)
      .get(`/api/v1/nasabah/${idNasabah}/saldo`)
      .set(sebagai());
    expect(saldo.body.total_saldo).toBe(9000);
    expect(saldo.body.total_co2e).toBe(4.5);
  });

  it('aman diulang, saldo tidak bertambah dua kali', async () => {
    await request(env.app).post('/api/v1/transaksi').set(sebagai()).send(setoran());
    const kedua = await request(env.app).post('/api/v1/transaksi').set(sebagai()).send(setoran());

    expect(kedua.status).toBe(200);

    const saldo = await request(env.app)
      .get(`/api/v1/nasabah/${idNasabah}/saldo`)
      .set(sebagai());
    expect(saldo.body.total_saldo).toBe(9000);
  });

  it('menolak rincian kosong', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/transaksi')
      .set(sebagai())
      .send(setoran({ detail: [] }));

    expect(balasan.status).toBe(400);
    expect(balasan.body.error.field).toBe('detail');
  });

  it('menolak berat nol atau negatif', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/transaksi')
      .set(sebagai())
      .send(setoran({ detail: [{ id_kategori: env.idKategori, berat_kg: 0 }] }));

    expect(balasan.status).toBe(400);
  });

  it('menolak kategori yang sudah dinonaktifkan', async () => {
    await request(env.app)
      .patch(`/api/v1/kategori-sampah/${env.idKategori}`)
      .set(sebagai())
      .send({ aktif: false });

    const balasan = await request(env.app).post('/api/v1/transaksi').set(sebagai()).send(setoran());

    expect(balasan.status).toBe(422);
    expect(balasan.body.error.code).toBe('KATEGORI_TIDAK_AKTIF');
  });

  it('menolak tanggal lebih dari 24 jam di masa depan', async () => {
    const lusa = new Date(Date.now() + 48 * 3600 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
    const balasan = await request(env.app)
      .post('/api/v1/transaksi')
      .set(sebagai())
      .send(setoran({ tanggal: lusa }));

    expect(balasan.status).toBe(400);
    expect(balasan.body.error.field).toBe('tanggal');
  });

  it('menerima tanggal luring beberapa jam ke depan', async () => {
    const nanti = new Date(Date.now() + 2 * 3600 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
    const balasan = await request(env.app)
      .post('/api/v1/transaksi')
      .set(sebagai())
      .send(setoran({ tanggal: nanti }));

    expect(balasan.status).toBe(201);
  });

  it('tidak menyimpan apa pun bila satu rincian bermasalah', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/transaksi')
      .set(sebagai())
      .send(
        setoran({
          detail: [
            { id_kategori: env.idKategori, berat_kg: 2 },
            { id_kategori: '55555555-5555-4555-8555-555555555555', berat_kg: 1 },
          ],
        }),
      );

    expect(balasan.status).toBe(422);

    const tersimpan = await request(env.app)
      .get(`/api/v1/transaksi/${ID_TRANSAKSI}`)
      .set(sebagai());
    expect(tersimpan.status).toBe(404);

    const saldo = await request(env.app)
      .get(`/api/v1/nasabah/${idNasabah}/saldo`)
      .set(sebagai());
    expect(saldo.body.total_saldo).toBe(0);
  });

  it('menolak nasabah yang tidak ada', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/transaksi')
      .set(sebagai())
      .send(setoran({ id_nasabah: '66666666-6666-4666-8666-666666666666' }));

    expect(balasan.status).toBe(404);
    expect(balasan.body.error.code).toBe('NASABAH_TIDAK_DITEMUKAN');
  });
});

describe('GET /api/v1/transaksi', () => {
  it('menyaring berdasarkan nasabah', async () => {
    await request(env.app).post('/api/v1/transaksi').set(sebagai()).send(setoran());

    const balasan = await request(env.app)
      .get(`/api/v1/transaksi?id_nasabah=${idNasabah}`)
      .set(sebagai());

    expect(balasan.body.meta.total).toBe(1);
    expect(balasan.body.data[0].detail).toHaveLength(1);
  });

  it('tidak menyediakan pengubahan maupun penghapusan transaksi', async () => {
    await request(env.app).post('/api/v1/transaksi').set(sebagai()).send(setoran());

    const ubah = await request(env.app)
      .patch(`/api/v1/transaksi/${ID_TRANSAKSI}`)
      .set(sebagai())
      .send({ total_nominal: 1 });
    const hapus = await request(env.app)
      .delete(`/api/v1/transaksi/${ID_TRANSAKSI}`)
      .set(sebagai());

    expect(ubah.status).toBe(404);
    expect(hapus.status).toBe(404);
  });
});
