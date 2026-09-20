import type { Basis } from './koneksi.js';

export interface BarisKategori {
  id_kategori: string;
  nama_kategori: string;
  harga_per_kg: number;
  faktor_co2e_per_kg: number;
  aktif: boolean;
}

const KOLOM = `id_kategori, nama_kategori, harga_per_kg::int AS harga_per_kg,
  faktor_co2e_per_kg::float8 AS faktor_co2e_per_kg, aktif`;

export async function daftarKategori(basis: Basis, sertakanNonaktif: boolean) {
  const hasil = await basis.kueri<BarisKategori>(
    `SELECT ${KOLOM} FROM kategori_sampah
      WHERE $1::boolean OR aktif
      ORDER BY nama_kategori`,
    [sertakanNonaktif],
  );
  return hasil.rows;
}

export async function ambilKategori(basis: Basis, id: string): Promise<BarisKategori | null> {
  const hasil = await basis.kueri<BarisKategori>(
    `SELECT ${KOLOM} FROM kategori_sampah WHERE id_kategori = $1`,
    [id],
  );
  return hasil.rows[0] ?? null;
}

export async function ambilKategoriBerdasarNama(
  basis: Basis,
  nama: string,
): Promise<BarisKategori | null> {
  const hasil = await basis.kueri<BarisKategori>(
    `SELECT ${KOLOM} FROM kategori_sampah WHERE lower(nama_kategori) = lower($1)`,
    [nama],
  );
  return hasil.rows[0] ?? null;
}

export async function simpanKategori(
  basis: Basis,
  data: {
    id_kategori?: string;
    nama_kategori: string;
    harga_per_kg: number;
    faktor_co2e_per_kg: number;
    aktif?: boolean;
  },
): Promise<{ baris: BarisKategori; baru: boolean }> {
  const hasil = await basis.kueri<BarisKategori>(
    `INSERT INTO kategori_sampah (id_kategori, nama_kategori, harga_per_kg, faktor_co2e_per_kg, aktif)
       VALUES (coalesce($1::uuid, gen_random_uuid()), $2, $3, $4, coalesce($5, true))
     ON CONFLICT (id_kategori) DO NOTHING
     RETURNING ${KOLOM}`,
    [
      data.id_kategori ?? null,
      data.nama_kategori,
      data.harga_per_kg,
      data.faktor_co2e_per_kg,
      data.aktif ?? null,
    ],
  );

  const baris = hasil.rows[0];
  if (baris) return { baris, baru: true };

  const tersimpan = await ambilKategori(basis, data.id_kategori as string);
  return { baris: tersimpan as BarisKategori, baru: false };
}

export async function ubahKategori(
  basis: Basis,
  id: string,
  data: {
    nama_kategori?: string;
    harga_per_kg?: number;
    faktor_co2e_per_kg?: number;
    aktif?: boolean;
  },
): Promise<BarisKategori | null> {
  const hasil = await basis.kueri<BarisKategori>(
    `UPDATE kategori_sampah SET
        nama_kategori      = coalesce($2, nama_kategori),
        harga_per_kg       = coalesce($3, harga_per_kg),
        faktor_co2e_per_kg = coalesce($4, faktor_co2e_per_kg),
        aktif              = coalesce($5, aktif)
      WHERE id_kategori = $1
      RETURNING ${KOLOM}`,
    [
      id,
      data.nama_kategori ?? null,
      data.harga_per_kg ?? null,
      data.faktor_co2e_per_kg ?? null,
      data.aktif ?? null,
    ],
  );
  return hasil.rows[0] ?? null;
}
