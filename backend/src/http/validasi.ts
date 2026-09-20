import { z } from 'zod';

export const uuid = z.string().uuid('Identifier harus berupa UUID yang sah.');

export const halaman = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

export const buatNasabah = z.object({
  id_nasabah: uuid.optional(),
  nama: z.string().trim().min(1, 'Nama nasabah wajib diisi.').max(120),
  nomor_hp: z.string().trim().max(20).nullish(),
  alamat: z.string().trim().max(255).nullish(),
});

export const ubahNasabah = z
  .object({
    nama: z.string().trim().min(1).max(120).optional(),
    nomor_hp: z.string().trim().max(20).nullish(),
    alamat: z.string().trim().max(255).nullish(),
  })
  .refine((nilai) => Object.keys(nilai).length > 0, {
    message: 'Tidak ada isian yang diubah.',
  });

export const buatKategori = z.object({
  id_kategori: uuid.optional(),
  nama_kategori: z.string().trim().min(1, 'Nama kategori wajib diisi.').max(80),
  harga_per_kg: z.number().int().min(0, 'Harga per kg tidak boleh negatif.'),
  faktor_co2e_per_kg: z.number().min(0, 'Faktor CO2e tidak boleh negatif.'),
  aktif: z.boolean().optional(),
});

export const ubahKategori = z
  .object({
    nama_kategori: z.string().trim().min(1).max(80).optional(),
    harga_per_kg: z.number().int().min(0).optional(),
    faktor_co2e_per_kg: z.number().min(0).optional(),
    aktif: z.boolean().optional(),
  })
  .refine((nilai) => Object.keys(nilai).length > 0, {
    message: 'Tidak ada isian yang diubah.',
  });

export const masuk = z.object({
  username: z.string().trim().min(1, 'Username wajib diisi.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.'),
});
