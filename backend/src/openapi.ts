import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodTypeAny } from 'zod';
import { buatKategori, buatNasabah, masuk, ubahKategori, ubahNasabah } from './http/validasi.js';

function badan(skema: ZodTypeAny) {
  return {
    required: true,
    content: {
      'application/json': { schema: zodToJsonSchema(skema, { target: 'openApi3' }) },
    },
  };
}

const galatResponse = {
  description: 'Galat',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              field: { type: 'string' },
            },
            required: ['code', 'message'],
          },
        },
      },
    },
  },
};

const bearer = [{ bearerAuth: [] }];

export const dokumenOpenApi = {
  openapi: '3.0.3',
  info: {
    title: 'TRASHURY API',
    version: '0.1.0',
    description:
      'Endpoint master data dan transaksi bank sampah. Acuan lengkap ada di docs/design/kontrak-api.md.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  paths: {
    '/auth/login': {
      post: {
        summary: 'Masuk sebagai operator',
        requestBody: badan(masuk),
        responses: { 200: { description: 'Token diterbitkan' }, 401: galatResponse },
      },
    },
    '/nasabah': {
      get: {
        summary: 'Daftar nasabah',
        security: bearer,
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'per_page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          },
        ],
        responses: { 200: { description: 'Daftar nasabah beserta metadata halaman' } },
      },
      post: {
        summary: 'Tambah nasabah',
        security: bearer,
        requestBody: badan(buatNasabah),
        responses: {
          201: { description: 'Nasabah baru dibuat' },
          200: { description: 'Nasabah dengan identifier itu sudah ada' },
          400: galatResponse,
        },
      },
    },
    '/nasabah/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      get: {
        summary: 'Detail nasabah',
        security: bearer,
        responses: { 200: { description: 'Detail nasabah' }, 404: galatResponse },
      },
      patch: {
        summary: 'Ubah nasabah',
        security: bearer,
        requestBody: badan(ubahNasabah),
        responses: { 200: { description: 'Nasabah diperbarui' }, 404: galatResponse },
      },
      delete: {
        summary: 'Hapus nasabah, hanya peran pengurus',
        security: bearer,
        responses: {
          204: { description: 'Nasabah dihapus' },
          403: galatResponse,
          409: galatResponse,
        },
      },
    },
    '/kategori-sampah': {
      get: {
        summary: 'Daftar kategori sampah',
        security: bearer,
        parameters: [
          { name: 'aktif', in: 'query', schema: { type: 'string', enum: ['semua'] } },
        ],
        responses: { 200: { description: 'Daftar kategori' } },
      },
      post: {
        summary: 'Tambah kategori sampah',
        security: bearer,
        requestBody: badan(buatKategori),
        responses: {
          201: { description: 'Kategori baru dibuat' },
          409: galatResponse,
        },
      },
    },
    '/kategori-sampah/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      patch: {
        summary: 'Ubah kategori sampah, termasuk menonaktifkan',
        security: bearer,
        requestBody: badan(ubahKategori),
        responses: { 200: { description: 'Kategori diperbarui' }, 404: galatResponse },
      },
    },
  },
} as const;
