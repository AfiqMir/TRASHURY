import express, { type Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import type { Basis } from './db/koneksi.js';
import { penanganGalat, rutaTidakDitemukan } from './middleware/penanganGalat.js';
import { butuhToken } from './middleware/autentikasi.js';
import { ruteAuth } from './rute/auth.js';
import { ruteKategori } from './rute/kategori.js';
import { ruteNasabah } from './rute/nasabah.js';
import { dokumenOpenApi } from './openapi.js';

export interface OpsiAplikasi {
  basis: Basis;
  jwtSecret: string;
  jwtTtlJam: number;
}

export function buatAplikasi({ basis, jwtSecret, jwtTtlJam }: OpsiAplikasi): Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(dokumenOpenApi));

  const api = express.Router();
  api.use('/auth', ruteAuth(basis, jwtSecret, jwtTtlJam));
  api.use(butuhToken(jwtSecret));
  api.use('/nasabah', ruteNasabah(basis));
  api.use('/kategori-sampah', ruteKategori(basis));

  app.use('/api/v1', api);
  app.use(rutaTidakDitemukan);
  app.use(penanganGalat);

  return app;
}
