PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS nasabah (
    id_nasabah   TEXT PRIMARY KEY,
    nama         TEXT    NOT NULL,
    nomor_hp     TEXT,
    alamat       TEXT,
    total_saldo  INTEGER NOT NULL DEFAULT 0 CHECK (total_saldo >= 0),
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_nasabah_nama ON nasabah (nama);

CREATE TABLE IF NOT EXISTS operator (
    id_operator    TEXT PRIMARY KEY,
    nama           TEXT NOT NULL,
    username       TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    peran          TEXT NOT NULL DEFAULT 'operator'
                        CHECK (peran IN ('operator', 'pengurus')),
    created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS kategori_sampah (
    id_kategori         TEXT PRIMARY KEY,
    nama_kategori       TEXT    NOT NULL UNIQUE,
    harga_per_kg        INTEGER NOT NULL CHECK (harga_per_kg >= 0),
    faktor_co2e_per_kg  REAL    NOT NULL CHECK (faktor_co2e_per_kg >= 0),
    aktif               INTEGER NOT NULL DEFAULT 1 CHECK (aktif IN (0, 1))
);

CREATE TABLE IF NOT EXISTS transaksi (
    id_transaksi    TEXT PRIMARY KEY,
    id_nasabah      TEXT    NOT NULL REFERENCES nasabah (id_nasabah)  ON DELETE RESTRICT,
    id_operator     TEXT    NOT NULL REFERENCES operator (id_operator) ON DELETE RESTRICT,
    tanggal         TEXT    NOT NULL,
    jenis_transaksi TEXT    NOT NULL DEFAULT 'setoran'
                            CHECK (jenis_transaksi IN ('setoran')),
    total_nominal   INTEGER NOT NULL DEFAULT 0 CHECK (total_nominal >= 0),
    total_co2e      REAL    NOT NULL DEFAULT 0 CHECK (total_co2e    >= 0),
    sync_status     TEXT    NOT NULL DEFAULT 'pending'
                            CHECK (sync_status IN ('pending', 'synced', 'conflict')),
    synced_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_transaksi_nasabah ON transaksi (id_nasabah, tanggal);
CREATE INDEX IF NOT EXISTS idx_transaksi_tanggal ON transaksi (tanggal);
CREATE INDEX IF NOT EXISTS idx_transaksi_sync    ON transaksi (sync_status)
    WHERE sync_status <> 'synced';

CREATE TABLE IF NOT EXISTS detail_transaksi (
    id_detail          TEXT PRIMARY KEY,
    id_transaksi       TEXT    NOT NULL REFERENCES transaksi (id_transaksi)       ON DELETE CASCADE,
    id_kategori        TEXT    NOT NULL REFERENCES kategori_sampah (id_kategori)  ON DELETE RESTRICT,
    berat_kg           REAL    NOT NULL CHECK (berat_kg > 0),
    url_foto_sampah    TEXT,
    sumber_klasifikasi TEXT    NOT NULL DEFAULT 'manual'
                               CHECK (sumber_klasifikasi IN ('ai', 'manual')),
    subtotal_harga     INTEGER NOT NULL CHECK (subtotal_harga >= 0),
    subtotal_co2e      REAL    NOT NULL CHECK (subtotal_co2e  >= 0)
);

CREATE INDEX IF NOT EXISTS idx_detail_transaksi ON detail_transaksi (id_transaksi);
CREATE INDEX IF NOT EXISTS idx_detail_kategori  ON detail_transaksi (id_kategori);

CREATE TABLE IF NOT EXISTS penarikan_saldo (
    id_penarikan  TEXT PRIMARY KEY,
    id_nasabah    TEXT    NOT NULL REFERENCES nasabah (id_nasabah)   ON DELETE RESTRICT,
    id_operator   TEXT    NOT NULL REFERENCES operator (id_operator) ON DELETE RESTRICT,
    tanggal       TEXT    NOT NULL,
    jumlah_tarik  INTEGER NOT NULL CHECK (jumlah_tarik > 0),
    saldo_sisa    INTEGER NOT NULL CHECK (saldo_sisa >= 0),
    sync_status   TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (sync_status IN ('pending', 'synced', 'conflict')),
    synced_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_penarikan_nasabah ON penarikan_saldo (id_nasabah, tanggal);
CREATE INDEX IF NOT EXISTS idx_penarikan_sync    ON penarikan_saldo (sync_status)
    WHERE sync_status <> 'synced';

CREATE TRIGGER IF NOT EXISTS trg_setoran_tambah_saldo
AFTER INSERT ON transaksi
BEGIN
    UPDATE nasabah
       SET total_saldo = total_saldo + NEW.total_nominal,
           updated_at  = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     WHERE id_nasabah  = NEW.id_nasabah;
END;

CREATE TRIGGER IF NOT EXISTS trg_penarikan_kurangi_saldo
AFTER INSERT ON penarikan_saldo
BEGIN
    UPDATE nasabah
       SET total_saldo = total_saldo - NEW.jumlah_tarik,
           updated_at  = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     WHERE id_nasabah  = NEW.id_nasabah;
END;

CREATE VIEW IF NOT EXISTS v_buku_tabungan AS
    SELECT id_nasabah,
           tanggal,
           'setoran'      AS jenis,
           total_nominal  AS nominal,
           total_co2e     AS co2e,
           id_transaksi   AS id_acuan
      FROM transaksi
    UNION ALL
    SELECT id_nasabah,
           tanggal,
           'penarikan'    AS jenis,
           -jumlah_tarik  AS nominal,
           0              AS co2e,
           id_penarikan   AS id_acuan
      FROM penarikan_saldo;

CREATE VIEW IF NOT EXISTS v_rekap_bulanan AS
    SELECT substr(t.tanggal, 1, 7)      AS bulan,
           k.nama_kategori,
           SUM(d.berat_kg)              AS total_berat_kg,
           SUM(d.subtotal_harga)        AS total_nilai_rupiah,
           SUM(d.subtotal_co2e)         AS total_co2e_kg
      FROM transaksi t
      JOIN detail_transaksi d ON d.id_transaksi = t.id_transaksi
      JOIN kategori_sampah  k ON k.id_kategori  = d.id_kategori
     GROUP BY bulan, k.nama_kategori;
