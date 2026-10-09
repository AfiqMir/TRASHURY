import type { RekapBulanan } from '../db/laporan.js';

const BOM = '﻿';

const KOLOM = [
  'bulan',
  'nama_kategori',
  'jumlah_setoran',
  'total_berat_kg',
  'total_nilai_rupiah',
  'total_co2e_kg',
] as const;

function sel(nilai: string | number): string {
  let teks = String(nilai);
  if (typeof nilai === 'string' && /^[=+\-@\t\r]/.test(teks)) teks = `'${teks}`;
  return /[",\r\n]/.test(teks) ? `"${teks.replace(/"/g, '""')}"` : teks;
}

function baris(nilai: (string | number)[]): string {
  return nilai.map(sel).join(',');
}

export function rekapKeCsv(rekap: RekapBulanan): string {
  const isi = rekap.per_kategori.map((k) =>
    baris([
      rekap.bulan,
      k.nama_kategori,
      k.jumlah_setoran,
      k.total_berat_kg.toFixed(2),
      k.total_nilai_rupiah,
      k.total_co2e_kg.toFixed(4),
    ]),
  );
  const r = rekap.ringkasan;
  const total = baris([
    rekap.bulan,
    'TOTAL',
    r.jumlah_setoran,
    r.total_berat_kg.toFixed(2),
    r.total_nilai_rupiah,
    r.total_co2e_kg.toFixed(4),
  ]);

  return BOM + [KOLOM.join(','), ...isi, total].join('\r\n') + '\r\n';
}
