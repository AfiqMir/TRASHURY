export type KodeGalat =
  | 'KREDENSIAL_SALAH'
  | 'TOKEN_TIDAK_SAH'
  | 'TIDAK_BERWENANG'
  | 'PERMINTAAN_TIDAK_SAH'
  | 'NASABAH_TIDAK_DITEMUKAN'
  | 'NASABAH_MASIH_TERPAKAI'
  | 'KATEGORI_TIDAK_DITEMUKAN'
  | 'KATEGORI_TIDAK_AKTIF'
  | 'KATEGORI_SUDAH_ADA'
  | 'DETAIL_KOSONG'
  | 'BERAT_TIDAK_SAH'
  | 'TANGGAL_TIDAK_SAH'
  | 'JUMLAH_TIDAK_SAH'
  | 'SALDO_TIDAK_CUKUP';

export class GalatAplikasi extends Error {
  readonly status: number;
  readonly kode: KodeGalat;
  readonly field?: string;
  readonly tambahan?: Record<string, unknown>;

  constructor(
    status: number,
    kode: KodeGalat,
    pesan: string,
    opsi: { field?: string; tambahan?: Record<string, unknown> } = {},
  ) {
    super(pesan);
    this.status = status;
    this.kode = kode;
    this.field = opsi.field;
    this.tambahan = opsi.tambahan;
  }
}

export const galat = {
  kredensialSalah: () =>
    new GalatAplikasi(401, 'KREDENSIAL_SALAH', 'Username atau kata sandi salah.'),
  tokenTidakSah: () =>
    new GalatAplikasi(401, 'TOKEN_TIDAK_SAH', 'Token tidak ada atau sudah kedaluwarsa.'),
  tidakBerwenang: () =>
    new GalatAplikasi(403, 'TIDAK_BERWENANG', 'Peran anda tidak berwenang atas tindakan ini.'),
  nasabahTidakDitemukan: () =>
    new GalatAplikasi(404, 'NASABAH_TIDAK_DITEMUKAN', 'Nasabah tidak ditemukan.'),
  nasabahMasihTerpakai: () =>
    new GalatAplikasi(
      409,
      'NASABAH_MASIH_TERPAKAI',
      'Nasabah sudah memiliki transaksi atau penarikan sehingga tidak dapat dihapus.',
    ),
  kategoriTidakDitemukan: () =>
    new GalatAplikasi(404, 'KATEGORI_TIDAK_DITEMUKAN', 'Kategori sampah tidak ditemukan.'),
  kategoriSudahAda: (nama: string) =>
    new GalatAplikasi(409, 'KATEGORI_SUDAH_ADA', `Kategori "${nama}" sudah terdaftar.`, {
      field: 'nama_kategori',
    }),
};
