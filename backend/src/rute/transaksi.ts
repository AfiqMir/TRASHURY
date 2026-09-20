import { Router } from 'express';
import type { Basis } from '../db/koneksi.js';
import { ambilTransaksi, cariTransaksi, simpanTransaksi } from '../db/transaksi.js';
import { galat } from '../galat.js';
import { kirimDaftar, kirimObjek } from '../http/balasan.js';
import { buatTransaksi, halaman, saringWaktu, uuid } from '../http/validasi.js';

export function ruteTransaksi(basis: Basis): Router {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const { page, per_page } = halaman.parse(req.query);
      const { dari, sampai } = saringWaktu.parse(req.query);
      const idNasabah = req.query.id_nasabah
        ? uuid.parse(req.query.id_nasabah)
        : undefined;

      const { baris, total } = await cariTransaksi(basis, {
        idNasabah,
        dari,
        sampai,
        halaman: page,
        perHalaman: per_page,
      });
      kirimDaftar(res, baris, { page, per_page, total });
    } catch (kesalahan) {
      next(kesalahan);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const isi = buatTransaksi.parse(req.body);
      const hasil = await simpanTransaksi(basis, {
        ...isi,
        id_operator: req.operator!.id_operator,
      });

      if (hasil.keadaan === 'nasabah_tidak_ada') throw galat.nasabahTidakDitemukan();
      if (hasil.keadaan === 'kategori_tidak_aktif') {
        throw galat.kategoriTidakAktif(hasil.idKategori);
      }
      kirimObjek(res, hasil.transaksi, hasil.keadaan === 'dibuat' ? 201 : 200);
    } catch (kesalahan) {
      next(kesalahan);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const baris = await ambilTransaksi(basis, uuid.parse(req.params.id));
      if (!baris) throw galat.transaksiTidakDitemukan();
      kirimObjek(res, baris);
    } catch (kesalahan) {
      next(kesalahan);
    }
  });

  return router;
}
