import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { siapkanLingkungan, type Lingkungan } from './bantuan.js';

let env: Lingkungan;
let idKertas: string;
let idNasabahA: string;
let idNasabahB: string;

const sebagai = () => ({ Authorization: `Bearer ${env.tokenOperator}` });

async function nasabah(nama: string): Promise<string> {
  const balasan = await request(env.app).post('/api/v1/nasabah').set(sebagai()).send({ nama });
  return balasan.body.id_nasabah as string;
}

async function setor(
  id: string,
  idNasabah: string,
  tanggal: string,
  detail: { id_kategori: string; berat_kg: number }[],
): Promise<void> {
  const balasan = await request(env.app)
    .post('/api/v1/transaksi')
    .set(sebagai())
    .send({ id_transaksi: id, id_nasabah: idNasabah, tanggal, detail });
  expect(balasan.status).toBe(201);
}

async function tarik(id: string, idNasabah: string, tanggal: string, jumlah: number) {
  const balasan = await request(env.app)
    .post('/api/v1/penarikan')
    .set(sebagai())
    .send({ id_penarikan: id, id_nasabah: idNasabah, tanggal, jumlah_tarik: jumlah });
  expect(balasan.status).toBe(201);
}

function biner(res: request.Response, selesai: (galat: Error | null, isi: Buffer) => void) {
  const potongan: Buffer[] = [];
  res.on('data', (b: Buffer) => potongan.push(b));
  res.on('end', () => selesai(null, Buffer.concat(potongan)));
}

beforeEach(async () => {
  env = await siapkanLingkungan();
  const kertas = await request(env.app)
    .post('/api/v1/kategori-sampah')
    .set(sebagai())
    .send({ nama_kategori: 'Kertas', harga_per_kg: 2000, faktor_co2e_per_kg: 0.8 });
  idKertas = kertas.body.id_kategori;
  idNasabahA = await nasabah('Sri Wahyuni');
  idNasabahB = await nasabah('Budi Santoso');

  await setor('11111111-1111-4111-8111-111111111111', idNasabahA, '2026-08-31T17:30:00Z', [
    { id_kategori: env.idKategori, berat_kg: 2 },
    { id_kategori: idKertas, berat_kg: 1.5 },
  ]);
  await setor('22222222-2222-4222-8222-222222222222', idNasabahB, '2026-09-15T03:00:00Z', [
    { id_kategori: env.idKategori, berat_kg: 1.25 },
  ]);
  await setor('33333333-3333-4333-8333-333333333333', idNasabahA, '2026-08-31T16:59:59Z', [
    { id_kategori: env.idKategori, berat_kg: 10 },
  ]);
  await setor('44444444-4444-4444-8444-444444444444', idNasabahB, '2026-09-30T17:00:00Z', [
    { id_kategori: idKertas, berat_kg: 4 },
  ]);
  await tarik('55555555-5555-4555-8555-555555555555', idNasabahA, '2026-09-20T02:00:00Z', 5000);
});

describe('GET /api/v1/laporan/bulanan', () => {
  it('merekap setoran dan penarikan dengan batas bulan WIB', async () => {
    const balasan = await request(env.app)
      .get('/api/v1/laporan/bulanan?bulan=2026-09')
      .set(sebagai());

    expect(balasan.status).toBe(200);
    expect(balasan.body).toMatchObject({
      bulan: '2026-09',
      zona_waktu: 'Asia/Jakarta',
      dari: '2026-08-31T17:00:00Z',
      sampai: '2026-09-30T17:00:00Z',
      ringkasan: {
        jumlah_setoran: 2,
        jumlah_nasabah_menyetor: 2,
        total_berat_kg: 4.75,
        total_nilai_rupiah: 12750,
        total_co2e_kg: 6.075,
        jumlah_penarikan: 1,
        total_penarikan_rupiah: 5000,
      },
      per_kategori: [
        {
          nama_kategori: 'Kertas',
          jumlah_setoran: 1,
          total_berat_kg: 1.5,
          total_nilai_rupiah: 3000,
          total_co2e_kg: 1.2,
        },
        {
          nama_kategori: 'Plastik PET',
          jumlah_setoran: 2,
          total_berat_kg: 3.25,
          total_nilai_rupiah: 9750,
          total_co2e_kg: 4.875,
        },
      ],
    });
  });

  it('memasukkan setoran tengah malam WIB ke bulan berikutnya', async () => {
    const agustus = await request(env.app)
      .get('/api/v1/laporan/bulanan?bulan=2026-08')
      .set(sebagai());
    const oktober = await request(env.app)
      .get('/api/v1/laporan/bulanan?bulan=2026-10')
      .set(sebagai());

    expect(agustus.body.ringkasan.total_berat_kg).toBe(10);
    expect(oktober.body.ringkasan.total_berat_kg).toBe(4);
  });

  it('membalas angka nol untuk bulan tanpa transaksi', async () => {
    const balasan = await request(env.app)
      .get('/api/v1/laporan/bulanan?bulan=2025-01')
      .set(sebagai());

    expect(balasan.status).toBe(200);
    expect(balasan.body.per_kategori).toEqual([]);
    expect(balasan.body.ringkasan).toEqual({
      jumlah_setoran: 0,
      jumlah_nasabah_menyetor: 0,
      total_berat_kg: 0,
      total_nilai_rupiah: 0,
      total_co2e_kg: 0,
      jumlah_penarikan: 0,
      total_penarikan_rupiah: 0,
    });
  });

  it('menolak bulan yang kosong atau tidak berbentuk YYYY-MM', async () => {
    for (const kueri of ['', '?bulan=2026-13', '?bulan=2026-9', '?bulan=september']) {
      const balasan = await request(env.app)
        .get(`/api/v1/laporan/bulanan${kueri}`)
        .set(sebagai());
      expect(balasan.status).toBe(400);
      expect(balasan.body.error.code).toBe('PERMINTAAN_TIDAK_SAH');
      expect(balasan.body.error.field).toBe('bulan');
    }
  });

  it('menolak format yang tidak dikenal', async () => {
    const balasan = await request(env.app)
      .get('/api/v1/laporan/bulanan?bulan=2026-09&format=xlsx')
      .set(sebagai());

    expect(balasan.status).toBe(400);
    expect(balasan.body.error.field).toBe('format');
  });

  it('mewajibkan token', async () => {
    const balasan = await request(env.app).get('/api/v1/laporan/bulanan?bulan=2026-09');
    expect(balasan.status).toBe(401);
  });

  it('mengekspor CSV beserta baris total', async () => {
    const balasan = await request(env.app)
      .get('/api/v1/laporan/bulanan?bulan=2026-09&format=csv')
      .set(sebagai());

    expect(balasan.status).toBe(200);
    expect(balasan.headers['content-type']).toMatch(/^text\/csv/);
    expect(balasan.headers['content-disposition']).toContain('rekap-bulanan-2026-09.csv');
    expect(balasan.text.charCodeAt(0)).toBe(0xfeff);
    expect(balasan.text.slice(1).split('\r\n')).toEqual([
      'bulan,nama_kategori,jumlah_setoran,total_berat_kg,total_nilai_rupiah,total_co2e_kg',
      '2026-09,Kertas,1,1.50,3000,1.2000',
      '2026-09,Plastik PET,2,3.25,9750,4.8750',
      '2026-09,TOTAL,2,4.75,12750,6.0750',
      '',
    ]);
  });

  it('mengamankan nama kategori berisi koma dan rumus pada CSV', async () => {
    const kategori = await request(env.app)
      .post('/api/v1/kategori-sampah')
      .set(sebagai())
      .send({ nama_kategori: '=Botol, "kaca"', harga_per_kg: 1000, faktor_co2e_per_kg: 0.3 });
    await setor('66666666-6666-4666-8666-666666666666', idNasabahA, '2026-09-10T03:00:00Z', [
      { id_kategori: kategori.body.id_kategori, berat_kg: 1 },
    ]);

    const balasan = await request(env.app)
      .get('/api/v1/laporan/bulanan?bulan=2026-09&format=csv')
      .set(sebagai());

    expect(balasan.text).toContain(`2026-09,"'=Botol, ""kaca""",1,1.00,1000,0.3000`);
  });

  it('mengekspor PDF', async () => {
    const balasan = await request(env.app)
      .get('/api/v1/laporan/bulanan?bulan=2026-09&format=pdf')
      .set(sebagai())
      .buffer(true)
      .parse(biner);

    expect(balasan.status).toBe(200);
    expect(balasan.headers['content-type']).toBe('application/pdf');
    expect(balasan.headers['content-disposition']).toContain('rekap-bulanan-2026-09.pdf');
    const isi = balasan.body as Buffer;
    expect(isi.subarray(0, 5).toString()).toBe('%PDF-');
    expect(isi.length).toBeGreaterThan(1000);
  });
});
