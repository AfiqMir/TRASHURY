import { describe, expect, it } from 'vitest';
import {
  type DataHistorisBulanan,
  hitungRegresiLinear,
  holtLinearSmoothing,
  ramalVolumeSetoran,
  tambahBulan,
} from './forecasting.js';

describe('Forecasting Module', () => {
  it('menghitung penambahan bulan dengan benar', () => {
    expect(tambahBulan('2026-08', 1)).toBe('2026-09');
    expect(tambahBulan('2026-11', 2)).toBe('2027-01');
    expect(tambahBulan('2026-12', 1)).toBe('2027-01');
  });

  it('menghitung regresi linear sederhana untuk tren naik', () => {
    // Data naik stabil: 100, 150, 200, 250
    const data = [100, 150, 200, 250];
    const { slope, intercept, r2 } = hitungRegresiLinear(data);

    expect(slope).toBeCloseTo(50, 2);
    expect(intercept).toBeCloseTo(100, 2);
    expect(r2).toBeCloseTo(1, 2);
  });

  it('melakukan Holt Linear Smoothing pada data historis', () => {
    const data = [120, 140, 165, 190, 210];
    const { prediksi, rmse } = holtLinearSmoothing(data, 3);

    expect(prediksi).toHaveLength(3);
    expect(prediksi[0]).toBeGreaterThan(data[data.length - 1]!);
    expect(prediksi[1]).toBeGreaterThan(prediksi[0]!);
    expect(prediksi[2]).toBeGreaterThan(prediksi[1]!);
    expect(rmse).toBeGreaterThanOrEqual(0);
  });

  it('meramalkan volume setoran, estimasi kas uang, dan estimasi CO2e', () => {
    const historis: DataHistorisBulanan[] = [
      { bulan: '2026-05', total_berat_kg: 200 },
      { bulan: '2026-06', total_berat_kg: 240 },
      { bulan: '2026-07', total_berat_kg: 290 },
      { bulan: '2026-08', total_berat_kg: 330 },
    ];

    const hasil = ramalVolumeSetoran(historis, {
      namaKategori: 'Botol Plastik (PET)',
      hargaPerKg: 3500,
      faktorCo2ePerKg: 2.1,
      jumlahBulanKedepan: 3,
    });

    expect(hasil.nama_kategori).toBe('Botol Plastik (PET)');
    expect(hasil.metode).toBe('holt_linear');
    expect(hasil.proyeksi).toHaveLength(3);
    expect(hasil.proyeksi[0]?.bulan).toBe('2026-09');
    expect(hasil.proyeksi[1]?.bulan).toBe('2026-10');
    expect(hasil.proyeksi[2]?.bulan).toBe('2026-11');

    // Pastikan nilai uang dan CO2e terhitung
    expect(hasil.proyeksi[0]?.estimasi_nilai_rupiah).toBeGreaterThan(0);
    expect(hasil.proyeksi[0]?.estimasi_co2e_kg).toBeGreaterThan(0);
    expect(hasil.total_prediksi_berat_kg).toBeGreaterThan(0);
    expect(hasil.tren_persen_per_bulan).toBeGreaterThan(0);
  });

  it('menangani data kosong dan data sedikit (<3 bulan) dengan aman', () => {
    const hasilKosong = ramalVolumeSetoran([], {
      namaKategori: 'Kardus',
      hargaPerKg: 1500,
      faktorCo2ePerKg: 1.1,
    });
    expect(hasilKosong.proyeksi).toHaveLength(0);
    expect(hasilKosong.total_prediksi_berat_kg).toBe(0);

    const hasil1Bulan = ramalVolumeSetoran(
      [{ bulan: '2026-08', total_berat_kg: 100 }],
      {
        namaKategori: 'Kardus',
        hargaPerKg: 1500,
        faktorCo2ePerKg: 1.1,
        jumlahBulanKedepan: 2,
      }
    );
    expect(hasil1Bulan.metode).toBe('moving_average');
    expect(hasil1Bulan.proyeksi).toHaveLength(2);
    expect(hasil1Bulan.proyeksi[0]?.prediksi_berat_kg).toBe(100);
  });
});
