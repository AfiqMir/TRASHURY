set -u

API="${SMOKE_API:-http://127.0.0.1:3100}/api/v1"
SANDI="${SMOKE_PASSWORD:-rahasia123}"
lolos=0
gagal=0

periksa() {
  if [ "$2" = "$3" ]; then
    printf 'LOLOS  %-58s %s\n' "$1" "$3"
    lolos=$((lolos + 1))
  else
    printf 'GAGAL  %-58s harap %s dapat %s\n' "$1" "$2" "$3"
    gagal=$((gagal + 1))
  fi
}

kode() { printf '%s' "$1" | tail -1; }
badan() { printf '%s' "$1" | sed '$d'; }
ambil() { badan "$1" | sed -n "s/.*\"$2\":\"\([^\"]*\)\".*/\1/p"; }
angka() { badan "$1" | sed -n "s/.*\"$2\":\([0-9-]*\).*/\1/p"; }

panggil() {
  metode="$1"
  jalur="$2"
  data="${3:-}"
  token="${4:-}"
  set -- -s -w '\n%{http_code}' -X "$metode" "$API$jalur" -H 'Content-Type: application/json'
  [ -n "$token" ] && set -- "$@" -H "Authorization: Bearer $token"
  [ -n "$data" ] && set -- "$@" --data-binary "$data"
  curl "$@"
}

ACAK=$(uuidgen | cut -c1-8)
NAS=$(uuidgen | tr 'A-Z' 'a-z')
TRX=$(uuidgen | tr 'A-Z' 'a-z')
BATAL=$(uuidgen | tr 'A-Z' 'a-z')
TARIK=$(uuidgen | tr 'A-Z' 'a-z')
HANTU=$(uuidgen | tr 'A-Z' 'a-z')
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "=== 1. Autentikasi ==="
r=$(panggil POST /auth/login "{\"username\":\"operator\",\"password\":\"salah\"}")
periksa "login kata sandi salah ditolak" 401 "$(kode "$r")"
r=$(panggil POST /auth/login "{\"username\":\"tidakada\",\"password\":\"$SANDI\"}")
periksa "login username tidak ada ditolak" 401 "$(kode "$r")"
r=$(panggil POST /auth/login "{\"username\":\"operator\",\"password\":\"$SANDI\"}")
periksa "login benar diterima" 200 "$(kode "$r")"
TOKEN=$(ambil "$r" token)
r=$(panggil POST /auth/login "{\"username\":\"pengurus\",\"password\":\"$SANDI\"}")
PENGURUS=$(ambil "$r" token)
r=$(panggil GET /nasabah '' '')
periksa "akses tanpa token ditolak" 401 "$(kode "$r")"

echo
echo "=== 2. Badan permintaan cacat ==="
r=$(panggil POST /nasabah '{"nama": ' "$TOKEN")
periksa "JSON rusak ditolak sebagai permintaan salah" 400 "$(kode "$r")"
r=$(panggil GET /nasabah/bukan-uuid '' "$TOKEN")
periksa "identifier bukan UUID ditolak" 400 "$(kode "$r")"
r=$(panggil GET /entah '' "$TOKEN")
periksa "rute tidak dikenal" 404 "$(kode "$r")"
r=$(panggil GET "/nasabah?q=%27%3B%20DROP%20TABLE%20nasabah%3B--" '' "$TOKEN")
periksa "percobaan injeksi tidak merusak" 200 "$(kode "$r")"

echo
echo "=== 3. Master data ==="
r=$(panggil POST /kategori-sampah "{\"nama_kategori\":\"Plastik $ACAK\",\"harga_per_kg\":3000,\"faktor_co2e_per_kg\":1.5}" "$TOKEN")
periksa "tambah kategori" 201 "$(kode "$r")"
KAT=$(ambil "$r" id_kategori)
r=$(panggil POST /kategori-sampah "{\"nama_kategori\":\"plastik $ACAK\",\"harga_per_kg\":2000,\"faktor_co2e_per_kg\":1.0}" "$TOKEN")
periksa "kategori kembar ditolak" 409 "$(kode "$r")"
r=$(panggil POST /kategori-sampah "{\"nama_kategori\":\"Kardus $ACAK\",\"harga_per_kg\":1800.5,\"faktor_co2e_per_kg\":0.9}" "$TOKEN")
periksa "harga pecahan ditolak" 400 "$(kode "$r")"

r=$(panggil POST /nasabah "{\"id_nasabah\":\"$NAS\",\"nama\":\"Sri $ACAK\",\"nomor_hp\":\"081234567890\"}" "$TOKEN")
periksa "tambah nasabah dengan identifier klien" 201 "$(kode "$r")"
periksa "saldo awal nol" 0 "$(angka "$r" total_saldo)"
r=$(panggil POST /nasabah "{\"id_nasabah\":\"$NAS\",\"nama\":\"Nama Lain\"}" "$TOKEN")
periksa "kirim ulang nasabah aman" 200 "$(kode "$r")"
r=$(panggil GET "/nasabah?q=sri%20$ACAK" '' "$TOKEN")
periksa "pencarian tidak membedakan huruf" 1 "$(angka "$r" total)"
r=$(panggil DELETE "/nasabah/$NAS" '' "$TOKEN")
periksa "operator dilarang menghapus nasabah" 403 "$(kode "$r")"

echo
echo "=== 4. Setoran ==="
r=$(panggil POST /transaksi "{\"id_transaksi\":\"$TRX\",\"id_nasabah\":\"$NAS\",\"tanggal\":\"$NOW\",\"total_nominal\":999000,\"detail\":[{\"id_kategori\":\"$KAT\",\"berat_kg\":3,\"sumber_klasifikasi\":\"ai\"}]}" "$TOKEN")
periksa "catat setoran" 201 "$(kode "$r")"
periksa "total dihitung server, bukan klien" 9000 "$(angka "$r" total_nominal)"
r=$(panggil GET "/nasabah/$NAS/saldo" '' "$TOKEN")
periksa "saldo bertambah" 9000 "$(angka "$r" total_saldo)"
r=$(panggil POST /transaksi "{\"id_transaksi\":\"$TRX\",\"id_nasabah\":\"$NAS\",\"tanggal\":\"$NOW\",\"detail\":[{\"id_kategori\":\"$KAT\",\"berat_kg\":3}]}" "$TOKEN")
periksa "kirim ulang setoran aman" 200 "$(kode "$r")"
r=$(panggil GET "/nasabah/$NAS/saldo" '' "$TOKEN")
periksa "saldo tidak bertambah dua kali" 9000 "$(angka "$r" total_saldo)"

r=$(panggil POST /transaksi "{\"id_transaksi\":\"$BATAL\",\"id_nasabah\":\"$NAS\",\"tanggal\":\"$NOW\",\"detail\":[{\"id_kategori\":\"$KAT\",\"berat_kg\":2},{\"id_kategori\":\"$HANTU\",\"berat_kg\":1}]}" "$TOKEN")
periksa "rincian bermasalah ditolak" 422 "$(kode "$r")"
r=$(panggil GET "/transaksi/$BATAL" '' "$TOKEN")
periksa "transaksi batal tidak tersimpan" 404 "$(kode "$r")"
r=$(panggil GET "/nasabah/$NAS/saldo" '' "$TOKEN")
periksa "saldo tidak terpengaruh transaksi batal" 9000 "$(angka "$r" total_saldo)"

echo
echo "=== 5. Penarikan ==="
r=$(panggil POST /penarikan "{\"id_penarikan\":\"$(uuidgen | tr 'A-Z' 'a-z')\",\"id_nasabah\":\"$NAS\",\"tanggal\":\"$NOW\",\"jumlah_tarik\":9001}" "$TOKEN")
periksa "penarikan melebihi saldo ditolak" 422 "$(kode "$r")"
periksa "galat menyertakan saldo tersedia" 9000 "$(angka "$r" saldo_tersedia)"
r=$(panggil POST /penarikan "{\"id_penarikan\":\"$TARIK\",\"id_nasabah\":\"$NAS\",\"tanggal\":\"$NOW\",\"jumlah_tarik\":4000}" "$TOKEN")
periksa "penarikan sah diterima" 201 "$(kode "$r")"
periksa "sisa saldo tercatat" 5000 "$(angka "$r" saldo_sisa)"
r=$(panggil POST /penarikan "{\"id_penarikan\":\"$TARIK\",\"id_nasabah\":\"$NAS\",\"tanggal\":\"$NOW\",\"jumlah_tarik\":4000}" "$TOKEN")
periksa "kirim ulang penarikan aman" 200 "$(kode "$r")"
r=$(panggil GET "/nasabah/$NAS/saldo" '' "$TOKEN")
periksa "saldo tidak berkurang dua kali" 5000 "$(angka "$r" total_saldo)"

echo
echo "=== 6. Buku tabungan ==="
r=$(panggil GET "/nasabah/$NAS/buku-tabungan" '' "$TOKEN")
periksa "memuat setoran dan penarikan" 2 "$(angka "$r" total)"
periksa "penarikan bernilai negatif" 1 "$(badan "$r" | grep -c -- '-4000')"

echo
echo "=== 7. Hak pengurus ==="
r=$(panggil DELETE "/nasabah/$NAS" '' "$PENGURUS")
periksa "hapus nasabah beriwayat ditolak" 409 "$(kode "$r")"

echo
printf 'RINGKASAN: %d lolos, %d gagal\n' "$lolos" "$gagal"
[ "$gagal" -eq 0 ]
