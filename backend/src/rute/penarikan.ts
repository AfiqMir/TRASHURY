import { Router } from 'express';
import type { Basis } from '../db/koneksi.js';
import { simpanPenarikan } from '../db/penarikan.js';
import { galat } from '../galat.js';
import { kirimObjek } from '../http/balasan.js';
import { buatPenarikan } from '../http/validasi.js';

export function rutePenarikan(basis: Basis): Router {
  const router = Router();

  router.post('/', async (req, res, next) => {
    try {
      const isi = buatPenarikan.parse(req.body);
      const hasil = await simpanPenarikan(basis, {
        ...isi,
        id_operator: req.operator!.id_operator,
      });

      if (hasil.keadaan === 'nasabah_tidak_ada') throw galat.nasabahTidakDitemukan();
      if (hasil.keadaan === 'saldo_kurang') {
        throw galat.saldoTidakCukup(hasil.saldoTersedia, isi.jumlah_tarik);
      }
      kirimObjek(res, hasil.penarikan, hasil.keadaan === 'dibuat' ? 201 : 200);
    } catch (kesalahan) {
      next(kesalahan);
    }
  });

  return router;
}
