import type { Basis } from './koneksi.js';

export interface BarisBuku {
  tanggal: string;
  jenis: 'setoran' | 'penarikan';
  nominal: number;
  co2e: number;
  id_acuan: string;
}

export interface RingkasanSaldo {
  id_nasabah: string;
  nama: string;
  total_saldo: number;
  total_co2e: number;
  diperbarui_pada: string;
}

export async function ringkasanSaldo(
  basis: Basis,
  idNasabah: string,
): Promise<RingkasanSaldo | null> {
  const hasil = await basis.kueri<RingkasanSaldo>(
    `SELECT n.id_nasabah, n.nama, n.total_saldo::int AS total_saldo,
            coalesce((SELECT sum(total_co2e) FROM transaksi WHERE id_nasabah = n.id_nasabah), 0)::float8
              AS total_co2e,
            to_char(n.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
              AS diperbarui_pada
       FROM nasabah n
      WHERE n.id_nasabah = $1`,
    [idNasabah],
  );
  return hasil.rows[0] ?? null;
}

export async function bukuTabungan(
  basis: Basis,
  opsi: { idNasabah: string; dari?: string; sampai?: string; halaman: number; perHalaman: number },
): Promise<{ baris: BarisBuku[]; total: number }> {
  const saring = `WHERE id_nasabah = $1
        AND ($2::timestamptz IS NULL OR tanggal >= $2)
        AND ($3::timestamptz IS NULL OR tanggal <= $3)`;
  const params = [opsi.idNasabah, opsi.dari ?? null, opsi.sampai ?? null];

  const daftar = await basis.kueri<BarisBuku>(
    `SELECT to_char(tanggal at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS tanggal,
            jenis, nominal::int AS nominal, co2e::float8 AS co2e, id_acuan
       FROM v_buku_tabungan ${saring}
      ORDER BY tanggal DESC LIMIT $4 OFFSET $5`,
    [...params, opsi.perHalaman, (opsi.halaman - 1) * opsi.perHalaman],
  );
  const jumlah = await basis.kueri<{ total: string }>(
    `SELECT count(*)::text AS total FROM v_buku_tabungan ${saring}`,
    params,
  );
  return { baris: daftar.rows, total: Number(jumlah.rows[0]?.total ?? 0) };
}
