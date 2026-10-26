<?php
// api.php - REST API for FinPlan
require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDB();
$pdo->exec("USE `finplan_db`");

$action = isset($_GET['action']) ? $_GET['action'] : '';
$year = isset($_GET['year']) ? intval($_GET['year']) : 2026;

// Handle JSON input
$input = json_decode(file_get_contents('php://input'), true);

switch ($action) {
    case 'get_data':
        // Ambil Data Settings
        $stmtSettings = $pdo->prepare("SELECT * FROM settings WHERE plan_year = ? LIMIT 1");
        $stmtSettings->execute([$year]);
        $settings = $stmtSettings->fetch();
        if (!$settings) {
            // default fallback
            $settings = [
                'plan_year' => $year,
                'family_notes' => 'PAPI SIMPAN, MAMI SIMPAN | UMUR DEDE: 8 Tahun, Kelas: 2',
                'target_kekayaan' => 15150000
            ];
        }

        // Ambil Semua Kategori
        $stmtCat = $pdo->query("SELECT * FROM categories ORDER BY sort_order ASC, id ASC");
        $categories = $stmtCat->fetchAll();

        // Ambil Semua Item Anggaran beserta nilai bulanan
        $stmtItems = $pdo->prepare("
            SELECT b.id, b.category_id, b.item_name, b.sort_order,
                   c.type, c.group_name, c.is_investment
            FROM budget_items b
            JOIN categories c ON b.category_id = c.id
            WHERE b.is_active = 1
            ORDER BY c.sort_order ASC, b.sort_order ASC, b.id ASC
        ");
        $stmtItems->execute();
        $items = $stmtItems->fetchAll();

        // Ambil nilai per bulan untuk tahun terpilih
        $stmtValues = $pdo->prepare("
            SELECT budget_item_id, month, amount 
            FROM budget_monthly_values 
            WHERE plan_year = ?
        ");
        $stmtValues->execute([$year]);
        $allValues = $stmtValues->fetchAll();

        $valuesMap = [];
        foreach ($allValues as $val) {
            $valuesMap[$val['budget_item_id']][$val['month']] = floatval($val['amount']);
        }

        // Susun item dengan monthly values
        foreach ($items as &$item) {
            $itemId = $item['id'];
            $item['months'] = [];
            for ($m = 0; $m <= 12; $m++) {
                $item['months'][$m] = isset($valuesMap[$itemId][$m]) ? $valuesMap[$itemId][$m] : 0;
            }
            // hitung total 12 bulan (Jan - Dec)
            $total = 0;
            for ($m = 1; $m <= 12; $m++) {
                $total += $item['months'][$m];
            }
            $item['total'] = $total;
        }

        // Ambil Agenda Bulanan
        $stmtAgenda = $pdo->prepare("SELECT * FROM monthly_agenda WHERE plan_year = ? ORDER BY month ASC, id ASC");
        $stmtAgenda->execute([$year]);
        $agendas = $stmtAgenda->fetchAll();

        // Daftar tahun yang ada datanya
        $yearsStmt = $pdo->query("SELECT DISTINCT plan_year FROM budget_monthly_values ORDER BY plan_year DESC");
        $availableYears = $yearsStmt->fetchAll(PDO::FETCH_COLUMN);
        if (empty($availableYears)) $availableYears = [$year];

        responseJson([
            'success' => true,
            'settings' => $settings,
            'categories' => $categories,
            'items' => $items,
            'agendas' => $agendas,
            'available_years' => $availableYears
        ]);
        break;

    case 'update_cell':
        // Update 1 cell nilai anggaran (inline edit via AJAX)
        $itemId = isset($input['budget_item_id']) ? intval($input['budget_item_id']) : 0;
        $m = isset($input['month']) ? intval($input['month']) : -1;
        $amount = isset($input['amount']) ? floatval($input['amount']) : 0;
        $planYear = isset($input['year']) ? intval($input['year']) : $year;

        if ($itemId <= 0 || $m < 0 || $m > 12) {
            responseJson(['success' => false, 'message' => 'Parameter tidak valid'], 400);
        }

        $stmt = $pdo->prepare("
            INSERT INTO budget_monthly_values (budget_item_id, plan_year, month, amount)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE amount = VALUES(amount)
        ");
        $stmt->execute([$itemId, $planYear, $m, $amount]);

        responseJson(['success' => true, 'message' => 'Nilai berhasil disimpan', 'amount' => $amount]);
        break;

    case 'update_item_name':
        // Update nama pos anggaran (inline edit kolom Pos Anggaran)
        $itemId = isset($input['id']) ? intval($input['id']) : 0;
        $name = isset($input['item_name']) ? trim($input['item_name']) : '';

        if ($itemId <= 0 || empty($name)) {
            responseJson(['success' => false, 'message' => 'Nama Pos Anggaran tidak boleh kosong'], 400);
        }

        $stmt = $pdo->prepare("UPDATE budget_items SET item_name = ? WHERE id = ?");
        $stmt->execute([$name, $itemId]);

        responseJson(['success' => true, 'message' => 'Nama Pos Anggaran berhasil diperbarui', 'item_name' => $name]);
        break;

    case 'add_item':
        // Tambah Pos Anggaran Baru (autocomplete category atau custom baru)
        $categoryId = isset($input['category_id']) ? intval($input['category_id']) : 0;
        $categoryName = isset($input['category_name']) ? trim($input['category_name']) : '';
        $type = isset($input['type']) ? $input['type'] : 'expense';
        $itemName = isset($input['item_name']) ? trim($input['item_name']) : '';
        $isInvestment = isset($input['is_investment']) ? intval($input['is_investment']) : 0;
        $defaultAmount = isset($input['default_monthly_amount']) ? floatval($input['default_monthly_amount']) : 0;
        $planYear = isset($input['year']) ? intval($input['year']) : $year;

        if (empty($itemName)) {
            responseJson(['success' => false, 'message' => 'Nama Pos Anggaran tidak boleh kosong'], 400);
        }

        // Jika categoryId belum ada / user mengetik kategori baru
        if ($categoryId <= 0) {
            if (empty($categoryName)) {
                $categoryName = ($type === 'income') ? 'Pendapatan Lain' : 'Lainnya';
            }
            // Cari apakah kategori sudah ada
            $stmtFindCat = $pdo->prepare("SELECT id FROM categories WHERE group_name = ? AND type = ? LIMIT 1");
            $stmtFindCat->execute([$categoryName, $type]);
            $existingCat = $stmtFindCat->fetch();
            if ($existingCat) {
                $categoryId = $existingCat['id'];
            } else {
                $maxOrder = $pdo->query("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories")->fetchColumn();
                $stmtNewCat = $pdo->prepare("INSERT INTO categories (type, group_name, is_investment, sort_order) VALUES (?, ?, ?, ?)");
                $stmtNewCat->execute([$type, $categoryName, $isInvestment, $maxOrder]);
                $categoryId = $pdo->lastInsertId();
            }
        }

        $maxItemOrder = $pdo->prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM budget_items WHERE category_id = ?");
        $maxItemOrder->execute([$categoryId]);
        $order = $maxItemOrder->fetchColumn();

        $stmtItem = $pdo->prepare("INSERT INTO budget_items (category_id, item_name, sort_order) VALUES (?, ?, ?)");
        $stmtItem->execute([$categoryId, $itemName, $order]);
        $newItemId = $pdo->lastInsertId();

        // Isi nilai bulan 1 - 12 dengan defaultAmount jika ada
        $stmtVal = $pdo->prepare("INSERT INTO budget_monthly_values (budget_item_id, plan_year, month, amount) VALUES (?, ?, ?, ?)");
        for ($m = 0; $m <= 12; $m++) {
            $amt = ($m > 0) ? $defaultAmount : 0;
            $stmtVal->execute([$newItemId, $planYear, $m, $amt]);
        }

        responseJson(['success' => true, 'message' => 'Pos anggaran baru berhasil ditambahkan', 'item_id' => $newItemId]);
        break;

    case 'delete_item':
        $itemId = isset($input['id']) ? intval($input['id']) : 0;
        if ($itemId <= 0) {
            responseJson(['success' => false, 'message' => 'ID item tidak valid'], 400);
        }
        $stmt = $pdo->prepare("DELETE FROM budget_items WHERE id = ?");
        $stmt->execute([$itemId]);
        responseJson(['success' => true, 'message' => 'Pos anggaran berhasil dihapus']);
        break;

    case 'update_settings':
        $planYear = isset($input['plan_year']) ? intval($input['plan_year']) : $year;
        $notes = isset($input['family_notes']) ? trim($input['family_notes']) : '';
        $targetKekayaan = isset($input['target_kekayaan']) ? floatval($input['target_kekayaan']) : 0;

        $stmt = $pdo->prepare("
            INSERT INTO settings (plan_year, family_notes, target_kekayaan)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE family_notes = VALUES(family_notes), target_kekayaan = VALUES(target_kekayaan)
        ");
        $stmt->execute([$planYear, $notes, $targetKekayaan]);
        responseJson(['success' => true, 'message' => 'Pengaturan profil keluarga berhasil diperbarui']);
        break;

    case 'add_agenda':
        $agendaYear = isset($input['plan_year']) ? intval($input['plan_year']) : $year;
        $month = isset($input['month']) ? intval($input['month']) : 1;
        $title = isset($input['title']) ? trim($input['title']) : '';
        $desc = isset($input['description']) ? trim($input['description']) : '';
        $cost = isset($input['estimated_cost']) ? floatval($input['estimated_cost']) : 0;

        if (empty($title)) {
            responseJson(['success' => false, 'message' => 'Judul agenda wajib diisi'], 400);
        }

        $stmt = $pdo->prepare("INSERT INTO monthly_agenda (plan_year, month, title, description, estimated_cost, is_completed) VALUES (?, ?, ?, ?, ?, 0)");
        $stmt->execute([$agendaYear, $month, $title, $desc, $cost]);
        responseJson(['success' => true, 'message' => 'Agenda berhasil ditambahkan', 'id' => $pdo->lastInsertId()]);
        break;

    case 'update_agenda':
        $agendaId = isset($input['id']) ? intval($input['id']) : 0;
        $isCompleted = isset($input['is_completed']) ? intval($input['is_completed']) : 0;
        $title = isset($input['title']) ? trim($input['title']) : null;
        $desc = isset($input['description']) ? trim($input['description']) : null;
        $cost = isset($input['estimated_cost']) ? floatval($input['estimated_cost']) : null;
        $month = isset($input['month']) ? intval($input['month']) : null;

        if ($agendaId <= 0) {
            responseJson(['success' => false, 'message' => 'ID agenda tidak valid'], 400);
        }

        $stmt = $pdo->prepare("
            UPDATE monthly_agenda 
            SET is_completed = COALESCE(?, is_completed),
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                estimated_cost = COALESCE(?, estimated_cost),
                month = COALESCE(?, month)
            WHERE id = ?
        ");
        $stmt->execute([$isCompleted, $title, $desc, $cost, $month, $agendaId]);
        responseJson(['success' => true, 'message' => 'Agenda berhasil diperbarui']);
        break;

    case 'delete_agenda':
        $agendaId = isset($input['id']) ? intval($input['id']) : 0;
        if ($agendaId <= 0) {
            responseJson(['success' => false, 'message' => 'ID agenda tidak valid'], 400);
        }
        $stmt = $pdo->prepare("DELETE FROM monthly_agenda WHERE id = ?");
        $stmt->execute([$agendaId]);
        responseJson(['success' => true, 'message' => 'Agenda berhasil dihapus']);
        break;

    case 'search_autocomplete':
        // Autocomplete endpoint untuk Kategori & Item yang sudah pernah diinput
        $query = isset($_GET['q']) ? trim($_GET['q']) : '';
        $type = isset($_GET['type']) ? trim($_GET['type']) : '';

        $results = [
            'categories' => [],
            'common_items' => []
        ];

        // Search categories
        $sqlCat = "SELECT id, group_name, type, is_investment FROM categories WHERE 1=1";
        $paramsCat = [];
        if (!empty($type)) {
            $sqlCat .= " AND type = ?";
            $paramsCat[] = $type;
        }
        if (!empty($query)) {
            $sqlCat .= " AND group_name LIKE ?";
            $paramsCat[] = "%$query%";
        }
        $sqlCat .= " ORDER BY group_name ASC LIMIT 10";
        $stmt = $pdo->prepare($sqlCat);
        $stmt->execute($paramsCat);
        $results['categories'] = $stmt->fetchAll();

        // Search item names
        $sqlItem = "SELECT DISTINCT item_name FROM budget_items WHERE 1=1";
        $paramsItem = [];
        if (!empty($query)) {
            $sqlItem .= " AND item_name LIKE ?";
            $paramsItem[] = "%$query%";
        }
        $sqlItem .= " ORDER BY item_name ASC LIMIT 10";
        $stmt2 = $pdo->prepare($sqlItem);
        $stmt2->execute($paramsItem);
        $results['common_items'] = $stmt2->fetchAll(PDO::FETCH_COLUMN);

        responseJson(['success' => true, 'data' => $results]);
        break;

    default:
        responseJson(['success' => false, 'message' => 'Action tidak dikenali'], 400);
        break;
}
