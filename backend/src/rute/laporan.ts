import { Router } from 'express';
import type { Basis } from '../db/koneksi.js';
import { rekapBulanan } from '../db/laporan.js';
import { kirimObjek } from '../http/balasan.js';
import { saringLaporan } from '../http/validasi.js';
import { rekapKeCsv } from '../laporan/csv.js';
import { rekapKePdf } from '../laporan/pdf.js';

export function ruteLaporan(basis: Basis): Router {
  const router = Router();

  router.get('/bulanan', async (req, res, next) => {
    try {
      const { bulan, format } = saringLaporan.parse(req.query);
      const rekap = await rekapBulanan(basis, bulan);
      const berkas = `rekap-bulanan-${bulan}`;

      if (format === 'csv') {
        res
          .status(200)
          .type('text/csv; charset=utf-8')
          .attachment(`${berkas}.csv`)
          .send(rekapKeCsv(rekap));
        return;
      }
      if (format === 'pdf') {
        res
          .status(200)
          .type('application/pdf')
          .attachment(`${berkas}.pdf`)
          .send(await rekapKePdf(rekap));
        return;
      }
      kirimObjek(res, rekap);
    } catch (kesalahan) {
      next(kesalahan);
    }
  });

  return router;
}
