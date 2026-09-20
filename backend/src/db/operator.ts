import type { Basis } from './koneksi.js';

export interface BarisOperator {
  id_operator: string;
  nama: string;
  username: string;
  password_hash: string;
  peran: 'operator' | 'pengurus';
}

export async function ambilOperatorBerdasarUsername(
  basis: Basis,
  username: string,
): Promise<BarisOperator | null> {
  const hasil = await basis.kueri<BarisOperator>(
    `SELECT id_operator, nama, username, password_hash, peran
       FROM operator WHERE lower(username) = lower($1)`,
    [username],
  );
  return hasil.rows[0] ?? null;
}
