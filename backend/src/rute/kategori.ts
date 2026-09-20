import { Router } from 'express';
import type { Basis } from '../db/koneksi.js';
import {
  ambilKategori,
  ambilKategoriBerdasarNama,
  daftarKategori,
  simpanKategori,
  ubahKategori as ubahBarisKategori,
} from '../db/kategori.js';
import { galat } from '../galat.js';
import { kirimObjek } from '../http/balasan.js';
import { buatKategori, ubahKategori, uuid } from '../http/validasi.js';

export function ruteKategori(basis: Basis): Router {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const baris = await daftarKategori(basis, req.query.aktif === 'semua');
      res.status(200).json({ data: baris, meta: { total: baris.length } });
    } catch (kesalahan) {
      next(kesalahan);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const isi = buatKategori.parse(req.body);
      const kembar = await ambilKategoriBerdasarNama(basis, isi.nama_kategori);
      if (kembar && kembar.id_kategori !== isi.id_kategori) {
        throw galat.kategoriSudahAda(isi.nama_kategori);
      }
      const { baris, baru } = await simpanKategori(basis, isi);
      kirimObjek(res, baris, baru ? 201 : 200);
    } catch (kesalahan) {
      next(kesalahan);
    }
  });

  router.patch('/:id', async (req, res, next) => {
    try {
      const id = uuid.parse(req.params.id);
      const isi = ubahKategori.parse(req.body);
      if (isi.nama_kategori) {
        const kembar = await ambilKategoriBerdasarNama(basis, isi.nama_kategori);
        if (kembar && kembar.id_kategori !== id) throw galat.kategoriSudahAda(isi.nama_kategori);
      }
      const baris = await ubahBarisKategori(basis, id, isi);
      if (!baris) throw galat.kategoriTidakDitemukan();
      kirimObjek(res, baris);
    } catch (kesalahan) {
      next(kesalahan);
    }
  });

  return router;
}
