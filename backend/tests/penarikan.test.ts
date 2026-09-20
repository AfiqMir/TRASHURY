import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { siapkanLingkungan, type Lingkungan } from './bantuan.js';

let env: Lingkungan;
let idNasabah: string;

beforeEach(async () => {
  env = await siapkanLingkungan();
  const nasabah = await request(env.app)
    .post('/api/v1/nasabah')
    .set({ Authorization: `Bearer ${env.tokenOperator}` })
    .send({ nama: 'Sri Wahyuni' });
  idNasabah = nasabah.body.id_nasabah;

  await request(env.app)
    .post('/api/v1/transaksi')
    .set({ Authorization: `Bearer ${env.tokenOperator}` })
    .send({
      id_transaksi: '77777777-7777-4777-8777-777777777777',
      id_nasabah: idNasabah,
      tanggal: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      detail: [{ id_kategori: env.idKategori, berat_kg: 3 }],
    });
});

const sebagai = () => ({ Authorization: `Bearer ${env.tokenOperator}` });
const kini = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

const penarikan = (jumlah: number, id = '88888888-8888-4888-8888-888888888888') => ({
  id_penarikan: id,
  id_nasabah: idNasabah,
  tanggal: kini(),
  jumlah_tarik: jumlah,
});

describe('POST /api/v1/penarikan', () => {
  it('mengurangi saldo dan mencatat sisa', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/penarikan')
      .set(sebagai())
      .send(penarikan(4000));

    expect(balasan.status).toBe(201);
    expect(balasan.body.saldo_sisa).toBe(5000);

    const saldo = await request(env.app)
      .get(`/api/v1/nasabah/${idNasabah}/saldo`)
      .set(sebagai());
    expect(saldo.body.total_saldo).toBe(5000);
  });

  it('menolak penarikan melebihi saldo', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/penarikan')
      .set(sebagai())
      .send(penarikan(9001));

    expect(balasan.status).toBe(422);
    expect(balasan.body.error.code).toBe('SALDO_TIDAK_CUKUP');
    expect(balasan.body.error.saldo_tersedia).toBe(9000);
    expect(balasan.body.error.field).toBe('jumlah_tarik');
  });

  it('mengizinkan penarikan tepat sebesar saldo', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/penarikan')
      .set(sebagai())
      .send(penarikan(9000));

    expect(balasan.status).toBe(201);
    expect(balasan.body.saldo_sisa).toBe(0);
  });

  it('menolak jumlah nol, negatif, dan pecahan', async () => {
    for (const jumlah of [0, -5000, 1500.5]) {
      const balasan = await request(env.app)
        .post('/api/v1/penarikan')
        .set(sebagai())
        .send(penarikan(jumlah));
      expect(balasan.status).toBe(400);
    }
  });

  it('aman diulang, saldo tidak berkurang dua kali', async () => {
    await request(env.app).post('/api/v1/penarikan').set(sebagai()).send(penarikan(4000));
    const kedua = await request(env.app)
      .post('/api/v1/penarikan')
      .set(sebagai())
      .send(penarikan(4000));

    expect(kedua.status).toBe(200);

    const saldo = await request(env.app)
      .get(`/api/v1/nasabah/${idNasabah}/saldo`)
      .set(sebagai());
    expect(saldo.body.total_saldo).toBe(5000);
  });

  it('meloloskan tepat satu dari dua penarikan berbeda yang dikirim bersamaan', async () => {
    const [pertama, kedua] = await Promise.all([
      request(env.app)
        .post('/api/v1/penarikan')
        .set(sebagai())
        .send(penarikan(6000, '99999999-9999-4999-8999-999999999999')),
      request(env.app)
        .post('/api/v1/penarikan')
        .set(sebagai())
        .send(penarikan(6000, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')),
    ]);

    const status = [pertama.status, kedua.status].sort();
    expect(status).toEqual([201, 422]);

    const saldo = await request(env.app)
      .get(`/api/v1/nasabah/${idNasabah}/saldo`)
      .set(sebagai());
    expect(saldo.body.total_saldo).toBe(3000);
  });

  it('dijaga basis data agar saldo tidak pernah negatif', async () => {
    const operator = await env.basis.kueri<{ id_operator: string }>(
      "SELECT id_operator FROM operator WHERE username = 'operator'",
    );
    await expect(
      env.basis.kueri(
        `INSERT INTO penarikan_saldo (id_penarikan, id_nasabah, id_operator, tanggal,
                                      jumlah_tarik, saldo_sisa)
           VALUES (gen_random_uuid(), $1, $2, now(), 999999, 0)`,
        [idNasabah, operator.rows[0]!.id_operator],
      ),
    ).rejects.toThrow();
  });
});

describe('GET /api/v1/nasabah/{id}/buku-tabungan', () => {
  it('menggabungkan setoran dan penarikan dalam satu urutan', async () => {
    await request(env.app).post('/api/v1/penarikan').set(sebagai()).send(penarikan(4000));

    const balasan = await request(env.app)
      .get(`/api/v1/nasabah/${idNasabah}/buku-tabungan`)
      .set(sebagai());

    expect(balasan.status).toBe(200);
    expect(balasan.body.meta.total).toBe(2);

    const jenis = balasan.body.data.map((b: { jenis: string }) => b.jenis);
    expect(jenis).toContain('setoran');
    expect(jenis).toContain('penarikan');
  });

  it('mencatat penarikan sebagai nominal negatif', async () => {
    await request(env.app).post('/api/v1/penarikan').set(sebagai()).send(penarikan(4000));

    const balasan = await request(env.app)
      .get(`/api/v1/nasabah/${idNasabah}/buku-tabungan`)
      .set(sebagai());

    const jumlah = balasan.body.data.reduce(
      (total: number, b: { nominal: number }) => total + b.nominal,
      0,
    );
    expect(jumlah).toBe(5000);
  });

  it('membalas 404 untuk nasabah yang tidak ada', async () => {
    const balasan = await request(env.app)
      .get('/api/v1/nasabah/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/buku-tabungan')
      .set(sebagai());

    expect(balasan.status).toBe(404);
  });
});
