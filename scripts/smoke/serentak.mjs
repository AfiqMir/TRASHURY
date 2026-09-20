const API = `${process.env.SMOKE_API ?? 'http://127.0.0.1:3100'}/api/v1`;

const masuk = await (await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'operator', password: process.env.SMOKE_PASSWORD ?? 'rahasia123' }),
})).json();
const kepala = { 'Content-Type': 'application/json', Authorization: `Bearer ${masuk.token}` };

const kategori = await (await fetch(`${API}/kategori-sampah`, { headers: kepala })).json();
const idKategori = kategori.data[0].id_kategori;

const idNasabah = crypto.randomUUID();
await fetch(`${API}/nasabah`, {
  method: 'POST', headers: kepala,
  body: JSON.stringify({ id_nasabah: idNasabah, nama: 'Uji Serentak' }),
});
await fetch(`${API}/transaksi`, {
  method: 'POST', headers: kepala,
  body: JSON.stringify({
    id_transaksi: crypto.randomUUID(),
    id_nasabah: idNasabah,
    tanggal: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    detail: [{ id_kategori: idKategori, berat_kg: 3 }],
  }),
});

const saldoAwal = await (await fetch(`${API}/nasabah/${idNasabah}/saldo`, { headers: kepala })).json();
console.log('saldo awal            :', saldoAwal.total_saldo);

const tarik = (jumlah) => fetch(`${API}/penarikan`, {
  method: 'POST', headers: kepala,
  body: JSON.stringify({
    id_penarikan: crypto.randomUUID(),
    id_nasabah: idNasabah,
    tanggal: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    jumlah_tarik: jumlah,
  }),
});

const balasan = await Promise.all([tarik(6000), tarik(6000), tarik(6000)]);
const status = balasan.map((b) => b.status).sort();
console.log('status tiga penarikan :', status.join(', '));

const saldoAkhir = await (await fetch(`${API}/nasabah/${idNasabah}/saldo`, { headers: kepala })).json();
console.log('saldo akhir           :', saldoAkhir.total_saldo);

const berhasil = status.filter((s) => s === 201).length;
const benar = berhasil === 1 && saldoAkhir.total_saldo === 3000;
console.log(benar
  ? 'LOLOS  tepat satu penarikan berhasil, saldo tidak negatif'
  : `GAGAL  ${berhasil} penarikan berhasil, saldo akhir ${saldoAkhir.total_saldo}`);
