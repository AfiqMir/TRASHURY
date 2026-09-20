import { hitungSetoran } from '@trashury/shared';
import type { Basis } from './koneksi.js';

export interface BarisDetail {
  id_detail: string;
  id_kategori: string;
  nama_kategori: string;
  berat_kg: number;
  url_foto_sampah: string | null;
  sumber_klasifikasi: 'ai' | 'manual';
  subtotal_harga: number;
  subtotal_co2e: number;
}

export interface BarisTransaksi {
  id_transaksi: string;
  id_nasabah: string;
  id_operator: string;
  tanggal: string;
  jenis_transaksi: string;
  total_nominal: number;
  total_co2e: number;
  detail: BarisDetail[];
}

export interface PermintaanDetail {
  id_detail?: string;
  id_kategori: string;
  berat_kg: number;
  url_foto_sampah?: string | null;
  sumber_klasifikasi?: 'ai' | 'manual';
}

const KOLOM_TRANSAKSI = `id_transaksi, id_nasabah, id_operator,
  to_char(tanggal at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS tanggal,
  jenis_transaksi, total_nominal::int AS total_nominal, total_co2e::float8 AS total_co2e`;

const KOLOM_DETAIL = `d.id_detail, d.id_kategori, k.nama_kategori,
  d.berat_kg::float8 AS berat_kg, d.url_foto_sampah, d.sumber_klasifikasi,
  d.subtotal_harga::int AS subtotal_harga, d.subtotal_co2e::float8 AS subtotal_co2e`;

async function ambilDetail(basis: Basis, idTransaksi: string): Promise<BarisDetail[]> {
  const hasil = await basis.kueri<BarisDetail>(
    `SELECT ${KOLOM_DETAIL}
       FROM detail_transaksi d
       JOIN kategori_sampah k ON k.id_kategori = d.id_kategori
      WHERE d.id_transaksi = $1
      ORDER BY k.nama_kategori`,
    [idTransaksi],
  );
  return hasil.rows;
}

export async function ambilTransaksi(
  basis: Basis,
  id: string,
): Promise<BarisTransaksi | null> {
  const hasil = await basis.kueri<Omit<BarisTransaksi, 'detail'>>(
    `SELECT ${KOLOM_TRANSAKSI} FROM transaksi WHERE id_transaksi = $1`,
    [id],
  );
  const baris = hasil.rows[0];
  if (!baris) return null;
  return { ...baris, detail: await ambilDetail(basis, id) };
}

export async function cariTransaksi(
  basis: Basis,
  opsi: { idNasabah?: string; dari?: string; sampai?: string; halaman: number; perHalaman: number },
): Promise<{ baris: BarisTransaksi[]; total: number }> {
  const saring = `WHERE ($1::uuid IS NULL OR id_nasabah = $1)
        AND ($2::timestamptz IS NULL OR tanggal >= $2)
        AND ($3::timestamptz IS NULL OR tanggal <= $3)`;
  const params = [opsi.idNasabah ?? null, opsi.dari ?? null, opsi.sampai ?? null];

  const daftar = await basis.kueri<Omit<BarisTransaksi, 'detail'>>(
    `SELECT ${KOLOM_TRANSAKSI} FROM transaksi ${saring}
      ORDER BY tanggal DESC LIMIT $4 OFFSET $5`,
    [...params, opsi.perHalaman, (opsi.halaman - 1) * opsi.perHalaman],
  );
  const jumlah = await basis.kueri<{ total: string }>(
    `SELECT count(*)::text AS total FROM transaksi ${saring}`,
    params,
  );

  const baris: BarisTransaksi[] = [];
  for (const t of daftar.rows) {
    baris.push({ ...t, detail: await ambilDetail(basis, t.id_transaksi) });
  }
  return { baris, total: Number(jumlah.rows[0]?.total ?? 0) };
}

export type HasilSimpanTransaksi =
  | { keadaan: 'dibuat' | 'sudah_ada'; transaksi: BarisTransaksi }
  | { keadaan: 'nasabah_tidak_ada' }
  | { keadaan: 'kategori_tidak_aktif'; idKategori: string };

export async function simpanTransaksi(
  basis: Basis,
  data: {
    id_transaksi: string;
    id_nasabah: string;
    id_operator: string;
    tanggal: string;
    detail: PermintaanDetail[];
  },
): Promise<HasilSimpanTransaksi> {
  return basis.dalamTransaksi(async (trx) => {
    const tersimpan = await ambilTransaksi(trx, data.id_transaksi);
    if (tersimpan) return { keadaan: 'sudah_ada', transaksi: tersimpan };

    const nasabah = await trx.kueri<{ id_nasabah: string }>(
      'SELECT id_nasabah FROM nasabah WHERE id_nasabah = $1 FOR UPDATE',
      [data.id_nasabah],
    );
    if (nasabah.rows.length === 0) return { keadaan: 'nasabah_tidak_ada' };

    const kategori = await trx.kueri<{
      id_kategori: string;
      harga_per_kg: number;
      faktor_co2e_per_kg: number;
    }>(
      `SELECT id_kategori, harga_per_kg::int AS harga_per_kg,
              faktor_co2e_per_kg::float8 AS faktor_co2e_per_kg
         FROM kategori_sampah
        WHERE id_kategori = ANY($1::uuid[]) AND aktif`,
      [data.detail.map((d) => d.id_kategori)],
    );
    const peta = new Map(kategori.rows.map((k) => [k.id_kategori, k]));

    for (const d of data.detail) {
      if (!peta.has(d.id_kategori)) {
        return { keadaan: 'kategori_tidak_aktif', idKategori: d.id_kategori };
      }
    }

    const hitungan = hitungSetoran(
      data.detail.map((d) => {
        const k = peta.get(d.id_kategori)!;
        return {
          berat_kg: d.berat_kg,
          harga_per_kg: k.harga_per_kg,
          faktor_co2e_per_kg: k.faktor_co2e_per_kg,
        };
      }),
    );

    await trx.kueri(
      `INSERT INTO transaksi (id_transaksi, id_nasabah, id_operator, tanggal,
                              total_nominal, total_co2e)
         VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        data.id_transaksi,
        data.id_nasabah,
        data.id_operator,
        data.tanggal,
        hitungan.total_nominal,
        hitungan.total_co2e,
      ],
    );

    for (const [urutan, d] of data.detail.entries()) {
      const hasil = hitungan.baris[urutan]!;
      await trx.kueri(
        `INSERT INTO detail_transaksi (id_detail, id_transaksi, id_kategori, berat_kg,
                                       url_foto_sampah, sumber_klasifikasi,
                                       subtotal_harga, subtotal_co2e)
           VALUES (coalesce($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8)`,
        [
          d.id_detail ?? null,
          data.id_transaksi,
          d.id_kategori,
          d.berat_kg,
          d.url_foto_sampah ?? null,
          d.sumber_klasifikasi ?? 'manual',
          hasil.subtotal_harga,
          hasil.subtotal_co2e,
        ],
      );
    }

    const dibuat = await ambilTransaksi(trx, data.id_transaksi);
    return { keadaan: 'dibuat', transaksi: dibuat as BarisTransaksi };
  });
}
