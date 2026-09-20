import type { Basis } from './koneksi.js';

export interface BarisNasabah {
  id_nasabah: string;
  nama: string;
  nomor_hp: string | null;
  alamat: string | null;
  total_saldo: number;
  created_at: string;
  updated_at: string;
}

const KOLOM = `id_nasabah, nama, nomor_hp, alamat, total_saldo::int AS total_saldo,
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at`;

export async function cariNasabah(
  basis: Basis,
  opsi: { q?: string; halaman: number; perHalaman: number },
): Promise<{ baris: BarisNasabah[]; total: number }> {
  const pola = opsi.q ? `%${opsi.q}%` : null;
  const daftar = await basis.kueri<BarisNasabah>(
    `SELECT ${KOLOM} FROM nasabah
      WHERE $1::text IS NULL OR nama ILIKE $1 OR nomor_hp ILIKE $1
      ORDER BY nama
      LIMIT $2 OFFSET $3`,
    [pola, opsi.perHalaman, (opsi.halaman - 1) * opsi.perHalaman],
  );
  const jumlah = await basis.kueri<{ total: string }>(
    `SELECT count(*)::text AS total FROM nasabah
      WHERE $1::text IS NULL OR nama ILIKE $1 OR nomor_hp ILIKE $1`,
    [pola],
  );
  return { baris: daftar.rows, total: Number(jumlah.rows[0]?.total ?? 0) };
}

export async function ambilNasabah(basis: Basis, id: string): Promise<BarisNasabah | null> {
  const hasil = await basis.kueri<BarisNasabah>(
    `SELECT ${KOLOM} FROM nasabah WHERE id_nasabah = $1`,
    [id],
  );
  return hasil.rows[0] ?? null;
}

export async function simpanNasabah(
  basis: Basis,
  data: { id_nasabah?: string; nama: string; nomor_hp?: string | null; alamat?: string | null },
): Promise<{ baris: BarisNasabah; baru: boolean }> {
  const hasil = await basis.kueri<BarisNasabah & { baru: boolean }>(
    `INSERT INTO nasabah (id_nasabah, nama, nomor_hp, alamat)
       VALUES (coalesce($1::uuid, gen_random_uuid()), $2, $3, $4)
     ON CONFLICT (id_nasabah) DO NOTHING
     RETURNING ${KOLOM}, true AS baru`,
    [data.id_nasabah ?? null, data.nama, data.nomor_hp ?? null, data.alamat ?? null],
  );

  const baris = hasil.rows[0];
  if (baris) return { baris, baru: true };

  const tersimpan = await ambilNasabah(basis, data.id_nasabah as string);
  return { baris: tersimpan as BarisNasabah, baru: false };
}

export async function ubahNasabah(
  basis: Basis,
  id: string,
  data: { nama?: string; nomor_hp?: string | null; alamat?: string | null },
): Promise<BarisNasabah | null> {
  const hasil = await basis.kueri<BarisNasabah>(
    `UPDATE nasabah SET
        nama     = coalesce($2, nama),
        nomor_hp = CASE WHEN $3::boolean THEN $4 ELSE nomor_hp END,
        alamat   = CASE WHEN $5::boolean THEN $6 ELSE alamat END
      WHERE id_nasabah = $1
      RETURNING ${KOLOM}`,
    [
      id,
      data.nama ?? null,
      Object.hasOwn(data, 'nomor_hp'),
      data.nomor_hp ?? null,
      Object.hasOwn(data, 'alamat'),
      data.alamat ?? null,
    ],
  );
  return hasil.rows[0] ?? null;
}

export async function nasabahPunyaRiwayat(basis: Basis, id: string): Promise<boolean> {
  const hasil = await basis.kueri<{ ada: boolean }>(
    `SELECT EXISTS (
        SELECT 1 FROM transaksi WHERE id_nasabah = $1
        UNION ALL
        SELECT 1 FROM penarikan_saldo WHERE id_nasabah = $1
      ) AS ada`,
    [id],
  );
  return hasil.rows[0]?.ada ?? false;
}

export async function hapusNasabah(basis: Basis, id: string): Promise<boolean> {
  const hasil = await basis.kueri<{ id_nasabah: string }>(
    'DELETE FROM nasabah WHERE id_nasabah = $1 RETURNING id_nasabah',
    [id],
  );
  return hasil.rows.length > 0;
}
