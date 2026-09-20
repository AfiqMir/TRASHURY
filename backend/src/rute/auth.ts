import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Basis } from '../db/koneksi.js';
import { ambilOperatorBerdasarUsername } from '../db/operator.js';
import { galat } from '../galat.js';
import { masuk } from '../http/validasi.js';

export function ruteAuth(basis: Basis, rahasia: string, ttlJam: number): Router {
  const router = Router();

  router.post('/login', async (req, res, next) => {
    try {
      const isi = masuk.parse(req.body);
      const operator = await ambilOperatorBerdasarUsername(basis, isi.username);
      const cocok = operator
        ? await bcrypt.compare(isi.password, operator.password_hash)
        : await bcrypt.compare(isi.password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidin');

      if (!operator || !cocok) throw galat.kredensialSalah();

      const kedaluwarsa = new Date(Date.now() + ttlJam * 3600 * 1000);
      const token = jwt.sign(
        { sub: operator.id_operator, nama: operator.nama, peran: operator.peran },
        rahasia,
        { expiresIn: `${ttlJam}h` },
      );

      res.status(200).json({
        token,
        expires_at: kedaluwarsa.toISOString().replace(/\.\d{3}Z$/, 'Z'),
        operator: {
          id_operator: operator.id_operator,
          nama: operator.nama,
          peran: operator.peran,
        },
      });
    } catch (kesalahan) {
      next(kesalahan);
    }
  });

  return router;
}
