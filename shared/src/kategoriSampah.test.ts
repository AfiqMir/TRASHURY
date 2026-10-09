import { describe, expect, it } from 'vitest';
import {
  DAFTAR_KELAS_MODEL,
  MASTER_KATEGORI_SAMPAH,
  hitungSoftmax,
  terjemahkanLogitsKlasifikasi,
} from './kategoriSampah.js';

describe('kategoriSampah & AI helpers', () => {
  it('memiliki 12 kelas model yang terpetakan ke master kategori', () => {
    expect(DAFTAR_KELAS_MODEL).toHaveLength(12);
    expect(MASTER_KATEGORI_SAMPAH).toHaveLength(12);

    for (let i = 0; i < 12; i++) {
      expect(MASTER_KATEGORI_SAMPAH[i]?.label_model).toBe(DAFTAR_KELAS_MODEL[i]);
      expect(MASTER_KATEGORI_SAMPAH[i]?.harga_per_kg).toBeGreaterThanOrEqual(0);
      expect(MASTER_KATEGORI_SAMPAH[i]?.faktor_co2e_per_kg).toBeGreaterThanOrEqual(0);
    }
  });

  it('menghitung softmax dengan benar', () => {
    const logits = [2.0, 1.0, 0.1];
    const probs = hitungSoftmax(logits);

    expect(probs).toHaveLength(3);
    const sum = probs.reduce((acc, p) => acc + p, 0);
    expect(sum).toBeCloseTo(1.0, 5);
    expect(probs[0]).toBeGreaterThan(probs[1]!);
    expect(probs[1]).toBeGreaterThan(probs[2]!);
  });

  it('menerjemahkan output logits klasifikasi ke kategori yang benar', () => {
    // Simulasi output logits di mana indeks 8 (Plastic Bottle) bernilai paling tinggi
    const dummyLogits = new Array(12).fill(0.1);
    dummyLogits[8] = 5.0; // Index 8: Plastic Bottle

    const hasil = terjemahkanLogitsKlasifikasi(dummyLogits);
    expect(hasil.index).toBe(8);
    expect(hasil.label_model).toBe('Plastic Bottle');
    expect(hasil.kategori.nama_kategori).toBe('Botol Plastik (PET)');
    expect(hasil.kategori.harga_per_kg).toBe(3500);
    expect(hasil.confidence).toBeGreaterThan(0.9);
  });
});
