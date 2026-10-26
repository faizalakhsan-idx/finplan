<?php
// seed.php - Import initial data from CSV/Excel into finplan_db
require_once 'config.php';

try {
    $pdo = getDB();

    // Pastikan database dan tabel sudah ada
    $sqlSchema = file_get_contents(__DIR__ . '/database.sql');
    $pdo->exec($sqlSchema);
    $pdo->exec("USE `finplan_db`");

    // Bersihkan data lama jika seeding ulang
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("TRUNCATE TABLE budget_monthly_values;");
    $pdo->exec("TRUNCATE TABLE budget_items;");
    $pdo->exec("TRUNCATE TABLE categories;");
    $pdo->exec("TRUNCATE TABLE settings;");
    $pdo->exec("TRUNCATE TABLE monthly_agenda;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    // Insert Settings
    $stmt = $pdo->prepare("INSERT INTO settings (plan_year, family_notes, target_kekayaan) VALUES (?, ?, ?)");
    $stmt->execute([2026, 'PAPI SIMPAN, MAMI SIMPAN | UMUR DEDE: 8 Tahun, Kelas: 2', 15150000]);

    // Data Master Kategori & Item berdasarkan data CSV
    $structure = [
        [
            'type' => 'income',
            'group' => 'Pendapatan',
            'is_investment' => 0,
            'items' => [
                'Gaji' => [0, 8036000, 8110000, 8110000, 8110000, 8110000, 8110000, 8110000, 8110000, 8110000, 8110000, 8110000, 8110000],
                'THR' => [0, 0, 0, 8000000, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                'Tabungan' => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                'Lainnya' => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ]
        ],
        [
            'type' => 'expense',
            'group' => 'Tagihan Rumah Tangga',
            'is_investment' => 0,
            'items' => [
                'Wifi Banjaran' => [0, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000],
                'Listrik Banjaran' => [0, 55000, 55000, 55000, 55000, 55000, 55000, 55000, 55000, 55000, 55000, 55000, 55000],
                'Data' => [0, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000],
                'Air PDAM' => [0, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000],
                'Galon' => [0, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000],
            ]
        ],
        [
            'type' => 'expense',
            'group' => 'Cicilan',
            'is_investment' => 0,
            'items' => [
                'CC BCA' => [0, 268000, 268000, 268000, 268000, 268000, 268000, 268000, 268000, 268000, 268000, 268000, 268000],
                'CC BRI' => [0, 175000, 175000, 175000, 175000, 175000, 175000, 175000, 175000, 175000, 175000, 175000, 175000],
                'Spin' => [0, 594379, 594379, 354371, 354371, 354371, 263809, 135843, 0, 0, 0, 0, 0],
            ]
        ],
        [
            'type' => 'expense',
            'group' => 'Tabungan & Investasi',
            'is_investment' => 1,
            'items' => [
                'Tabungan Umum' => [0, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000],
                'Dana Darurat (BCA Papi)' => [0, 100000, 100000, 100000, 100000, 100000, 100000, 150000, 150000, 150000, 150000, 150000, 150000],
                'Valas (SGD Singapore)' => [0, 0, 0, 0, 0, 0, 0, 0, 50000, 50000, 50000, 50000, 50000],
                'Tabungan Sekolah + Dede' => [0, 150000, 150000, 200000, 200000, 200000, 200000, 200000, 200000, 200000, 200000, 200000, 200000],
                'Logam Mulia (Krom Mami)' => [0, 200000, 200000, 5500000, 200000, 200000, 200000, 200000, 200000, 200000, 200000, 200000, 200000],
                'Saham' => [0, 100000, 100000, 100000, 0, 0, 100000, 100000, 100000, 100000, 100000, 100000, 100000],
                'Tabungan Pribadi Dede' => [0, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000],
                'Tabungan Liburan (Krom Mami)' => [0, 200000, 200000, 200000, 200000, 200000, 200000, 200000, 200000, 200000, 200000, 200000, 200000],
            ]
        ],
        [
            'type' => 'expense',
            'group' => 'Transportasi',
            'is_investment' => 0,
            'items' => [
                'Bensin' => [0, 100000, 100000, 100000, 100000, 100000, 100000, 100000, 100000, 100000, 100000, 100000, 100000],
                'SPKLU' => [0, 180000, 180000, 180000, 180000, 180000, 180000, 180000, 180000, 180000, 180000, 180000, 180000],
                'Servis Aira-Cantika' => [0, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000],
                'SIM A + C' => [0, 15000, 15000, 15000, 15000, 15000, 15000, 15000, 15000, 15000, 15000, 15000, 15000],
                'Pajak Motor - Cantika' => [0, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000],
                'Pajak Mobil - Aira' => [0, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000],
                'Modifikasi Mobil' => [0, 250000, 250000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000],
            ]
        ],
        [
            'type' => 'expense',
            'group' => 'Kebutuhan Bulanan',
            'is_investment' => 0,
            'items' => [
                'Lauk' => [0, 800000, 800000, 800000, 800000, 800000, 800000, 800000, 800000, 800000, 800000, 800000, 800000],
                'Groceries & Alat Mandi' => [0, 550000, 550000, 550000, 550000, 550000, 550000, 550000, 550000, 550000, 550000, 550000, 550000],
                'Dede' => [0, 400000, 400000, 400000, 400000, 400000, 400000, 400000, 400000, 400000, 400000, 400000, 400000],
            ]
        ],
        [
            'type' => 'expense',
            'group' => 'Edukasi',
            'is_investment' => 0,
            'items' => [
                'Spp dede' => [0, 250000, 250000, 250000, 250000, 250000, 250000, 250000, 250000, 250000, 250000, 250000, 250000],
                'Ekskul Club' => [0, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000],
                'Dede Quomus' => [0, 100000, 100000, 100000, 100000, 100000, 100000, 100000, 100000, 100000, 100000, 100000, 100000],
                'Uang Kas Sekolah' => [0, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000],
            ]
        ],
        [
            'type' => 'expense',
            'group' => 'Asuransi',
            'is_investment' => 0,
            'items' => [
                'BPJS Kesehatan' => [0, 105000, 105000, 105000, 105000, 105000, 105000, 105000, 105000, 105000, 105000, 105000, 105000],
                'BPJS Tenaga Kerja' => [0, 48000, 48000, 48000, 48000, 48000, 48000, 48000, 48000, 48000, 48000, 48000, 48000],
            ]
        ],
        [
            'type' => 'expense',
            'group' => 'Hiburan & Rekreasi',
            'is_investment' => 0,
            'items' => [
                'Jajan Semua' => [0, 600000, 600000, 600000, 600000, 600000, 600000, 600000, 600000, 600000, 600000, 600000, 600000],
                'Jajan Mami' => [0, 375000, 375000, 375000, 375000, 375000, 375000, 375000, 375000, 375000, 375000, 375000, 375000],
                'Jajan Papi' => [0, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000],
            ]
        ],
        [
            'type' => 'expense',
            'group' => 'Lainnya',
            'is_investment' => 0,
            'items' => [
                'Renovasi (Krom)' => [0, 0, 0, 250000, 250000, 250000, 250000, 250000, 250000, 250000, 250000, 250000, 250000],
                'Bonsai' => [0, 500000, 500000, 750000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000],
                'Banjaran' => [0, 500000, 500000, 750000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000],
                'Agenda Keluarga' => [0, 0, 0, 2000000, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ]
        ],
    ];

    $catOrder = 1;
    $itemOrder = 1;

    $stmtCat = $pdo->prepare("INSERT INTO categories (type, group_name, is_investment, sort_order) VALUES (?, ?, ?, ?)");
    $stmtItem = $pdo->prepare("INSERT INTO budget_items (category_id, item_name, sort_order) VALUES (?, ?, ?)");
    $stmtVal = $pdo->prepare("INSERT INTO budget_monthly_values (budget_item_id, plan_year, month, amount) VALUES (?, ?, ?, ?)");

    foreach ($structure as $groupData) {
        $stmtCat->execute([
            $groupData['type'],
            $groupData['group'],
            $groupData['is_investment'],
            $catOrder++
        ]);
        $catId = $pdo->lastInsertId();

        foreach ($groupData['items'] as $itemName => $amounts) {
            $stmtItem->execute([$catId, $itemName, $itemOrder++]);
            $itemId = $pdo->lastInsertId();

            // amounts index 0 is Dec prev year, 1 is Jan ... 12 is Dec
            for ($m = 0; $m <= 12; $m++) {
                $val = isset($amounts[$m]) ? $amounts[$m] : 0;
                $stmtVal->execute([$itemId, 2026, $m, $val]);
            }
        }
    }

    // Insert sample Agenda Bulanan 2026
    $stmtAgenda = $pdo->prepare("INSERT INTO monthly_agenda (plan_year, month, title, description, estimated_cost, is_completed) VALUES (?, ?, ?, ?, ?, ?)");
    $agendas = [
        [2026, 3, 'THR & Bonus Kinerja', 'Penerimaan tunjangan hari raya dan alokasi ke tabungan emas/LM', 8000000, 0],
        [2026, 3, 'Agenda Mudik / Keluarga', 'Kumpul keluarga besar dan silaturahmi', 2000000, 0],
        [2026, 3, 'Beli Logam Mulia (Krom Mami)', 'Pembelian LM fisik/tabungan emas dengan alokasi THR', 5500000, 0],
        [2026, 6, 'Kenaikan Kelas Dede & Tahun Ajaran Baru', 'Evaluasi kenaikan kelas 3 dan persiapan buku/seragam', 500000, 0],
        [2026, 7, 'Pelunasan Cicilan Spin Terakhir', 'Cicilan Spin selesai/lunas per bulan Juli', 135843, 0],
        [2026, 8, 'Mulai Alokasi Valas SGD', 'Diversifikasi tabungan valuta asing SGD Singapura', 50000, 0],
        [2026, 12, 'Review Keuangan Akhir Tahun', 'Mencapai target kekayaan akhir tahun Rp 15.150.000', 0, 0],
    ];

    foreach ($agendas as $ag) {
        $stmtAgenda->execute($ag);
    }

    echo "DATABASE & SEED DATA BERHASIL DIISI!\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
