// api/index.js - Vercel Serverless Function for FinPlan
const mysql = require('mysql2/promise');

// Cache pool connection across serverless invocations
let pool = null;

function getPool() {
    if (!pool) {
        // Mendukung DATABASE_URL (misal: mysql://user:pass@host:port/db?ssl-mode=REQUIRED)
        // atau variabel terpisah (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT)
        const config = process.env.DATABASE_URL
            ? { uri: process.env.DATABASE_URL }
            : {
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'finplan_db',
                port: parseInt(process.env.DB_PORT || '3306')
              };

        // Otomatis aktifkan SSL jika terhubung ke cloud database (Aiven / TiDB / PlanetScale)
        if (process.env.DB_SSL === 'true' || process.env.DATABASE_URL?.includes('ssl') || (process.env.DB_HOST && !process.env.DB_HOST.includes('localhost'))) {
            config.ssl = { rejectUnauthorized: false };
        }

        pool = mysql.createPool({
            ...config,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }
    return pool;
}

// In-memory demo data jika belum terhubung ke database cloud
const fallbackData = {
    settings: {
        plan_year: 2026,
        family_notes: 'PAPI SIMPAN, MAMI SIMPAN | UMUR DEDE: 8 Tahun, Kelas: 2',
        target_kekayaan: 15150000
    },
    categories: [
        { id: 1, type: 'income', group_name: 'Pendapatan', is_investment: 0, sort_order: 1 },
        { id: 2, type: 'expense', group_name: 'Tagihan Rumah Tangga', is_investment: 0, sort_order: 2 },
        { id: 3, type: 'expense', group_name: 'Cicilan', is_investment: 0, sort_order: 3 },
        { id: 4, type: 'expense', group_name: 'Tabungan & Investasi', is_investment: 1, sort_order: 4 },
        { id: 5, type: 'expense', group_name: 'Transportasi', is_investment: 0, sort_order: 5 },
        { id: 6, type: 'expense', group_name: 'Kebutuhan Bulanan', is_investment: 0, sort_order: 6 },
        { id: 7, type: 'expense', group_name: 'Edukasi', is_investment: 0, sort_order: 7 },
        { id: 8, type: 'expense', group_name: 'Asuransi', is_investment: 0, sort_order: 8 },
        { id: 9, type: 'expense', group_name: 'Hiburan & Rekreasi', is_investment: 0, sort_order: 9 },
        { id: 10, type: 'expense', group_name: 'Lainnya', is_investment: 0, sort_order: 10 }
    ],
    items: [
        { id: 1, category_id: 1, item_name: 'Gaji', type: 'income', group_name: 'Pendapatan', is_investment: 0, months: [0, 8036000, 8110000, 8110000, 8110000, 8110000, 8110000, 8110000, 8110000, 8110000, 8110000, 8110000, 8110000], total: 97246000 },
        { id: 2, category_id: 1, item_name: 'THR', type: 'income', group_name: 'Pendapatan', is_investment: 0, months: [0, 0, 0, 8000000, 0, 0, 0, 0, 0, 0, 0, 0, 0], total: 8000000 },
        { id: 5, category_id: 2, item_name: 'Wifi Banjaran', type: 'expense', group_name: 'Tagihan Rumah Tangga', is_investment: 0, months: [0, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000], total: 1800000 },
        { id: 6, category_id: 2, item_name: 'Listrik Banjaran', type: 'expense', group_name: 'Tagihan Rumah Tangga', is_investment: 0, months: [0, 55000, 55000, 55000, 55000, 55000, 55000, 55000, 55000, 55000, 55000, 55000, 55000], total: 660000 },
        { id: 10, category_id: 3, item_name: 'CC BCA', type: 'expense', group_name: 'Cicilan', is_investment: 0, months: [0, 268000, 268000, 268000, 268000, 268000, 268000, 268000, 268000, 268000, 268000, 268000, 268000], total: 3216000 },
        { id: 13, category_id: 4, item_name: 'Tabungan Umum', type: 'expense', group_name: 'Tabungan & Investasi', is_investment: 1, months: [0, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000], total: 1800000 },
        { id: 14, category_id: 4, item_name: 'Dana Darurat (BCA Papi)', type: 'expense', group_name: 'Tabungan & Investasi', is_investment: 1, months: [0, 100000, 100000, 100000, 100000, 100000, 100000, 150000, 150000, 150000, 150000, 150000, 150000], total: 1500000 }
    ],
    agendas: [
        { id: 1, plan_year: 2026, month: 3, title: 'THR & Bonus Kinerja', description: 'Penerimaan tunjangan hari raya', estimated_cost: 8000000, is_completed: 0 },
        { id: 2, plan_year: 2026, month: 3, title: 'Agenda Mudik / Keluarga', description: 'Kumpul keluarga besar', estimated_cost: 2000000, is_completed: 0 },
        { id: 3, plan_year: 2026, month: 7, title: 'Pelunasan Cicilan Spin', description: 'Cicilan Spin selesai lunas', estimated_cost: 135843, is_completed: 0 }
    ]
};

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { query } = req;
    const action = query.action || '';
    const year = parseInt(query.year || '2026');

    // Parse body jika method POST
    let body = req.body || {};
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
    }

    let isDbConnected = false;
    let db;
    try {
        db = getPool();
        // Coba koneksi cepat
        await db.query('SELECT 1');
        isDbConnected = true;
    } catch (err) {
        console.warn('Database Cloud belum disetting / tidak terhubung. Menggunakan mode Demo:', err.message);
        isDbConnected = false;
    }

    // JIKA TIDAK ADA DATABASE CLOUD: Gunakan Demo Fallback Data
    if (!isDbConnected) {
        if (action === 'get_data') {
            return res.json({
                success: true,
                is_demo_mode: true,
                warning: 'Mode Offline/Demo: Konfigurasi DATABASE_URL di Environment Variables Vercel untuk menghubungkan Cloud MySQL.',
                settings: fallbackData.settings,
                categories: fallbackData.categories,
                items: fallbackData.items,
                agendas: fallbackData.agendas,
                available_years: [2026]
            });
        }

        if (action === 'update_cell') {
            const { budget_item_id, month, amount } = body;
            const itm = fallbackData.items.find(i => i.id == budget_item_id);
            if (itm) {
                itm.months[month] = amount;
                itm.total = itm.months.slice(1, 13).reduce((a, b) => a + b, 0);
            }
            return res.json({ success: true, message: 'Nilai tersimpan (Demo Mode)' });
        }

        if (action === 'update_item_name') {
            const { id, item_name } = body;
            const itm = fallbackData.items.find(i => i.id == id);
            if (itm) itm.item_name = item_name;
            return res.json({ success: true, message: 'Nama pos diperbarui (Demo Mode)' });
        }

        if (action === 'add_item') {
            const newItem = {
                id: Date.now(),
                category_id: body.category_id || 1,
                item_name: body.item_name,
                type: body.type || 'expense',
                group_name: body.category_name || 'Lainnya',
                is_investment: body.is_investment || 0,
                months: Array(13).fill(parseFloat(body.default_monthly_amount || 0)),
                total: parseFloat(body.default_monthly_amount || 0) * 12
            };
            newItem.months[0] = 0;
            fallbackData.items.push(newItem);
            return res.json({ success: true, message: 'Item berhasil ditambahkan (Demo Mode)' });
        }

        if (action === 'delete_item') {
            fallbackData.items = fallbackData.items.filter(i => i.id != body.id);
            return res.json({ success: true, message: 'Item dihapus (Demo Mode)' });
        }

        if (action === 'add_agenda') {
            fallbackData.agendas.push({ id: Date.now(), plan_year: year, ...body });
            return res.json({ success: true, message: 'Agenda ditambahkan (Demo Mode)' });
        }

        if (action === 'update_agenda') {
            const ag = fallbackData.agendas.find(a => a.id == body.id);
            if (ag) Object.assign(ag, body);
            return res.json({ success: true, message: 'Agenda diperbarui (Demo Mode)' });
        }

        if (action === 'delete_agenda') {
            fallbackData.agendas = fallbackData.agendas.filter(a => a.id != body.id);
            return res.json({ success: true, message: 'Agenda dihapus (Demo Mode)' });
        }

        if (action === 'search_autocomplete') {
            return res.json({
                success: true,
                data: {
                    categories: fallbackData.categories,
                    common_items: fallbackData.items.map(i => i.item_name)
                }
            });
        }

        return res.json({ success: true, message: 'OK (Demo Mode)' });
    }

    // JIKA TERHUBUNG KE CLOUD DATABASE (Aiven / TiDB / PlanetScale)
    try {
        switch (action) {
            case 'get_data': {
                const [settingsRows] = await db.query('SELECT * FROM settings WHERE plan_year = ? LIMIT 1', [year]);
                const settings = settingsRows[0] || {
                    plan_year: year,
                    family_notes: 'PAPI SIMPAN, MAMI SIMPAN | UMUR DEDE: 8 Tahun, Kelas: 2',
                    target_kekayaan: 15150000
                };

                const [categories] = await db.query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC');

                const [items] = await db.query(`
                    SELECT b.id, b.category_id, b.item_name, b.sort_order,
                           c.type, c.group_name, c.is_investment
                    FROM budget_items b
                    JOIN categories c ON b.category_id = c.id
                    WHERE b.is_active = 1
                    ORDER BY c.sort_order ASC, b.sort_order ASC, b.id ASC
                `);

                const [values] = await db.query('SELECT budget_item_id, month, amount FROM budget_monthly_values WHERE plan_year = ?', [year]);

                const valuesMap = {};
                values.forEach(v => {
                    if (!valuesMap[v.budget_item_id]) valuesMap[v.budget_item_id] = {};
                    valuesMap[v.budget_item_id][v.month] = parseFloat(v.amount);
                });

                items.forEach(itm => {
                    itm.months = [];
                    let tot = 0;
                    for (let m = 0; m <= 12; m++) {
                        const amt = (valuesMap[itm.id] && valuesMap[itm.id][m]) ? valuesMap[itm.id][m] : 0;
                        itm.months[m] = amt;
                        if (m > 0) tot += amt;
                    }
                    itm.total = tot;
                });

                const [agendas] = await db.query('SELECT * FROM monthly_agenda WHERE plan_year = ? ORDER BY month ASC, id ASC', [year]);
                const [years] = await db.query('SELECT DISTINCT plan_year FROM budget_monthly_values ORDER BY plan_year DESC');
                const available_years = years.map(y => y.plan_year);

                return res.json({
                    success: true,
                    settings,
                    categories,
                    items,
                    agendas,
                    available_years: available_years.length ? available_years : [year]
                });
            }

            case 'update_cell': {
                const { budget_item_id, month, amount } = body;
                await db.query(`
                    INSERT INTO budget_monthly_values (budget_item_id, plan_year, month, amount)
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE amount = VALUES(amount)
                `, [budget_item_id, year, month, amount]);
                return res.json({ success: true, message: 'Nilai berhasil disimpan' });
            }

            case 'update_item_name': {
                const { id, item_name } = body;
                await db.query('UPDATE budget_items SET item_name = ? WHERE id = ?', [item_name, id]);
                return res.json({ success: true, message: 'Nama Pos Anggaran berhasil diperbarui' });
            }

            case 'add_item': {
                let catId = parseInt(body.category_id || 0);
                const catName = (body.category_name || '').trim();
                const type = body.type || 'expense';
                const itemName = (body.item_name || '').trim();
                const isInvest = parseInt(body.is_investment || 0);
                const defAmount = parseFloat(body.default_monthly_amount || 0);

                if (catId <= 0) {
                    const [exCat] = await db.query('SELECT id FROM categories WHERE group_name = ? AND type = ? LIMIT 1', [catName, type]);
                    if (exCat.length > 0) {
                        catId = exCat[0].id;
                    } else {
                        const [maxOrder] = await db.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM categories');
                        const [insCat] = await db.query('INSERT INTO categories (type, group_name, is_investment, sort_order) VALUES (?, ?, ?, ?)', [type, catName, isInvest, maxOrder[0].next_order]);
                        catId = insCat.insertId;
                    }
                }

                const [maxItemOrder] = await db.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM budget_items WHERE category_id = ?', [catId]);
                const [insItem] = await db.query('INSERT INTO budget_items (category_id, item_name, sort_order) VALUES (?, ?, ?)', [catId, itemName, maxItemOrder[0].next_order]);
                const newItemId = insItem.insertId;

                for (let m = 0; m <= 12; m++) {
                    const amt = (m > 0) ? defAmount : 0;
                    await db.query('INSERT INTO budget_monthly_values (budget_item_id, plan_year, month, amount) VALUES (?, ?, ?, ?)', [newItemId, year, m, amt]);
                }

                return res.json({ success: true, message: 'Pos anggaran berhasil ditambahkan' });
            }

            case 'delete_item': {
                await db.query('DELETE FROM budget_items WHERE id = ?', [body.id]);
                return res.json({ success: true, message: 'Pos anggaran berhasil dihapus' });
            }

            case 'update_settings': {
                await db.query(`
                    INSERT INTO settings (plan_year, family_notes, target_kekayaan)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE family_notes = VALUES(family_notes), target_kekayaan = VALUES(target_kekayaan)
                `, [body.plan_year || year, body.family_notes, body.target_kekayaan]);
                return res.json({ success: true, message: 'Pengaturan profil berhasil diperbarui' });
            }

            case 'add_agenda': {
                const { month, title, description, estimated_cost } = body;
                await db.query('INSERT INTO monthly_agenda (plan_year, month, title, description, estimated_cost, is_completed) VALUES (?, ?, ?, ?, ?, 0)', [year, month, title, description, estimated_cost]);
                return res.json({ success: true, message: 'Agenda berhasil ditambahkan' });
            }

            case 'update_agenda': {
                const { id, is_completed, title, description, estimated_cost, month } = body;
                await db.query(`
                    UPDATE monthly_agenda 
                    SET is_completed = COALESCE(?, is_completed),
                        title = COALESCE(?, title),
                        description = COALESCE(?, description),
                        estimated_cost = COALESCE(?, estimated_cost),
                        month = COALESCE(?, month)
                    WHERE id = ?
                `, [is_completed, title, description, estimated_cost, month, id]);
                return res.json({ success: true, message: 'Agenda berhasil diperbarui' });
            }

            case 'delete_agenda': {
                await db.query('DELETE FROM monthly_agenda WHERE id = ?', [body.id]);
                return res.json({ success: true, message: 'Agenda berhasil dihapus' });
            }

            case 'search_autocomplete': {
                const q = `%${(query.q || '').trim()}%`;
                const [categories] = await db.query('SELECT id, group_name, type, is_investment FROM categories WHERE group_name LIKE ? ORDER BY group_name ASC LIMIT 10', [q]);
                const [items] = await db.query('SELECT DISTINCT item_name FROM budget_items WHERE item_name LIKE ? ORDER BY item_name ASC LIMIT 10', [q]);
                return res.json({
                    success: true,
                    data: {
                        categories,
                        common_items: items.map(i => i.item_name)
                    }
                });
            }

            default:
                return res.status(400).json({ success: false, message: 'Aksi tidak dikenal' });
        }
    } catch (err) {
        console.error('API Error:', err);
        return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};
