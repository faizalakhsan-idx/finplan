# Panduan Deployment ke Vercel (FinPlan Keluarga)

Aplikasi FinPlan telah disesuaikan dengan arsitektur **Vercel Serverless Function** sehingga dapat dideploy ke Vercel tanpa error dan tetap bisa dijalankan di **Localhost XAMPP**.

---

## 📁 Struktur File untuk Vercel:
```text
finplan/
├── api/
│   └── index.js       -> Serverless Function untuk Vercel (Node.js + MySQL2)
├── public/
│   ├── index.html     -> Halaman utama (Material Design UI)
│   └── app.js         -> Logika Frontend (Otomatis deteksi Vercel / Localhost)
├── database.sql       -> Skema SQL untuk import ke Cloud MySQL
├── vercel.json        -> Konfigurasi routing serverless Vercel
├── package.json       -> Dependensi (mysql2)
├── .gitignore         -> Mencegah upload node_modules & env
├── config.php         -> (Tetap ada) Untuk akses via XAMPP Localhost
├── api.php            -> (Tetap ada) Untuk akses via XAMPP Localhost
└── README.md
```

---

## 🚀 Langkah Deploy ke Vercel:

### 1. Buat Database MySQL Cloud Gratis
Vercel adalah serverless (tidak memiliki MySQL internal), maka buat MySQL cloud gratis melalui salah satu provider berikut:
- **Aiven for MySQL** (Rekomendasi, gratis & stabil): [https://aiven.io/](https://aiven.io/)
- **TiDB Cloud** (Gratis 5GB Serverless MySQL): [https://tidbcloud.com/](https://tidbcloud.com/)
- **Clever Cloud**: [https://www.clever-cloud.com/](https://www.clever-cloud.com/)

Setelah database dibuat, buka tool query (atau phpMyAdmin/DBeaver) dan jalankan isi query dari file **`database.sql`** untuk membuat tabelnya.

---

### 2. Push ke GitHub / GitLab
1. Buat repositori baru di GitHub (misal: `finplan-keluarga`).
2. Upload / push semua file di folder ini ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Vercel"
   git branch -M main
   git remote add origin https://github.com/USERNAME/finplan-keluarga.git
   git push -u origin main
   ```

---

### 3. Deploy di Vercel
1. Buka [https://vercel.com/](https://vercel.com/) dan login.
2. Klik **"Add New..."** -> **"Project"**.
3. Pilih repositori GitHub Anda dan klik **"Import"**.
4. Di bagian **Environment Variables**, tambahkan koneksi database Anda:
   - **`DATABASE_URL`**: URL koneksi MySQL (contoh: `mysql://avnadmin:password@mysql-xxx.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED`)
   *Atau gunakan variabel terpisah:*
   - `DB_HOST`: Host MySQL cloud
   - `DB_USER`: Username MySQL cloud
   - `DB_PASSWORD`: Password MySQL cloud
   - `DB_NAME`: Nama database (misal: `defaultdb` atau `finplan_db`)
   - `DB_PORT`: Port MySQL (biasanya `3306` atau port dari provider)
5. Klik **"Deploy"**.

---

### 💡 Catatan:
- **Mode Demo (Safety Fallback)**: Jika Anda mendeploy tanpa mengisi `DATABASE_URL`, aplikasi **TIDAK AKAN ERROR**. Aplikasi otomatis berjalan dalam mode demo dengan data awal sehingga Anda bisa langsung mencoba tampilannya di URL Vercel.
- **Dual Support**: Kode di `app.js` sudah dilengkapi auto-detection:
  - Jika diakses lewat `http://localhost/finplan/`, aplikasi menggunakan **`api.php`** (XAMPP).
  - Jika diakses lewat domain Vercel (`*.vercel.app`), aplikasi menggunakan **`/api`** (Serverless Node.js).
