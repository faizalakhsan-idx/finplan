# Petunjuk Instalasi & Menjalankan FinPlan

Web App **Perencanaan Keuangan Keluarga (FinPlan)** telah dibuat dengan spesifikasi:
- **Kiblat UI/UX**: Material Design by Google (Clean, surface tinting, typography Roboto/Plus Jakarta Sans, Material Symbols, Snackbar toast, elevation & modal dialogs).
- **Semua Agenda Bulanan Sepanjang Tahun dalam 1 Halaman**:
  - Grid 12 Bulan (Januari s.d. Desember) dengan milestone kartu agenda, indikator ceklis, dan estimasi biaya.
  - Matriks Tabel Tahunan (Des '25, Jan s.d. Des, Total Setahun) dengan fitur **inline-editing langsung klik sel nominal**.
- **Tanpa Dropdown Tradisional untuk Banyak Data**:
  - Menggunakan komponen **Autocomplete cerdas** pada pemilihan kategori pos anggaran, nama pos, dan pencarian agenda.
- **Database MySQL / phpMyAdmin**:
  - Database: `finplan_db`
  - Koneksi: `localhost`, user `root`, password `""` (default XAMPP).

---

## Cara Akses di Browser:
1. Pastikan **Apache** dan **MySQL** di XAMPP Control Panel sudah aktif (Running).
2. Buka browser Anda dan kunjungi URL:
   `http://localhost/finplan/`
3. Untuk mengecek atau mengelola database via phpMyAdmin:
   `http://localhost/phpmyadmin/` -> pilih database **`finplan_db`**.

---

## File Penting:
- `index.html`: Antarmuka utama Material Design 1 halaman penuh.
- `app.js`: Logika interaktif, autocomplete, inline-edit, dan kalkulasi dinamis.
- `api.php`: REST API backend PHP untuk simpan, update cell, dan filter data.
- `config.php`: Koneksi database PDO MySQL.
- `database.sql`: Skema tabel database.
- `seed.php`: Inisialisasi data awal dari spreadsheet perencanaan keuangan keluarga.
