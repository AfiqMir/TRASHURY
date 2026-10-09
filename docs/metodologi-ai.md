# Dokumentasi Metodologi dan Model Kecerdasan Buatan (AI) TRASHURY

Dokumen ini merinci metodologi, sumber data, arsitektur pemodelan, hasil evaluasi, dan logika perhitungan reduksi emisi $\text{CO}_2\text{e}$ yang dikembangkan pada proyek **TRASHURY** untuk memenuhi luaran bidang **Kecerdasan Buatan** (#21, #22, #23, #24).

---

## 1. Ringkasan & Ruang Lingkup AI

Model kecerdasan buatan di TRASHURY bertindak sebagai **asisten kasir (*copilot*) berbasis *edge computing*** yang berjalan 100% luring (*offline*) di peramban operator menggunakan **ONNX Runtime Web**.

Fungsi utama AI mencakup:
1. **Klasifikasi & Lokalisasi Sampah (*Computer Vision*):** Mengenali jenis sampah dari foto tumpukan setoran dan mengarahkan pilihan kategori di layar kasir secara otomatis (1-klik konfirmasi).
2. **Estimasi Reduksi Emisi $\text{CO}_2\text{e}$:** Menghitung dampak lingkungan berupa emisi karbon yang terhindar (*avoided GHG emissions*) dari sampah yang didaur ulang berdasarkan acuan resmi IPCC Guidelines dan KLHK.

---

## 2. Dataset & Kurasi Kategori Sampah

### 2.1 Sumber Data
Dataset diperoleh dan dikurasi melalui **Roboflow Workspace** (`waste-classification-rjo28-2limn`), mencakup **2.418 citra sampah** dalam kondisi realistis.

Dataset dibagi menjadi 3 subset:
* **Train Set:** $1.934\text{ citra}$ ($80\%$)
* **Validation Set:** $242\text{ citra}$ ($10\%$)
* **Test Set:** $242\text{ citra}$ ($10\%$)

### 2.2 Daftar 12 Kelas Target
Kategori sampah disesuaikan dengan alur operasional bank sampah kalurahan dan nilai jual pengepul:

| Indeks | Label Model | Nama Kategori Lokal | Deskripsi Visual |
|:---:|---|---|---|
| **0** | `Cardboard Boxes` | **Kardus / Karton** | Box cokelat bergelombang, kemasan paket kering |
| **1** | `Glass Bottles` | **Botol Kaca Utuh** | Botol sirup, kecap, atau minuman kaca utuh |
| **2** | `Glass Shards` | **Pecahan Kaca** | Belahan atau pecahan kaca tajam (*hazard*) |
| **3** | `Jug` | **Jeriken / Botol HDPE** | Wadah plastik keras tebal, jeriken minyak, botol shampo |
| **4** | `Metal Can` | **Kaleng / Logam** | Kaleng minuman aluminium, seng, kaleng biskuit |
| **5** | `Paper` | **Kertas / HVS / Buku** | Dokumen kertas putih, majalah, koran, buku tulis |
| **6** | `Paper Bag` | **Kantong Kertas** | Paper bag belanjaan dan kantong kertas kraft |
| **7** | `Paper Cup` | **Gelas Kertas** | Gelas kopi kertas sekali pakai |
| **8** | `Plastic Bottle` | **Botol Plastik (PET)** | Botol air mineral bening transparan atau biru muda |
| **9** | `Plastic Cup` | **Gelas Plastik (PP)** | Gelas air mineral cup / minuman boba |
| **10** | `Plastic bag` | **Kantong Plastik / Kresek** | Kantong kresek tipis (LDPE/HDPE) |
| **11** | `food waste` | **Sampah Makanan / Organik** | Sisa makanan / sampah basah (kontaminasi) |

### 2.3 Penanganan *Imbalanced Data* & Augmentasi
1. **Class-Weighted Loss:** Menggunakan pembobotan kelas pada *Cross-Entropy Loss* untuk mencegah model bias terhadap kelas yang dominan:
   $$w_c = \frac{N}{C \times N_c}$$
2. **Augmentasi Citra:**
   * `RandomHorizontalFlip(p=0.5)`
   * `RandomRotation(degrees=15)`
   * `ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.05)`
   * `RandomAffine(translate=(0.1, 0.1))`
   * Normalisasi standar ImageNet ($\mu = [0.485, 0.456, 0.406]$, $\sigma = [0.229, 0.224, 0.225]$).

---

## 3. Eksperimen & Perbandingan Arsitektur Model

Untuk menemukan *trade-off* terbaik antara akurasi dan efisiensi memori di komputer kasir, dilakukan pembandingan tiga arsitektur *transfer learning* berbasis PyTorch:

| Arsitektur | Pretrained Weights | Ukuran File (.pth) | Valid Acc (Best) | Karakteristik |
|---|---|:---:|:---:|---|
| **ResNet-18** | ImageNet-1K V1 | $42.73\text{ MB}$ | $84.75\%$ | Residual connection standar, cukup cepat |
| **ResNet-34** | ImageNet-1K V1 | $81.35\text{ MB}$ | $86.25\%$ | Model lebih dalam, ukuran terlalu besar |
| **EfficientNet-B0** | ImageNet-1K V1 | **$15.64\text{ MB}$** | **$91.00\%$** | **Compound scaling efisien, akurasi tertinggi** 🏆 |

**Keputusan:** **EfficientNet-B0** dipilih sebagai model klasifikasi utama karena menghasilkan akurasi validasi tertinggi ($91.00\%$) dengan ukuran file paling ramping ($15.64\text{ MB}$), sangat ideal untuk dimuat pada PWA luring.

---

## 4. Evaluasi & Metrik Model Terbaik (EfficientNet-B0)

### 4.1 Laporan Klasifikasi (*Test Set*)

| Kategori Sampah | Precision | Recall | F1-Score | Jumlah Sampel |
|---|:---:|:---:|:---:|:---:|
| **Cardboard Boxes** | 0.88 | 0.95 | 0.91 | 22 |
| **Glass Bottles** | 0.74 | 0.88 | 0.80 | 16 |
| **Glass Shards** | 0.92 | 0.92 | 0.92 | 12 |
| **Jug** | 1.00 | 0.93 | 0.97 | 15 |
| **Metal Can** | 0.83 | 0.96 | 0.89 | 26 |
| **Paper** | 1.00 | 0.75 | 0.86 | 12 |
| **Paper Bag** | 0.89 | 0.80 | 0.84 | 20 |
| **Paper Cup** | 0.92 | 0.92 | 0.92 | 12 |
| **Plastic Bottle** | 0.95 | 0.87 | 0.91 | 23 |
| **Plastic Cup** | 0.91 | 0.95 | 0.93 | 21 |
| **Plastic bag** | 0.90 | 0.95 | 0.92 | 20 |
| **food waste** | 1.00 | 0.83 | 0.91 | 18 |
| **Rata-rata Makro / Akurasi** | **0.91** | **0.90** | **0.90** | **Total: 217** |

### 4.2 Analisis Kesalahan (*Error Analysis*)
* **Botol Kaca vs Botol Plastik Transparan:** Sebagian botol kaca bening terklasifikasi sebagai botol plastik karena kemiripan transparansi pada pencahayaan tinggi.
* **Human-in-the-Loop:** Temuan ini memperkuat keputusan desain TRASHURY untuk tetap menyertakan tombol koreksi manual bagi operator kasir (`sumber_klasifikasi: 'manual'`).

---

## 5. Pengembangan Lanjutan: Object Detection (YOLOv8-Nano)

Sebagai pelengkap visual dan deteksi multi-objek pada meja penimbangan, dikembangkan model **YOLOv8-Nano** menggunakan pendekatan *Weakly-Supervised Auto-Annotation* (memanfaatkan model fondasi YOLO-World untuk membuat koordinat *bounding box* otomatis):

* **Model:** YOLOv8-Nano (`yolov8n.pt`)
* **Ukuran Berkas ONNX:** **$11.77\text{ MB}$**
* **Tensor Masukan:** `images` $[1, 3, 640, 640]$
* **Tensor Keluaran:** `output0` $[1, 16, 8400]$ (4 koordinat $xywh$ + 12 probabilitas kelas)
* **Kecepatan Inferensi:** $< 60\text{ ms}$ pada CPU laptop standar.

---

## 6. Ekspor Model ke ONNX & Integrasi Frontend PWA

Model diekspor ke format terbuka **ONNX (*Open Neural Network Exchange*)** dengan parameter:
* `opset_version = 14`
* `dynamic_axes = {"input": {0: "batch_size"}, "output": {0: "batch_size"}}`
* Seluruh bobot tersimpan langsung dalam berkas terkompresi.

### Parameter Preprocessing Kanvas:
```typescript
export const KONFIGURASI_PREPROCESSING_AI = {
  klasifikasi: {
    lebar: 224,
    tinggi: 224,
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
  },
  deteksi: {
    lebar: 640,
    tinggi: 640,
  },
};
```

Logika penerjemahan *raw logits* ke persentase keyakinan diimplementasikan pada modul [`@trashury/shared`](../shared/src/kategoriSampah.ts) menggunakan fungsi Softmax:
$$\text{Softmax}(z_i) = \frac{e^{z_i - \max(z)}}{\sum_j e^{z_j - \max(z)}}$$

---

## 7. Metodologi Perhitungan Reduksi Emisi $\text{CO}_2\text{e}$

### 7.1 Landasan Ilmiah
Perhitungan pengurangan emisi gas rumah kaca (GRK) mengacu pada metodologi *Life Cycle Assessment* (LCA) dan faktor emisi daur ulang yang diadopsi dari **IPCC Guidelines for National Greenhouse Gas Inventories** serta data publikasi Kementerian Lingkungan Hidup dan Kehutanan (KLHK).

Emisi yang terhindar dihitung dari selisih energi proses produksi material baru (*virgin material*) dibandingkan material daur ulang (*recycled material*), ditambah emisi gas metana yang dicegah dari penimbunan di TPA (*landfill methane avoidance*).

### 7.2 Rumus Perhitungan
Untuk setiap baris setoran sampah ke-$i$:
$$\text{Subtotal CO}_2\text{e}_i = \text{berat\_kg}_i \times \text{faktor\_co2e\_per\_kg}_i$$
$$\text{Total CO}_2\text{e} = \sum_{i=1}^{n} \text{Subtotal CO}_2\text{e}_i$$

Hasil dibulatkan hingga 4 desimal menggunakan fungsi [`bulatkanCo2e`](../shared/src/perhitungan.ts).

### 7.3 Tabel Faktor Emisi Acuan

| Kategori Sampah | Faktor Emisi ($\text{kg CO}_2\text{e} / \text{kg}$) | Harga Acuan / kg | Dasar Pertimbangan Lingkungan |
|---|:---:|:---:|---|
| **Kaleng / Logam** | **4.00** | Rp 4.000 | Penghematan energi peleburan bijih bauksit/besi hingga 95% |
| **Botol Plastik (PET)** | **2.10** | Rp 3.500 | Menghindari pengolahan polimer minyak bumi mentah |
| **Jeriken / Botol HDPE** | **1.80** | Rp 3.000 | Mengurangi kebutuhan monomer etilena primer |
| **Gelas Plastik (PP)** | **1.70** | Rp 2.500 | Pengurangan limbah polipropilena sekali pakai |
| **Kertas / HVS / Buku** | **1.30** | Rp 1.200 | Mencegah penebangan pohon dan dekomposisi anaerobik di TPA |
| **Kantong Plastik / Kresek** | **1.20** | Rp 500 | Daur ulang film plastik LDPE |
| **Kardus / Karton** | **1.10** | Rp 1.500 | Pengurangan beban pulp kayu dan emisi metana TPA |
| **Kantong Kertas** | **1.00** | Rp 1.000 | Penghematan siklus daur ulang serat kertas kraft |
| **Gelas Kertas** | **0.50** | Rp 500 | Daur ulang serat selulosa laminasi |
| **Botol Kaca Utuh** | **0.35** | Rp 500 | Daur ulang/pemanfaatan kembali botol kaca (hemat energi *cullet*) |
| **Pecahan Kaca** | **0.30** | Rp 200 | Penghematan energi peleburan bahan baku pasir silika |
| **Sampah Makanan / Organik** | **0.25** | Rp 0 | Mencegah timbulan gas metana ($\text{CH}_4$) melalui pengomposan |

---

## 8. Metodologi Peramalan Volume Setoran (*Time-Series Forecasting*, #25)

Untuk membantu pengurus bank sampah dalam perencanaan kapasitas gudang depo, pemesanan truk pengangkut pengepul, dan estimasi kesiapan dana kas operasional, TRASHURY dilengkapi mesin peramalan deret waktu (*time-series forecasting engine*).

### 8.1 Model & Algoritma
Mesin peramalan pada [`shared/src/forecasting.ts`](../shared/src/forecasting.ts) mengombinasikan dua metode statistik:
1. **Holt's Linear Exponential Smoothing ($N \ge 3\text{ bulan}$):**
   * Menyesuaikan nilai dasar (*Level* $L_t$) dan kemiringan tren (*Trend* $T_t$) dengan parameter pemulusan $\alpha = 0.5$ dan $\beta = 0.3$:
     $$L_t = \alpha Y_t + (1 - \alpha)(L_{t-1} + T_{t-1})$$
     $$T_t = \beta(L_t - L_{t-1}) + (1 - \beta)T_{t-1}$$
     $$\hat{Y}_{t+h} = L_t + h \cdot T_t$$
2. **Regresi Linear & Weighted Moving Average ($N < 3\text{ bulan}$):**
   * Sebagai *fallback* saat bank sampah baru beroperasi dan data historis masih terbatas (*cold start*).

### 8.2 Estimasi Multi-Dimensi (Beban Fisik, Finansial, dan Lingkungan)
Setiap angka proyeksi berat ($\text{kg}$) untuk $h$ bulan mendatang secara otomatis dikonversikan menjadi:
* **Estimasi Kas Uang:** $\hat{Y} \times \text{harga\_per\_kg}$ (kebutuhan kas penarikan).
* **Estimasi Reduksi Karbon:** $\hat{Y} \times \text{faktor\_co2e\_per\_kg}$ (target emisi hijau DLH).
* **Interval Ketidakpastian (Error Margin):** Menghitung batas bawah dan batas atas $\pm \text{RMSE}$ (*Root Mean Square Error*).

---

## 9. Verifikasi & Pengujian Kode
Seluruh logika kalkulasi, pemetaan model AI, dan mesin forecasting telah diverifikasi melalui pengujian otomatis Vitest:
* [`shared/src/perhitungan.test.ts`](../shared/src/perhitungan.test.ts)
* [`shared/src/kategoriSampah.test.ts`](../shared/src/kategoriSampah.test.ts)
* [`shared/src/forecasting.test.ts`](../shared/src/forecasting.test.ts)

Hasil pengujian: **100% lulus (65/65 tests passing)** pada CI.
