import PDFDocument from 'pdfkit';
import type { RekapBulanan } from '../db/laporan.js';

const TEPI = 50;
const TINGGI_BARIS = 18;

interface Kolom {
  judul: string;
  lebar: number;
  rata: 'left' | 'right';
}

const KOLOM: Kolom[] = [
  { judul: 'Kategori', lebar: 165, rata: 'left' },
  { judul: 'Setoran', lebar: 55, rata: 'right' },
  { judul: 'Berat (kg)', lebar: 80, rata: 'right' },
  { judul: 'Nilai (Rp)', lebar: 105, rata: 'right' },
  { judul: 'CO2e (kg)', lebar: 90, rata: 'right' },
];

function angka(nilai: number, desimal = 0): string {
  return nilai.toLocaleString('id-ID', {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
  });
}

export function namaBulan(bulan: string): string {
  const [tahun, nomor] = bulan.split('-').map(Number);
  return new Date(Date.UTC(tahun!, nomor! - 1, 1)).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function waktuWib(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  });
}

export function rekapKePdf(rekap: RekapBulanan): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: TEPI,
    info: { Title: `Rekap Bulanan ${rekap.bulan}`, Author: 'TRASHURY' },
  });
  const potongan: Buffer[] = [];
  doc.on('data', (b: Buffer) => potongan.push(b));
  const selesai = new Promise<Buffer>((terima, tolak) => {
    doc.on('end', () => terima(Buffer.concat(potongan)));
    doc.on('error', tolak);
  });

  const lebarHalaman = doc.page.width - TEPI * 2;

  doc.font('Helvetica-Bold').fontSize(16).text('Rekapitulasi Bulanan Bank Sampah');
  doc.font('Helvetica').fontSize(11).text(`Periode ${namaBulan(rekap.bulan)} (WIB)`);
  doc.moveDown();

  const r = rekap.ringkasan;
  const ringkasan: [string, string][] = [
    ['Jumlah setoran', angka(r.jumlah_setoran)],
    ['Nasabah yang menyetor', angka(r.jumlah_nasabah_menyetor)],
    ['Total berat sampah', `${angka(r.total_berat_kg, 2)} kg`],
    ['Total nilai setoran', `Rp${angka(r.total_nilai_rupiah)}`],
    ['Estimasi emisi CO2e', `${angka(r.total_co2e_kg, 4)} kg`],
    ['Jumlah penarikan', angka(r.jumlah_penarikan)],
    ['Total penarikan saldo', `Rp${angka(r.total_penarikan_rupiah)}`],
  ];

  doc.font('Helvetica-Bold').fontSize(12).text('Ringkasan');
  doc.moveDown(0.3);
  doc.fontSize(10);
  for (const [label, nilai] of ringkasan) {
    const y = doc.y;
    doc.font('Helvetica').text(label, TEPI, y, { width: 200, lineBreak: false });
    doc.font('Helvetica-Bold').text(nilai, TEPI + 200, y, { width: 200, lineBreak: false });
    doc.y = y + TINGGI_BARIS - 4;
  }
  doc.moveDown();

  doc.x = TEPI;
  doc.font('Helvetica-Bold').fontSize(12).text('Rincian per Kategori');
  doc.moveDown(0.3);
  doc.fontSize(10);

  const tulisBaris = (sel: string[], tebal: boolean) => {
    if (doc.y + TINGGI_BARIS > doc.page.height - TEPI) {
      doc.addPage();
      tulisKepala();
    }
    const y = doc.y;
    let x = TEPI;
    doc.font(tebal ? 'Helvetica-Bold' : 'Helvetica');
    KOLOM.forEach((k, i) => {
      doc.text(sel[i] ?? '', x + 4, y + 4, {
        width: k.lebar - 8,
        align: k.rata,
        lineBreak: false,
        ellipsis: true,
        height: TINGGI_BARIS,
      });
      x += k.lebar;
    });
    doc
      .moveTo(TEPI, y + TINGGI_BARIS)
      .lineTo(TEPI + lebarHalaman, y + TINGGI_BARIS)
      .lineWidth(0.5)
      .strokeColor('#999999')
      .stroke();
    doc.y = y + TINGGI_BARIS;
  };

  const tulisKepala = () => tulisBaris(KOLOM.map((k) => k.judul), true);

  tulisKepala();
  if (rekap.per_kategori.length === 0) {
    doc.font('Helvetica-Oblique').text('Tidak ada setoran pada periode ini.', TEPI + 4, doc.y + 4);
    doc.y += TINGGI_BARIS;
  }
  for (const k of rekap.per_kategori) {
    tulisBaris(
      [
        k.nama_kategori,
        angka(k.jumlah_setoran),
        angka(k.total_berat_kg, 2),
        angka(k.total_nilai_rupiah),
        angka(k.total_co2e_kg, 4),
      ],
      false,
    );
  }
  tulisBaris(
    [
      'Total',
      angka(r.jumlah_setoran),
      angka(r.total_berat_kg, 2),
      angka(r.total_nilai_rupiah),
      angka(r.total_co2e_kg, 4),
    ],
    true,
  );

  doc.moveDown(2);
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#555555')
    .text(`Dibuat oleh TRASHURY pada ${waktuWib(rekap.dibuat_pada)} WIB.`, TEPI, doc.y, {
      width: lebarHalaman,
    });

  doc.end();
  return selesai;
}
