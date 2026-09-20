import type { BarisSetoran, HasilBarisSetoran, HasilSetoran } from './tipe.js';

const DESIMAL_CO2E = 4;

export function bulatkanRupiah(nilai: number): number {
  return Math.floor(nilai + 0.5);
}

export function bulatkanCo2e(nilai: number): number {
  const faktor = 10 ** DESIMAL_CO2E;
  return Math.floor(nilai * faktor + 0.5) / faktor;
}

export function hitungBaris(baris: BarisSetoran): HasilBarisSetoran {
  return {
    subtotal_harga: bulatkanRupiah(baris.berat_kg * baris.harga_per_kg),
    subtotal_co2e: bulatkanCo2e(baris.berat_kg * baris.faktor_co2e_per_kg),
  };
}

export function hitungSetoran(barisSetoran: BarisSetoran[]): HasilSetoran {
  const baris = barisSetoran.map(hitungBaris);
  const total_nominal = baris.reduce((jumlah, b) => jumlah + b.subtotal_harga, 0);
  const total_co2e = bulatkanCo2e(baris.reduce((jumlah, b) => jumlah + b.subtotal_co2e, 0));
  return {
    baris,
    total_nominal,
    total_co2e,
    subtotal_harga: total_nominal,
    subtotal_co2e: total_co2e,
  };
}

export function saldoMencukupi(totalSaldo: number, jumlahTarik: number): boolean {
  return jumlahTarik > 0 && jumlahTarik <= totalSaldo;
}

export function saldoSetelahPenarikan(totalSaldo: number, jumlahTarik: number): number {
  return totalSaldo - jumlahTarik;
}
