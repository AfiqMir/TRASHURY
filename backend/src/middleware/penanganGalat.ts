import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { GalatAplikasi } from '../galat.js';

interface GalatBadan extends Error {
  type: string;
  status?: number;
}

function galatBadan(kesalahan: unknown): kesalahan is GalatBadan {
  return (
    kesalahan instanceof Error &&
    'type' in kesalahan &&
    typeof (kesalahan as GalatBadan).type === 'string' &&
    (kesalahan as GalatBadan).type.startsWith('entity.')
  );
}

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

  if (galatBadan(kesalahan)) {
    const terlaluBesar = kesalahan.type === 'entity.too.large';
    res.status(terlaluBesar ? 413 : 400).json({
      error: terlaluBesar
        ? {
            code: 'BADAN_TERLALU_BESAR',
            message: 'Badan permintaan melebihi batas yang diizinkan.',
          }
        : {
            code: 'BADAN_TIDAK_SAH',
            message: 'Badan permintaan bukan JSON yang sah.',
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

  console.error('[galat-tak-terduga]', {
    metode: _req.method,
    jalur: _req.originalUrl,
    kesalahan: kesalahan instanceof Error ? kesalahan.stack : String(kesalahan),
  });

  res.status(500).json({
    error: { code: 'GALAT_SERVER', message: 'Terjadi kesalahan pada server.' },
  });
}

export function rutaTidakDitemukan(_req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'RUTE_TIDAK_DITEMUKAN', message: 'Endpoint tidak ditemukan.' },
  });
}
