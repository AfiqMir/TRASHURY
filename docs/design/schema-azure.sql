CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS nasabah (
    id_nasabah   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nama         TEXT        NOT NULL,
    nomor_hp     TEXT,
    alamat       TEXT,
    total_saldo  BIGINT      NOT NULL DEFAULT 0 CHECK (total_saldo >= 0),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nasabah_nama ON nasabah (nama);

CREATE TABLE IF NOT EXISTS operator (
    id_operator   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nama          TEXT        NOT NULL,
    username      TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    peran         TEXT        NOT NULL DEFAULT 'operator'
                              CHECK (peran IN ('operator', 'pengurus')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kategori_sampah (
    id_kategori        UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kategori      TEXT   NOT NULL UNIQUE,
    harga_per_kg       BIGINT NOT NULL CHECK (harga_per_kg >= 0),
    faktor_co2e_per_kg NUMERIC(10, 4) NOT NULL CHECK (faktor_co2e_per_kg >= 0),
    aktif              BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS transaksi (
    id_transaksi    UUID        PRIMARY KEY,
    id_nasabah      UUID        NOT NULL REFERENCES nasabah (id_nasabah)   ON DELETE RESTRICT,
    id_operator     UUID        NOT NULL REFERENCES operator (id_operator) ON DELETE RESTRICT,
    tanggal         TIMESTAMPTZ NOT NULL,
    jenis_transaksi TEXT        NOT NULL DEFAULT 'setoran'
                                CHECK (jenis_transaksi IN ('setoran')),
    total_nominal   BIGINT      NOT NULL DEFAULT 0 CHECK (total_nominal >= 0),
    total_co2e      NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (total_co2e >= 0),
    diterima_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaksi_nasabah ON transaksi (id_nasabah, tanggal);
CREATE INDEX IF NOT EXISTS idx_transaksi_tanggal ON transaksi (tanggal);

CREATE TABLE IF NOT EXISTS detail_transaksi (
    id_detail          UUID   PRIMARY KEY,
    id_transaksi       UUID   NOT NULL REFERENCES transaksi (id_transaksi)      ON DELETE CASCADE,
    id_kategori        UUID   NOT NULL REFERENCES kategori_sampah (id_kategori) ON DELETE RESTRICT,
    berat_kg           NUMERIC(10, 2) NOT NULL CHECK (berat_kg > 0),
    url_foto_sampah    TEXT,
    sumber_klasifikasi TEXT   NOT NULL DEFAULT 'manual'
                              CHECK (sumber_klasifikasi IN ('ai', 'manual')),
    subtotal_harga     BIGINT NOT NULL CHECK (subtotal_harga >= 0),
    subtotal_co2e      NUMERIC(12, 4) NOT NULL CHECK (subtotal_co2e >= 0)
);

CREATE INDEX IF NOT EXISTS idx_detail_transaksi ON detail_transaksi (id_transaksi);
CREATE INDEX IF NOT EXISTS idx_detail_kategori  ON detail_transaksi (id_kategori);

CREATE TABLE IF NOT EXISTS penarikan_saldo (
    id_penarikan UUID        PRIMARY KEY,
    id_nasabah   UUID        NOT NULL REFERENCES nasabah (id_nasabah)   ON DELETE RESTRICT,
    id_operator  UUID        NOT NULL REFERENCES operator (id_operator) ON DELETE RESTRICT,
    tanggal      TIMESTAMPTZ NOT NULL,
    jumlah_tarik BIGINT      NOT NULL CHECK (jumlah_tarik > 0),
    saldo_sisa   BIGINT      NOT NULL CHECK (saldo_sisa >= 0),
    diterima_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_penarikan_nasabah ON penarikan_saldo (id_nasabah, tanggal);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nasabah_updated_at ON nasabah;
CREATE TRIGGER trg_nasabah_updated_at
    BEFORE UPDATE ON nasabah
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION setoran_tambah_saldo() RETURNS TRIGGER AS $$
BEGIN
    UPDATE nasabah
       SET total_saldo = total_saldo + NEW.total_nominal
     WHERE id_nasabah  = NEW.id_nasabah;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_setoran_tambah_saldo ON transaksi;
CREATE TRIGGER trg_setoran_tambah_saldo
    AFTER INSERT ON transaksi
    FOR EACH ROW EXECUTE FUNCTION setoran_tambah_saldo();

CREATE OR REPLACE FUNCTION penarikan_kurangi_saldo() RETURNS TRIGGER AS $$
BEGIN
    UPDATE nasabah
       SET total_saldo = total_saldo - NEW.jumlah_tarik
     WHERE id_nasabah  = NEW.id_nasabah;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_penarikan_kurangi_saldo ON penarikan_saldo;
CREATE TRIGGER trg_penarikan_kurangi_saldo
    AFTER INSERT ON penarikan_saldo
    FOR EACH ROW EXECUTE FUNCTION penarikan_kurangi_saldo();

CREATE OR REPLACE VIEW v_buku_tabungan AS
    SELECT id_nasabah,
           tanggal,
           'setoran'::TEXT AS jenis,
           total_nominal   AS nominal,
           total_co2e      AS co2e,
           id_transaksi    AS id_acuan
      FROM transaksi
    UNION ALL
    SELECT id_nasabah,
           tanggal,
           'penarikan'::TEXT AS jenis,
           -jumlah_tarik     AS nominal,
           0                 AS co2e,
           id_penarikan      AS id_acuan
      FROM penarikan_saldo;

CREATE OR REPLACE VIEW v_rekap_bulanan AS
    SELECT to_char(t.tanggal, 'YYYY-MM') AS bulan,
           k.nama_kategori,
           SUM(d.berat_kg)               AS total_berat_kg,
           SUM(d.subtotal_harga)         AS total_nilai_rupiah,
           SUM(d.subtotal_co2e)          AS total_co2e_kg
      FROM transaksi t
      JOIN detail_transaksi d ON d.id_transaksi = t.id_transaksi
      JOIN kategori_sampah  k ON k.id_kategori  = d.id_kategori
     GROUP BY 1, 2;
