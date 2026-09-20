const API = `${process.env.SMOKE_API ?? 'http://127.0.0.1:3100'}/api/v1`;
const masuk = await (await fetch(`${API}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'operator', password: process.env.SMOKE_PASSWORD ?? 'rahasia123' }),
})).json();
const kepala = { 'Content-Type': 'application/json', Authorization: `Bearer ${masuk.token}` };
const kategori = await (await fetch(`${API}/kategori-sampah`, { headers: kepala })).json();
const idKategori = kategori.data[0].id_kategori;
const kini = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

const buatNasabah = async () => {
  const id = crypto.randomUUID();
  await fetch(`${API}/nasabah`, { method: 'POST', headers: kepala,
    body: JSON.stringify({ id_nasabah: id, nama: 'Uji Balapan' }) });
  return id;
};
const saldo = async (id) =>
  (await (await fetch(`${API}/nasabah/${id}/saldo`, { headers: kepala })).json()).total_saldo;

const uji = (nama, benar, keterangan) =>
  console.log(`${benar ? 'LOLOS ' : 'GAGAL '} ${nama.padEnd(52)} ${keterangan}`);

{
  const idNasabah = await buatNasabah();
  const idTransaksi = crypto.randomUUID();
  const muatan = JSON.stringify({
    id_transaksi: idTransaksi, id_nasabah: idNasabah, tanggal: kini(),
    detail: [{ id_kategori: idKategori, berat_kg: 3 }],
  });
  const balasan = await Promise.all(
    [0, 1, 2].map(() => fetch(`${API}/transaksi`, { method: 'POST', headers: kepala, body: muatan })),
  );
  const status = balasan.map((b) => b.status).sort();
  const akhir = await saldo(idNasabah);
  uji('setoran identik dikirim serentak tiga kali', akhir === 9000 && !status.includes(500),
      `status ${status.join(',')} saldo ${akhir}`);
}

{
  const idNasabah = await buatNasabah();
  const kirim = (berat) => fetch(`${API}/transaksi`, { method: 'POST', headers: kepala,
    body: JSON.stringify({ id_transaksi: crypto.randomUUID(), id_nasabah: idNasabah,
      tanggal: kini(), detail: [{ id_kategori: idKategori, berat_kg: berat }] }) });
  const balasan = await Promise.all([kirim(1), kirim(1), kirim(1)]);
  const status = balasan.map((b) => b.status).sort();
  const akhir = await saldo(idNasabah);
  uji('tiga setoran berbeda serentak, saldo dijumlahkan', akhir === 9000,
      `status ${status.join(',')} saldo ${akhir}`);
}

{
  const idNasabah = await buatNasabah();
  await fetch(`${API}/transaksi`, { method: 'POST', headers: kepala,
    body: JSON.stringify({ id_transaksi: crypto.randomUUID(), id_nasabah: idNasabah,
      tanggal: kini(), detail: [{ id_kategori: idKategori, berat_kg: 3 }] }) });
  const idPenarikan = crypto.randomUUID();
  const muatan = JSON.stringify({ id_penarikan: idPenarikan, id_nasabah: idNasabah,
    tanggal: kini(), jumlah_tarik: 4000 });
  const balasan = await Promise.all(
    [0, 1, 2].map(() => fetch(`${API}/penarikan`, { method: 'POST', headers: kepala, body: muatan })),
  );
  const status = balasan.map((b) => b.status).sort();
  const akhir = await saldo(idNasabah);
  uji('penarikan identik dikirim serentak tiga kali', akhir === 5000 && !status.includes(500),
      `status ${status.join(',')} saldo ${akhir}`);
}

{
  const idNasabah = await buatNasabah();
  const nasabahLain = await buatNasabah();
  await fetch(`${API}/transaksi`, { method: 'POST', headers: kepala,
    body: JSON.stringify({ id_transaksi: crypto.randomUUID(), id_nasabah: idNasabah,
      tanggal: kini(), detail: [{ id_kategori: idKategori, berat_kg: 3 }] }) });
  const balasan = await Promise.all([
    fetch(`${API}/penarikan`, { method: 'POST', headers: kepala,
      body: JSON.stringify({ id_penarikan: crypto.randomUUID(), id_nasabah: idNasabah,
        tanggal: kini(), jumlah_tarik: 5000 }) }),
    fetch(`${API}/transaksi`, { method: 'POST', headers: kepala,
      body: JSON.stringify({ id_transaksi: crypto.randomUUID(), id_nasabah: nasabahLain,
        tanggal: kini(), detail: [{ id_kategori: idKategori, berat_kg: 1 }] }) }),
  ]);
  const status = balasan.map((b) => b.status).sort();
  uji('penarikan dan setoran nasabah lain tidak saling kunci', !status.includes(500),
      `status ${status.join(',')}`);
}
