import { Router } from 'express';
import type { Basis } from '../db/koneksi.js';
import {
  ambilNasabah,
  cariNasabah,
  hapusNasabah,
  nasabahPunyaRiwayat,
  simpanNasabah,
  ubahNasabah as ubahBarisNasabah,
} from '../db/nasabah.js';
import { galat } from '../galat.js';
import { kirimDaftar, kirimObjek } from '../http/balasan.js';
import { buatNasabah, halaman, ubahNasabah, uuid } from '../http/validasi.js';
import { butuhPeran } from '../middleware/autentikasi.js';

export function ruteNasabah(basis: Basis): Router {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const { page, per_page } = halaman.parse(req.query);
      const q = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : undefined;
      const { baris, total } = await cariNasabah(basis, { q, halaman: page, perHalaman: per_page });
      kirimDaftar(res, baris, { page, per_page, total });
    } catch (kesalahan) {
      next(kesalahan);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const isi = buatNasabah.parse(req.body);
      const { baris, baru } = await simpanNasabah(basis, isi);
      kirimObjek(res, baris, baru ? 201 : 200);
    } catch (kesalahan) {
      next(kesalahan);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const id = uuid.parse(req.params.id);
      const baris = await ambilNasabah(basis, id);
      if (!baris) throw galat.nasabahTidakDitemukan();
      kirimObjek(res, baris);
    } catch (kesalahan) {
      next(kesalahan);
    }
  });

  router.patch('/:id', async (req, res, next) => {
    try {
      const id = uuid.parse(req.params.id);
      const isi = ubahNasabah.parse(req.body);
      const baris = await ubahBarisNasabah(basis, id, isi);
      if (!baris) throw galat.nasabahTidakDitemukan();
      kirimObjek(res, baris);
    } catch (kesalahan) {
      next(kesalahan);
    }
  });

  router.delete('/:id', butuhPeran('pengurus'), async (req, res, next) => {
    try {
      const id = uuid.parse(req.params.id);
      if (!(await ambilNasabah(basis, id))) throw galat.nasabahTidakDitemukan();
      if (await nasabahPunyaRiwayat(basis, id)) throw galat.nasabahMasihTerpakai();
      await hapusNasabah(basis, id);
      res.status(204).end();
    } catch (kesalahan) {
      next(kesalahan);
    }
  });

  return router;
}
