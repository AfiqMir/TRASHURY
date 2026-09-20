import { saldoMencukupi, saldoSetelahPenarikan } from '@trashury/shared';
import type { Basis } from './koneksi.js';

export interface BarisPenarikan {
  id_penarikan: string;
  id_nasabah: string;
  id_operator: string;
  tanggal: string;
  jumlah_tarik: number;
  saldo_sisa: number;
}

const KOLOM = `id_penarikan, id_nasabah, id_operator,
  to_char(tanggal at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS tanggal,
  jumlah_tarik::int AS jumlah_tarik, saldo_sisa::int AS saldo_sisa`;

export async function ambilPenarikan(
  basis: Basis,
  id: string,
): Promise<BarisPenarikan | null> {
  const hasil = await basis.kueri<BarisPenarikan>(
    `SELECT ${KOLOM} FROM penarikan_saldo WHERE id_penarikan = $1`,
    [id],
  );
  return hasil.rows[0] ?? null;
}

export type HasilSimpanPenarikan =
  | { keadaan: 'dibuat' | 'sudah_ada'; penarikan: BarisPenarikan }
  | { keadaan: 'nasabah_tidak_ada' }
  | { keadaan: 'saldo_kurang'; saldoTersedia: number };

export async function simpanPenarikan(
  basis: Basis,
  data: {
    id_penarikan: string;
    id_nasabah: string;
    id_operator: string;
    tanggal: string;
    jumlah_tarik: number;
  },
): Promise<HasilSimpanPenarikan> {
  return basis.dalamTransaksi(async (trx) => {
    const nasabah = await trx.kueri<{ total_saldo: number }>(
      'SELECT total_saldo::int AS total_saldo FROM nasabah WHERE id_nasabah = $1 FOR UPDATE',
      [data.id_nasabah],
    );
    const saldo = nasabah.rows[0]?.total_saldo;
    if (saldo === undefined) return { keadaan: 'nasabah_tidak_ada' };

    const tersimpan = await ambilPenarikan(trx, data.id_penarikan);
    if (tersimpan) return { keadaan: 'sudah_ada', penarikan: tersimpan };

    if (!saldoMencukupi(saldo, data.jumlah_tarik)) {
      return { keadaan: 'saldo_kurang', saldoTersedia: saldo };
    }

    await trx.kueri(
      `INSERT INTO penarikan_saldo (id_penarikan, id_nasabah, id_operator, tanggal,
                                    jumlah_tarik, saldo_sisa)
         VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        data.id_penarikan,
        data.id_nasabah,
        data.id_operator,
        data.tanggal,
        data.jumlah_tarik,
        saldoSetelahPenarikan(saldo, data.jumlah_tarik),
      ],
    );

    const dibuat = await ambilPenarikan(trx, data.id_penarikan);
    return { keadaan: 'dibuat', penarikan: dibuat as BarisPenarikan };
  });
}
