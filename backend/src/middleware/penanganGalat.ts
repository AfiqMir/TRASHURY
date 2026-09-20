import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { GalatAplikasi } from '../galat.js';

export function penanganGalat(
  kesalahan: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (kesalahan instanceof GalatAplikasi) {
    res.status(kesalahan.status).json({
      error: {
        code: kesalahan.kode,
        message: kesalahan.message,
        ...(kesalahan.field ? { field: kesalahan.field } : {}),
        ...(kesalahan.tambahan ?? {}),
      },
    });
    return;
  }

  if (kesalahan instanceof ZodError) {
    const pertama = kesalahan.issues[0];
    res.status(400).json({
      error: {
        code: 'PERMINTAAN_TIDAK_SAH',
        message: pertama?.message ?? 'Bentuk permintaan tidak sah.',
        ...(pertama?.path.length ? { field: pertama.path.join('.') } : {}),
      },
    });
    return;
  }

  res.status(500).json({
    error: { code: 'GALAT_SERVER', message: 'Terjadi kesalahan pada server.' },
  });
}

export function rutaTidakDitemukan(_req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'RUTE_TIDAK_DITEMUKAN', message: 'Endpoint tidak ditemukan.' },
  });
}
