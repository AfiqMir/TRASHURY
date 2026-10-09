import type { KategoriSampah } from './tipe.js';

/**
 * 12 Kelas output model AI sesuai urutan labels.txt dan tensor ONNX
 */
export const DAFTAR_KELAS_MODEL = [
  'Cardboard Boxes', // 0
  'Glass Bottles',   // 1
  'Glass Shards',    // 2
  'Jug',             // 3
  'Metal Can',       // 4
  'Paper',           // 5
  'Paper Bag',       // 6
  'Paper Cup',       // 7
  'Plastic Bottle',  // 8
  'Plastic Cup',     // 9
  'Plastic bag',     // 10
  'food waste',      // 11
] as const;

export type LabelModelAi = (typeof DAFTAR_KELAS_MODEL)[number];

export interface DefinisiKategoriSampah extends KategoriSampah {
  label_model: LabelModelAi;
  deskripsi: string;
}

/**
 * Nilai acuan standar harga dan faktor emisi reduksi CO2e (berdasarkan IPCC / KLHK)
 */
export const MASTER_KATEGORI_SAMPAH: readonly DefinisiKategoriSampah[] = [
  {
    id_kategori: 'kat-01-cardboard',
    nama_kategori: 'Kardus / Karton',
    label_model: 'Cardboard Boxes',
    harga_per_kg: 1500,
    faktor_co2e_per_kg: 1.10,
    aktif: true,
    deskripsi: 'Kardus bergelombang, box kemasan cokelat kering',
  },
  {
    id_kategori: 'kat-02-glass-bottle',
    nama_kategori: 'Botol Kaca Utuh',
    label_model: 'Glass Bottles',
    harga_per_kg: 500,
    faktor_co2e_per_kg: 0.35,
    aktif: true,
    deskripsi: 'Botol sirup, kecap, atau minuman kaca dalam kondisi utuh',
  },
  {
    id_kategori: 'kat-03-glass-shard',
    nama_kategori: 'Pecahan Kaca',
    label_model: 'Glass Shards',
    harga_per_kg: 200,
    faktor_co2e_per_kg: 0.30,
    aktif: true,
    deskripsi: 'Belahan atau pecahan kaca (butuh penanganan hati-hati)',
  },
  {
    id_kategori: 'kat-04-jug-hdpe',
    nama_kategori: 'Jeriken / Botol HDPE',
    label_model: 'Jug',
    harga_per_kg: 3000,
    faktor_co2e_per_kg: 1.80,
    aktif: true,
    deskripsi: 'Wadah plastik tebal, jeriken minyak, botol shampo',
  },
  {
    id_kategori: 'kat-05-metal-can',
    nama_kategori: 'Kaleng / Logam',
    label_model: 'Metal Can',
    harga_per_kg: 4000,
    faktor_co2e_per_kg: 4.00,
    aktif: true,
    deskripsi: 'Kaleng minuman aluminium, kaleng biskuit atau seng',
  },
  {
    id_kategori: 'kat-06-paper',
    nama_kategori: 'Kertas / HVS / Buku',
    label_model: 'Paper',
    harga_per_kg: 1200,
    faktor_co2e_per_kg: 1.30,
    aktif: true,
    deskripsi: 'Kertas dokumen HVS, majalah, koran, dan buku tulis',
  },
  {
    id_kategori: 'kat-07-paper-bag',
    nama_kategori: 'Kantong Kertas',
    label_model: 'Paper Bag',
    harga_per_kg: 1000,
    faktor_co2e_per_kg: 1.00,
    aktif: true,
    deskripsi: 'Paper bag belanja dan kantong kertas kraft',
  },
  {
    id_kategori: 'kat-08-paper-cup',
    nama_kategori: 'Gelas Kertas',
    label_model: 'Paper Cup',
    harga_per_kg: 500,
    faktor_co2e_per_kg: 0.50,
    aktif: true,
    deskripsi: 'Gelas kopi kertas sekali pakai',
  },
  {
    id_kategori: 'kat-09-plastic-bottle',
    nama_kategori: 'Botol Plastik (PET)',
    label_model: 'Plastic Bottle',
    harga_per_kg: 3500,
    faktor_co2e_per_kg: 2.10,
    aktif: true,
    deskripsi: 'Botol air mineral transparan bening atau biru muda',
  },
  {
    id_kategori: 'kat-10-plastic-cup',
    nama_kategori: 'Gelas Plastik (PP)',
    label_model: 'Plastic Cup',
    harga_per_kg: 2500,
    faktor_co2e_per_kg: 1.70,
    aktif: true,
    deskripsi: 'Gelas plastik air mineral / minuman boba',
  },
  {
    id_kategori: 'kat-11-plastic-bag',
    nama_kategori: 'Kantong Plastik / Kresek',
    label_model: 'Plastic bag',
    harga_per_kg: 500,
    faktor_co2e_per_kg: 1.20,
    aktif: true,
    deskripsi: 'Kantong kresek belanjaan LDPE/HDPE tipis',
  },
  {
    id_kategori: 'kat-12-food-waste',
    nama_kategori: 'Sampah Makanan / Organik',
    label_model: 'food waste',
    harga_per_kg: 0,
    faktor_co2e_per_kg: 0.25,
    aktif: true,
    deskripsi: 'Sisa makanan organik (bahan kompos / pakan ternak)',
  },
];

/**
 * Konfigurasi Preprocessing Gambar untuk Model ONNX
 */
export const KONFIGURASI_PREPROCESSING_AI = {
  klasifikasi: {
    lebar: 224,
    tinggi: 224,
    mean: [0.485, 0.456, 0.406] as const,
    std: [0.229, 0.224, 0.225] as const,
  },
  deteksi: {
    lebar: 640,
    tinggi: 640,
  },
} as const;

/**
 * Menghitung probabilitas Softmax dari array logits mentah
 */
export function hitungSoftmax(logits: number[]): number[] {
  if (logits.length === 0) return [];
  const maxVal = Math.max(...logits);
  const expScores = logits.map((val) => Math.exp(val - maxVal));
  const totalExp = expScores.reduce((sum, val) => sum + val, 0);
  return expScores.map((val) => (totalExp > 0 ? val / totalExp : 0));
}

/**
 * Mengubah output raw logits model klasifikasi menjadi hasil prediksi berlabel
 */
export function terjemahkanLogitsKlasifikasi(logits: number[]): {
  index: number;
  label_model: LabelModelAi;
  kategori: DefinisiKategoriSampah;
  confidence: number;
} {
  const probs = hitungSoftmax(logits);
  let bestIdx = 0;
  let maxProb = probs[0] ?? 0;

  for (let i = 1; i < probs.length; i++) {
    if ((probs[i] ?? 0) > maxProb) {
      maxProb = probs[i]!;
      bestIdx = i;
    }
  }

  const label = DAFTAR_KELAS_MODEL[bestIdx] ?? 'Paper';
  const definisi = MASTER_KATEGORI_SAMPAH[bestIdx] ?? MASTER_KATEGORI_SAMPAH[0]!;

  return {
    index: bestIdx,
    label_model: label,
    kategori: definisi,
    confidence: maxProb,
  };
}
