-- Database Schema for Perencanaan Keuangan Keluarga
CREATE DATABASE IF NOT EXISTS `finplan_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `finplan_db`;

-- Pengaturan / Info Profil Keluarga (Tahun, Catatan, Kekayaan Akhir, dsb)
CREATE TABLE IF NOT EXISTS `settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `plan_year` INT NOT NULL DEFAULT 2026,
    `family_notes` VARCHAR(255) DEFAULT 'PAPI SIMPAN, MAMI SIMPAN | UMUR DEDE: 8 Tahun, Kelas: 2',
    `target_kekayaan` DECIMAL(15,2) DEFAULT 15150000.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Kategori (Pendapatan vs Pengeluaran & Sub-Kelompok Kategori)
CREATE TABLE IF NOT EXISTS `categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `type` ENUM('income', 'expense') NOT NULL,
    `group_name` VARCHAR(100) NOT NULL, -- e.g. Tagihan Rumah Tangga, Cicilan, Tabungan & Investasi, Transportasi, Kebutuhan Bulanan, Edukasi, Asuransi, Hiburan & Rekreasi, Lainnya, Pendapatan
    `is_investment` TINYINT(1) DEFAULT 0, -- 1 jika tabungan/investasi (untuk bedakan Pengeluaran Aktual vs Tabungan)
    `sort_order` INT DEFAULT 0
) ENGINE=InnoDB;

-- Pos Anggaran / Item Perencanaan
CREATE TABLE IF NOT EXISTS `budget_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `category_id` INT NOT NULL,
    `item_name` VARCHAR(150) NOT NULL,
    `sort_order` INT DEFAULT 0,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Nilai Rencana Per Bulan (1 - 12) + Bulan 0 untuk Des Tahun Lalu jika ada
CREATE TABLE IF NOT EXISTS `budget_monthly_values` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `budget_item_id` INT NOT NULL,
    `plan_year` INT NOT NULL,
    `month` INT NOT NULL, -- 0 = Des Prev, 1 = Jan, 2 = Feb, ... 12 = Des
    `amount` DECIMAL(15,2) DEFAULT 0.00,
    UNIQUE KEY `unique_item_month_year` (`budget_item_id`, `plan_year`, `month`),
    FOREIGN KEY (`budget_item_id`) REFERENCES `budget_items`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Agenda / Catatan Penting Bulanan Sepanjang Tahun (Calendar / Event Timeline)
CREATE TABLE IF NOT EXISTS `monthly_agenda` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `plan_year` INT NOT NULL,
    `month` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `estimated_cost` DECIMAL(15,2) DEFAULT 0.00,
    `is_completed` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
