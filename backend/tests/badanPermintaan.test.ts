import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { siapkanLingkungan, type Lingkungan } from './bantuan.js';

let env: Lingkungan;

beforeAll(async () => {
  env = await siapkanLingkungan();
});

const sebagai = () => ({ Authorization: `Bearer ${env.tokenOperator}` });

describe('badan permintaan cacat', () => {
  it('membalas 400 untuk JSON yang rusak', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/nasabah')
      .set(sebagai())
      .set('Content-Type', 'application/json')
      .send('{"nama": ');

    expect(balasan.status).toBe(400);
    expect(balasan.body.error.code).toBe('BADAN_TIDAK_SAH');
  });

  it('membalas 413 untuk badan yang melebihi batas', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/nasabah')
      .set(sebagai())
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ nama: 'A'.repeat(1_200_000) }));

    expect(balasan.status).toBe(413);
    expect(balasan.body.error.code).toBe('BADAN_TERLALU_BESAR');
  });

  it('tidak membocorkan rincian galat ke pemanggil', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/nasabah')
      .set(sebagai())
      .set('Content-Type', 'application/json')
      .send('{rusak');

    expect(JSON.stringify(balasan.body)).not.toMatch(/JSON\.parse|SyntaxError|at Object/);
  });
});
