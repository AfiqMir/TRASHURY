import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { siapkanLingkungan, type Lingkungan } from './bantuan.js';

let env: Lingkungan;

beforeAll(async () => {
  env = await siapkanLingkungan();
});

describe('POST /api/v1/auth/login', () => {
  it('menerbitkan token bagi kredensial yang benar', async () => {
    const balasan = await request(env.app)
      .post('/api/v1/auth/login')
      .send({ username: 'operator', password: 'rahasia' });

    expect(balasan.status).toBe(200);
    expect(balasan.body.token).toBeTruthy();
    expect(balasan.body.operator.peran).toBe('operator');
    expect(balasan.body.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it('tidak membedakan username salah dengan kata sandi salah', async () => {
    const usernameSalah = await request(env.app)
      .post('/api/v1/auth/login')
      .send({ username: 'tidakada', password: 'rahasia' });
    const sandiSalah = await request(env.app)
      .post('/api/v1/auth/login')
      .send({ username: 'operator', password: 'salah' });

    expect(usernameSalah.status).toBe(401);
    expect(sandiSalah.status).toBe(401);
    expect(usernameSalah.body.error).toEqual(sandiSalah.body.error);
  });
});

describe('perlindungan endpoint', () => {
  it('menolak permintaan tanpa token', async () => {
    const balasan = await request(env.app).get('/api/v1/nasabah');
    expect(balasan.status).toBe(401);
    expect(balasan.body.error.code).toBe('TOKEN_TIDAK_SAH');
  });

  it('menolak token yang tidak sah', async () => {
    const balasan = await request(env.app)
      .get('/api/v1/nasabah')
      .set('Authorization', 'Bearer bukan-token');
    expect(balasan.status).toBe(401);
  });
});
