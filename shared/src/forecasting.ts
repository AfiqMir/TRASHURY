import { bulatkanCo2e, bulatkanRupiah } from './perhitungan.js';

export interface DataHistorisBulanan {
  bulan: string; // format "YYYY-MM", contoh "2026-08"
  total_berat_kg: number;
  total_nilai_rupiah?: number;
  total_co2e_kg?: number;
}

export interface HasilPrediksiBulan {
  bulan: string; // format "YYYY-MM"
  prediksi_berat_kg: number;
  batas_bawah_kg: number;
  batas_atas_kg: number;
  estimasi_nilai_rupiah: number;
  estimasi_co2e_kg: number;
}

export interface HasilForecastingKategori {
  nama_kategori: string;
  metode: 'holt_linear' | 'linear_regression' | 'moving_average';
  proyeksi: HasilPrediksiBulan[];
  total_prediksi_berat_kg: number;
  total_estimasi_rupiah: number;
  total_estimasi_co2e: number;
  tren_persen_per_bulan: number;
}

/**
 * Menghitung bulan berikutnya dalam format YYYY-MM
 */
export function tambahBulan(bulanStr: string, jumlahBulan: number): string {
  const [tahunStr, bulanNumStr] = bulanStr.split('-');
  const tahun = parseInt(tahunStr ?? '2026', 10);
  const bulan = parseInt(bulanNumStr ?? '1', 10);

  const tanggal = new Date(Date.UTC(tahun, bulan - 1 + jumlahBulan, 1));
  const th = tanggal.getUTCFullYear();
  const bl = String(tanggal.getUTCMonth() + 1).padStart(2, '0');
  return `${th}-${bl}`;
}

/**
 * Regresi Linear Sederhana untuk menangkap arah tren pertumbuhan (slope & intercept)
 */
export function hitungRegresiLinear(nilai: number[]): { slope: number; intercept: number; r2: number } {
  const n = nilai.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
  if (n === 1) return { slope: 0, intercept: nilai[0]!, r2: 1 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = nilai[i]!;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Hitung R-squared
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const y = nilai[i]!;
    const yPred = intercept + slope * i;
    ssTot += (y - meanY) ** 2;
    ssRes += (y - yPred) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { slope, intercept, r2 };
}

/**
 * Holt's Linear Exponential Smoothing
 * Menghitung Level (L) dan Trend (T) untuk prediksi data deret waktu jangka pendek (1-3 bulan)
 */
export function holtLinearSmoothing(
  deret: number[],
  langkahMasaDepan = 3,
  alpha = 0.5,
  beta = 0.3
): { prediksi: number[]; rmse: number } {
  const n = deret.length;
  if (n === 0) return { prediksi: new Array(langkahMasaDepan).fill(0), rmse: 0 };
  if (n === 1) return { prediksi: new Array(langkahMasaDepan).fill(deret[0]!), rmse: 0 };

  let level = deret[0]!;
  let trend = deret[1]! - deret[0]!;
  const fitted: number[] = [level];

  for (let t = 1; t < n; t++) {
    const prevLevel = level;
    const prevTrend = trend;
    const actual = deret[t]!;

    level = alpha * actual + (1 - alpha) * (prevLevel + prevTrend);
    trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;

    fitted.push(prevLevel + prevTrend);
  }

  // Hitung Root Mean Square Error (RMSE)
  let sumSquaredError = 0;
  for (let t = 1; t < n; t++) {
    sumSquaredError += (deret[t]! - fitted[t]!) ** 2;
  }
  const rmse = Math.sqrt(sumSquaredError / Math.max(1, n - 1));

  // Buat proyeksi ke depan
  const prediksi: number[] = [];
  for (let h = 1; h <= langkahMasaDepan; h++) {
    const pred = Math.max(0, level + h * trend);
    prediksi.push(Math.round(pred * 10) / 10);
  }

  return { prediksi, rmse };
}

/**
 * Fungsi Utama Peramalan Volume Setoran Sampah (Forecasting Engine)
 * Menggunakan perpaduan Holt's Smoothing dan Regresi Linear untuk estimasi beban gudang, dana kas, dan CO2e.
 */
export function ramalVolumeSetoran(
  dataHistoris: DataHistorisBulanan[],
  opsi: {
    namaKategori: string;
    hargaPerKg: number;
    faktorCo2ePerKg: number;
    jumlahBulanKedepan?: number;
  }
): HasilForecastingKategori {
  const { namaKategori, hargaPerKg, faktorCo2ePerKg, jumlahBulanKedepan = 3 } = opsi;

  if (dataHistoris.length === 0) {
    return {
      nama_kategori: namaKategori,
      metode: 'moving_average',
      proyeksi: [],
      total_prediksi_berat_kg: 0,
      total_estimasi_rupiah: 0,
      total_estimasi_co2e: 0,
      tren_persen_per_bulan: 0,
    };
  }

  // Urutkan data berdasarkan bulan
  const sortedData = [...dataHistoris].sort((a, b) => a.bulan.localeCompare(b.bulan));
  const beratList = sortedData.map((d) => d.total_berat_kg);
  const bulanTerakhir = sortedData[sortedData.length - 1]!.bulan;

  let metode: 'holt_linear' | 'linear_regression' | 'moving_average' = 'holt_linear';
  let hasilPrediksiKg: number[] = [];
  let errorMarginKg = 0;

  if (sortedData.length >= 3) {
    const holt = holtLinearSmoothing(beratList, jumlahBulanKedepan);
    hasilPrediksiKg = holt.prediksi;
    errorMarginKg = holt.rmse;
    metode = 'holt_linear';
  } else {
    // Jika data historis baru sedikit (<3 bulan), gunakan Moving Average dengan tren sederhana
    const avg = beratList.reduce((acc, val) => acc + val, 0) / beratList.length;
    hasilPrediksiKg = new Array(jumlahBulanKedepan).fill(Math.round(avg * 10) / 10);
    errorMarginKg = avg * 0.15; // Estimasi deviasi 15%
    metode = 'moving_average';
  }

  // Hitung tren pertumbuhan per bulan (%)
  const regresi = hitungRegresiLinear(beratList);
  const rataRataBerat = beratList.reduce((a, b) => a + b, 0) / beratList.length;
  const trenPersen = rataRataBerat > 0 ? (regresi.slope / rataRataBerat) * 100 : 0;

  // Bangun rincian proyeksi per bulan
  const proyeksi: HasilPrediksiBulan[] = hasilPrediksiKg.map((beratKg, index) => {
    const bln = tambahBulan(bulanTerakhir, index + 1);
    const batasBawah = Math.max(0, Math.round((beratKg - errorMarginKg) * 10) / 10);
    const batasAtas = Math.round((beratKg + errorMarginKg) * 10) / 10;
    const estimasiUang = bulatkanRupiah(beratKg * hargaPerKg);
    const estimasiCo2e = bulatkanCo2e(beratKg * faktorCo2ePerKg);

    return {
      bulan: bln,
      prediksi_berat_kg: beratKg,
      batas_bawah_kg: batasBawah,
      batas_atas_kg: batasAtas,
      estimasi_nilai_rupiah: estimasiUang,
      estimasi_co2e_kg: estimasiCo2e,
    };
  });

  const totalBerat = proyeksi.reduce((sum, p) => sum + p.prediksi_berat_kg, 0);
  const totalUang = proyeksi.reduce((sum, p) => sum + p.estimasi_nilai_rupiah, 0);
  const totalCo2e = bulatkanCo2e(proyeksi.reduce((sum, p) => sum + p.estimasi_co2e_kg, 0));

  return {
    nama_kategori: namaKategori,
    metode,
    proyeksi,
    total_prediksi_berat_kg: Math.round(totalBerat * 10) / 10,
    total_estimasi_rupiah: totalUang,
    total_estimasi_co2e: totalCo2e,
    tren_persen_per_bulan: Math.round(trenPersen * 10) / 10,
  };
}
