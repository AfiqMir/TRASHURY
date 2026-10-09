import type { Basis } from './koneksi.js';

export const ZONA_LAPORAN = 'Asia/Jakarta';

export interface RekapKategori {
  nama_kategori: string;
  jumlah_setoran: number;
  total_berat_kg: number;
  total_nilai_rupiah: number;
  total_co2e_kg: number;
}

export interface RingkasanBulanan {
  jumlah_setoran: number;
  jumlah_nasabah_menyetor: number;
  total_berat_kg: number;
  total_nilai_rupiah: number;
  total_co2e_kg: number;
  jumlah_penarikan: number;
  total_penarikan_rupiah: number;
}

export interface RekapBulanan {
  bulan: string;
  zona_waktu: string;
  dari: string;
  sampai: string;
  ringkasan: RingkasanBulanan;
  per_kategori: RekapKategori[];
  dibuat_pada: string;
}

const FORMAT_ISO = `'YYYY-MM-DD"T"HH24:MI:SS"Z"'`;

const RENTANG = `rentang AS (
    SELECT ($1 || '-01')::timestamp AT TIME ZONE '${ZONA_LAPORAN}' AS dari,
           (($1 || '-01')::timestamp + interval '1 month') AT TIME ZONE '${ZONA_LAPORAN}' AS sampai
  )`;

export async function rekapBulanan(basis: Basis, bulan: string): Promise<RekapBulanan> {
  const kepala = await basis.kueri<
    RingkasanBulanan & { dari: string; sampai: string; dibuat_pada: string }
  >(
    `WITH ${RENTANG},
     setoran AS (
       SELECT t.* FROM transaksi t, rentang r
        WHERE t.tanggal >= r.dari AND t.tanggal < r.sampai
     ),
     tarik AS (
       SELECT p.* FROM penarikan_saldo p, rentang r
        WHERE p.tanggal >= r.dari AND p.tanggal < r.sampai
     )
     SELECT to_char(r.dari at time zone 'UTC', ${FORMAT_ISO}) AS dari,
            to_char(r.sampai at time zone 'UTC', ${FORMAT_ISO}) AS sampai,
            to_char(now() at time zone 'UTC', ${FORMAT_ISO}) AS dibuat_pada,
            (SELECT count(*) FROM setoran)::int AS jumlah_setoran,
            (SELECT count(DISTINCT id_nasabah) FROM setoran)::int AS jumlah_nasabah_menyetor,
            (SELECT coalesce(round(sum(d.berat_kg), 2), 0)
               FROM detail_transaksi d JOIN setoran s ON s.id_transaksi = d.id_transaksi
            )::float8 AS total_berat_kg,
            (SELECT coalesce(sum(total_nominal), 0) FROM setoran)::float8 AS total_nilai_rupiah,
            (SELECT coalesce(round(sum(total_co2e), 4), 0) FROM setoran)::float8 AS total_co2e_kg,
            (SELECT count(*) FROM tarik)::int AS jumlah_penarikan,
            (SELECT coalesce(sum(jumlah_tarik), 0) FROM tarik)::float8 AS total_penarikan_rupiah
       FROM rentang r`,
    [bulan],
  );

  const perKategori = await basis.kueri<RekapKategori>(
    `WITH ${RENTANG}
     SELECT k.nama_kategori,
            count(DISTINCT t.id_transaksi)::int AS jumlah_setoran,
            round(sum(d.berat_kg), 2)::float8 AS total_berat_kg,
            sum(d.subtotal_harga)::float8 AS total_nilai_rupiah,
            round(sum(d.subtotal_co2e), 4)::float8 AS total_co2e_kg
       FROM rentang r
       JOIN transaksi t ON t.tanggal >= r.dari AND t.tanggal < r.sampai
       JOIN detail_transaksi d ON d.id_transaksi = t.id_transaksi
       JOIN kategori_sampah k ON k.id_kategori = d.id_kategori
      GROUP BY k.nama_kategori
      ORDER BY k.nama_kategori`,
    [bulan],
  );

  const { dari, sampai, dibuat_pada, ...ringkasan } = kepala.rows[0]!;
  return {
    bulan,
    zona_waktu: ZONA_LAPORAN,
    dari,
    sampai,
    ringkasan,
    per_kategori: perKategori.rows,
    dibuat_pada,
  };
}
