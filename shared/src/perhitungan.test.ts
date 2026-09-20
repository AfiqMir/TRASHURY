import { describe, expect, it } from 'vitest';
import { bulatkanCo2e, bulatkanRupiah, hitungSetoran, saldoMencukupi } from './perhitungan.js';

describe('pembulatan rupiah', () => {
  it('membulatkan setengah ke atas', () => {
    expect(bulatkanRupiah(2999.5)).toBe(3000);
    expect(bulatkanRupiah(2999.49)).toBe(2999);
  });

  it('tidak menghasilkan pecahan', () => {
    expect(Number.isInteger(bulatkanRupiah(1.7 * 3000))).toBe(true);
  });
});

describe('pembulatan co2e', () => {
  it('menyisakan empat angka di belakang koma', () => {
    expect(bulatkanCo2e(1.23456)).toBe(1.2346);
  });
});

describe('hitung setoran', () => {
  it('menjumlahkan subtotal seluruh baris', () => {
    const hasil = hitungSetoran([
      { berat_kg: 3, harga_per_kg: 3000, faktor_co2e_per_kg: 1.5 },
      { berat_kg: 1.5, harga_per_kg: 2000, faktor_co2e_per_kg: 0.8 },
    ]);
    expect(hasil.baris[0]).toEqual({ subtotal_harga: 9000, subtotal_co2e: 4.5 });
    expect(hasil.baris[1]).toEqual({ subtotal_harga: 3000, subtotal_co2e: 1.2 });
    expect(hasil.total_nominal).toBe(12000);
    expect(hasil.total_co2e).toBe(5.7);
  });

  it('menghasilkan nol untuk daftar kosong', () => {
    const hasil = hitungSetoran([]);
    expect(hasil.total_nominal).toBe(0);
    expect(hasil.total_co2e).toBe(0);
  });

  it('tidak terpengaruh galat pecahan biner', () => {
    const hasil = hitungSetoran([
      { berat_kg: 0.1, harga_per_kg: 3000, faktor_co2e_per_kg: 0.1 },
      { berat_kg: 0.2, harga_per_kg: 3000, faktor_co2e_per_kg: 0.2 },
    ]);
    expect(hasil.total_nominal).toBe(900);
    expect(hasil.total_co2e).toBe(0.05);
  });
});

describe('aturan saldo', () => {
  it('menolak penarikan melebihi saldo', () => {
    expect(saldoMencukupi(5000, 7000)).toBe(false);
    expect(saldoMencukupi(5000, 5000)).toBe(true);
    expect(saldoMencukupi(5000, 0)).toBe(false);
  });
});
