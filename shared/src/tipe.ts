export type Peran = 'operator' | 'pengurus';

export type SumberKlasifikasi = 'ai' | 'manual';

export interface KategoriSampah {
  id_kategori: string;
  nama_kategori: string;
  harga_per_kg: number;
  faktor_co2e_per_kg: number;
  aktif: boolean;
}

export interface Nasabah {
  id_nasabah: string;
  nama: string;
  nomor_hp: string | null;
  alamat: string | null;
  total_saldo: number;
  created_at: string;
  updated_at: string;
}

export interface BarisSetoran {
  berat_kg: number;
  harga_per_kg: number;
  faktor_co2e_per_kg: number;
}

export interface HasilBarisSetoran {
  subtotal_harga: number;
  subtotal_co2e: number;
}

export interface HasilSetoran extends HasilBarisSetoran {
  baris: HasilBarisSetoran[];
  total_nominal: number;
  total_co2e: number;
}
