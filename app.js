/**
 * app.js - FinPlan Frontend Logic
 * Kiblat UI/UX: Material Design by Google
 * Fitur: Agenda bulanan 1 tahun, Matriks anggaran, Autocomplete (tanpa dropdown banyak data)
 */

const MONTH_NAMES = [
    "Des '25", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const MONTH_SHORT = [
    "DES", "JAN", "FEB", "MAR", "APR", "MEI", "JUN",
    "JUL", "AGU", "SEP", "OKT", "NOV", "DES"
];

// Base API Endpoint: Otomatis deteksi lingkungan (Vercel Serverless `/api/index.js` vs Apache Localhost `api.php`)
const API_BASE = (window.location.pathname.endsWith('.php') || window.location.hostname === 'localhost' && !window.location.port)
    ? 'api.php'
    : '/api';

let appState = {
    currentYear: 2026,
    settings: {},
    categories: [],
    items: [],
    agendas: [],
    filterQuery: ''
};

// Inisialisasi Aplikasi saat DOM ready
document.addEventListener('DOMContentLoaded', () => {
    loadFinPlanData();
    initAutocompleteHandlers();
    initFilterSearch();
});

// Format mata uang Rupiah
function formatRp(val) {
    if (val === null || val === undefined || isNaN(val)) return 'Rp 0';
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
}

function formatNumber(val) {
    if (val === null || val === undefined || isNaN(val)) return '0';
    return Math.round(val).toLocaleString('id-ID');
}

// Tampilkan Snackbar Material
function showSnackbar(msg, type = 'success') {
    const snackbar = document.getElementById('appSnackbar');
    const snackbarMsg = document.getElementById('snackbarMessage');
    const snackbarIcon = document.getElementById('snackbarIcon');

    snackbarMsg.textContent = msg;
    snackbarIcon.textContent = (type === 'error') ? 'error' : 'check_circle';
    snackbarIcon.style.color = (type === 'error') ? '#f28b82' : '#81c995';

    snackbar.classList.add('show');
    setTimeout(() => {
        snackbar.classList.remove('show');
    }, 3200);
}

// Load Data dari API Backend
async function loadFinPlanData() {
    try {
        const response = await fetch(\x60?action=get_data&year=${appState.currentYear}`);
        const result = await response.json();

        if (!result.success) {
            showSnackbar('Gagal mengambil data dari server', 'error');
            return;
        }

        appState.settings = result.settings || {};
        appState.categories = result.categories || [];
        appState.items = result.items || [];
        appState.agendas = result.agendas || [];

        renderHeaderProfile();
        renderAgendaBoxes();
        renderMatrixTable();
        calculateAndRenderKPIs();

    } catch (err) {
        console.error('Error fetching data:', err);
        showSnackbar('Terjadi kesalahan koneksi ke backend', 'error');
    }
}

// Render Profile Header & Banner
function renderHeaderProfile() {
    document.getElementById('badge-year').textContent = appState.currentYear;
    document.getElementById('familyNotesText').textContent = appState.settings.family_notes || 'PAPI SIMPAN, MAMI SIMPAN | UMUR DEDE: 8 Tahun, Kelas: 2';
    document.getElementById('targetKekayaanText').textContent = formatRp(appState.settings.target_kekayaan || 15150000);
}

// Render Agenda Bulanan 12 Bulan (1 Halaman Penuh)
function renderAgendaBoxes() {
    const container = document.getElementById('monthsAgendaContainer');
    container.innerHTML = '';

    for (let m = 1; m <= 12; m++) {
        const monthAgendas = appState.agendas.filter(a => parseInt(a.month) === m);
        const hasAgenda = monthAgendas.length > 0;

        const box = document.createElement('div');
        box.className = `month-agenda-box ${hasAgenda ? 'has-agenda' : ''}`;

        let agendaItemsHtml = '';
        if (hasAgenda) {
            monthAgendas.forEach(ag => {
                const isCompleted = parseInt(ag.is_completed) === 1;
                agendaItemsHtml += `
                    <div class="agenda-chip ${isCompleted ? 'completed' : ''}" onclick="openEditAgendaModal(${ag.id})">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <span class="agenda-chip-title">${escapeHtml(ag.title)}</span>
                            <span class="material-symbols-outlined" style="font-size:16px; color:${isCompleted ? '#1e8e3e' : '#94a3b8'};">
                                ${isCompleted ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                        </div>
                        ${parseFloat(ag.estimated_cost) > 0 ? `<div class="agenda-chip-cost">${formatRp(ag.estimated_cost)}</div>` : ''}
                        ${ag.description ? `<div style="font-size:0.7rem; color:#64748b;">${escapeHtml(ag.description)}</div>` : ''}
                    </div>
                `;
            });
        } else {
            agendaItemsHtml = `
                <div style="font-size:0.75rem; color:#94a3b8; font-style:italic; padding-top:0.5rem; text-align:center;">
                    Tidak ada agenda
                </div>
            `;
        }

        box.innerHTML = `
            <div class="month-box-header">
                <span>${MONTH_NAMES[m]}</span>
                <div style="display:flex; align-items:center; gap:0.35rem;">
                    ${hasAgenda ? `<span class="month-badge-count">${monthAgendas.length} agenda</span>` : ''}
                    <button class="icon-btn" style="padding:2px;" title="Tambah agenda bulan ini" onclick="quickAddAgenda(${m})">
                        <span class="material-symbols-outlined" style="font-size:18px;">add</span>
                    </button>
                </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.4rem; flex:1;">
                ${agendaItemsHtml}
            </div>
        `;

        container.appendChild(box);
    }
}

// Render Tabel Matriks Anggaran Bulanan Sepanjang Tahun
function renderMatrixTable() {
    const tbody = document.getElementById('matrixTableBody');
    tbody.innerHTML = '';

    const filter = appState.filterQuery.toLowerCase().trim();

    // Pisahkan item berdasarkan tipe (Income vs Expense)
    const incomeItems = appState.items.filter(item => item.type === 'income');
    const expenseItems = appState.items.filter(item => item.type === 'expense');

    // Helper untuk render sekelompok kategori
    const renderCategoryGroup = (title, itemsGroup, isIncomeSection) => {
        // Kelompokkan items berdasarkan category_id
        const grouped = {};
        itemsGroup.forEach(item => {
            if (filter && !item.item_name.toLowerCase().includes(filter) && !item.group_name.toLowerCase().includes(filter)) {
                return;
            }
            if (!grouped[item.category_id]) {
                grouped[item.category_id] = {
                    category_name: item.group_name,
                    category_id: item.category_id,
                    is_investment: item.is_investment,
                    items: []
                };
            }
            grouped[item.category_id].items.push(item);
        });

        // Loop setiap kategori
        for (const catId in grouped) {
            const cat = grouped[catId];
            if (cat.items.length === 0) continue;

            // Baris Header Kategori
            const catHeaderTr = document.createElement('tr');
            catHeaderTr.className = 'tr-category-header';
            catHeaderTr.innerHTML = `
                <td colspan="16">
                    <div class="category-header-title">
                        <span>
                            <span class="material-symbols-outlined" style="font-size:18px; margin-right:4px;">folder_open</span>
                            <strong>${escapeHtml(cat.category_name)}</strong> 
                            ${cat.is_investment == 1 ? '<span style="font-size:0.75rem; background:#d2e3fc; color:#0d47a1; padding:2px 8px; border-radius:10px; margin-left:6px;">Investasi / Aset</span>' : ''}
                        </span>
                        <button class="md-btn md-btn-tonal" style="padding:2px 10px; font-size:0.75rem;" onclick="quickAddItemToCategory(${cat.category_id}, '${escapeHtml(cat.category_name)}', '${isIncomeSection ? 'income' : 'expense'}')">
                            + Tambah Pos
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(catHeaderTr);

            // Baris masing-masing item
            cat.items.forEach(item => {
                const tr = document.createElement('tr');
                let tds = `
                    <td class="sticky-col-item">
                        <div class="editable-item-name" 
                             data-item-id="${item.id}" 
                             data-item-name="${escapeHtml(item.item_name)}" 
                             title="Klik untuk mengubah nama pos anggaran"
                             onclick="triggerInlineEditItemName(this)">
                            <span class="item-name-text" style="font-weight:600; color:#1e293b;">${escapeHtml(item.item_name)}</span>
                            <span class="material-symbols-outlined edit-hint-icon">edit</span>
                        </div>
                    </td>
                `;

                // 13 bulan (0=Des lalu, 1-12=Jan-Des)
                for (let m = 0; m <= 12; m++) {
                    const amt = item.months[m] || 0;
                    const isZero = amt === 0;
                    tds += `
                        <td class="editable-cell ${isZero ? 'cell-zero' : ''}" 
                            data-item-id="${item.id}" 
                            data-month="${m}" 
                            data-raw-amount="${amt}"
                            onclick="triggerInlineEdit(this)">
                            ${isZero ? '-' : formatNumber(amt)}
                        </td>
                    `;
                }

                // Total setahun (Jan - Des)
                tds += `
                    <td class="total-col" style="font-weight:700; color:${isIncomeSection ? '#1e8e3e' : '#1e293b'};">
                        ${formatNumber(item.total)}
                    </td>
                    <td style="text-align:center;">
                        <button class="icon-btn" style="color:#d93025;" title="Hapus item" onclick="confirmDeleteItem(${item.id}, '${escapeHtml(item.item_name)}')">
                            <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                        </button>
                    </td>
                `;
                tr.innerHTML = tds;
                tbody.appendChild(tr);
            });
        }
    };

    // 1. Render PENDAPATAN
    const incTrHeader = document.createElement('tr');
    incTrHeader.style.backgroundColor = '#dcfce7';
    incTrHeader.innerHTML = `<td colspan="16" style="padding:0.75rem 1rem; font-weight:800; color:#15803d; font-size:0.95rem;">BAGIAN 1: PENDAPATAN KELUARGA</td>`;
    tbody.appendChild(incTrHeader);
    renderCategoryGroup('Pendapatan', incomeItems, true);

    // Row TOTAL PENDAPATAN
    const totalIncomeMonths = calculateMonthlyTotals(incomeItems);
    const trTotalInc = document.createElement('tr');
    trTotalInc.className = 'tr-grand-income';
    let totalIncHtml = `<td class="sticky-col-item" style="font-weight:800;">TOTAL PENDAPATAN</td>`;
    for (let m = 0; m <= 12; m++) {
        totalIncHtml += `<td>${formatNumber(totalIncomeMonths[m])}</td>`;
    }
    totalIncHtml += `<td class="total-col">${formatNumber(totalIncomeMonths.yearTotal)}</td><td></td>`;
    trTotalInc.innerHTML = totalIncHtml;
    tbody.appendChild(trTotalInc);

    // 2. Render PENGELUARAN
    const expTrHeader = document.createElement('tr');
    expTrHeader.style.backgroundColor = '#fee2e2';
    expTrHeader.innerHTML = `<td colspan="16" style="padding:0.75rem 1rem; font-weight:800; color:#b91c1c; font-size:0.95rem;">BAGIAN 2: PENGELUARAN & ALOKASI DANA</td>`;
    tbody.appendChild(expTrHeader);
    renderCategoryGroup('Pengeluaran', expenseItems, false);

    // Row TOTAL PENGELUARAN (Semua pos keluar)
    const totalExpenseMonths = calculateMonthlyTotals(expenseItems);
    const trTotalExp = document.createElement('tr');
    trTotalExp.className = 'tr-grand-expense';
    let totalExpHtml = `<td class="sticky-col-item" style="font-weight:800;">TOTAL PENGELUARAN</td>`;
    for (let m = 0; m <= 12; m++) {
        totalExpHtml += `<td>${formatNumber(totalExpenseMonths[m])}</td>`;
    }
    totalExpHtml += `<td class="total-col">${formatNumber(totalExpenseMonths.yearTotal)}</td><td></td>`;
    trTotalExp.innerHTML = totalExpHtml;
    tbody.appendChild(trTotalExp);

    // Row PENGELUARAN AKTUAL (Hanya non-investasi, murni konsumsi/cicilan/biaya hidup)
    const nonInvestItems = expenseItems.filter(i => parseInt(i.is_investment) === 0);
    const actualExpenseMonths = calculateMonthlyTotals(nonInvestItems);
    const trActualExp = document.createElement('tr');
    trActualExp.style.backgroundColor = '#fffbeb';
    trActualExp.style.color = '#b45309';
    trActualExp.style.fontWeight = '700';
    let actualExpHtml = `<td class="sticky-col-item" style="font-weight:700;">Pengeluaran Aktual (Biaya Hidup)</td>`;
    for (let m = 0; m <= 12; m++) {
        actualExpHtml += `<td>${formatNumber(actualExpenseMonths[m])}</td>`;
    }
    actualExpHtml += `<td class="total-col">${formatNumber(actualExpenseMonths.yearTotal)}</td><td></td>`;
    trActualExp.innerHTML = actualExpHtml;
    tbody.appendChild(trActualExp);

    // Row TABUNGAN & INVESTASI TOTAL
    const investItems = expenseItems.filter(i => parseInt(i.is_investment) === 1);
    const investMonths = calculateMonthlyTotals(investItems);
    const trInvest = document.createElement('tr');
    trInvest.style.backgroundColor = '#eff6ff';
    trInvest.style.color = '#1d4ed8';
    trInvest.style.fontWeight = '700';
    let investHtml = `<td class="sticky-col-item" style="font-weight:700;">Alokasi Tabungan & Investasi</td>`;
    for (let m = 0; m <= 12; m++) {
        investHtml += `<td>${formatNumber(investMonths[m])}</td>`;
    }
    investHtml += `<td class="total-col">${formatNumber(investMonths.yearTotal)}</td><td></td>`;
    trInvest.innerHTML = investHtml;
    tbody.appendChild(trInvest);

    // Row SISA SALDO / SURPLUS BULANAN (Total Pendapatan - Total Pengeluaran)
    const trNet = document.createElement('tr');
    trNet.className = 'tr-saldo-bersih';
    let netHtml = `<td class="sticky-col-item" style="font-weight:800;">SISA SALDO KAS (SURPLUS)</td>`;
    let totalYearNet = 0;
    for (let m = 0; m <= 12; m++) {
        const netMonth = totalIncomeMonths[m] - totalExpenseMonths[m];
        if (m > 0) totalYearNet += netMonth;
        netHtml += `<td>${formatNumber(netMonth)}</td>`;
    }
    netHtml += `<td class="total-col">${formatNumber(totalYearNet)}</td><td></td>`;
    trNet.innerHTML = netHtml;
    tbody.appendChild(trNet);
}

// Menghitung akumulasi bulanan per kelompok item
function calculateMonthlyTotals(items) {
    const res = { yearTotal: 0 };
    for (let m = 0; m <= 12; m++) {
        res[m] = 0;
    }
    items.forEach(item => {
        for (let m = 0; m <= 12; m++) {
            const val = item.months[m] || 0;
            res[m] += val;
            if (m > 0) {
                res.yearTotal += val;
            }
        }
    });
    return res;
}

// Hitung Metric Card KPI Atas
function calculateAndRenderKPIs() {
    const incomeItems = appState.items.filter(item => item.type === 'income');
    const expenseItems = appState.items.filter(item => item.type === 'expense');
    const investItems = expenseItems.filter(item => parseInt(item.is_investment) === 1);

    const totalIncome = incomeItems.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const totalExpense = expenseItems.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const totalInvest = investItems.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const totalNet = totalIncome - totalExpense;
    const avgMonthlyNet = totalNet / 12;

    document.getElementById('kpiTotalIncome').textContent = formatRp(totalIncome);
    document.getElementById('kpiTotalExpense').textContent = formatRp(totalExpense);
    document.getElementById('kpiTotalInvestment').textContent = formatRp(totalInvest);
    document.getElementById('kpiTotalNet').textContent = formatRp(totalNet);
    document.getElementById('kpiAvgMonthlyLeft').innerHTML = `
        <span class="material-symbols-outlined" style="font-size:16px; color:#b06000;">wallet</span>
        Rata-rata: <strong>${formatRp(avgMonthlyNet)}</strong> / bulan
    `;
}

// Inline editing sel nilai tabel
function triggerInlineEdit(cell) {
    if (cell.querySelector('input')) return; // sedang edit

    const currentRaw = cell.getAttribute('data-raw-amount') || '0';
    const itemId = cell.getAttribute('data-item-id');
    const month = cell.getAttribute('data-month');

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'inline-edit-input';
    input.value = currentRaw;

    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();
    input.select();

    const saveChange = async () => {
        const newVal = parseFloat(input.value) || 0;
        cell.innerHTML = newVal === 0 ? '-' : formatNumber(newVal);
        cell.setAttribute('data-raw-amount', newVal);
        if (newVal === 0) cell.classList.add('cell-zero');
        else cell.classList.remove('cell-zero');

        // Update ke server via AJAX
        try {
            const resp = await fetch(\x60?action=update_cell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    budget_item_id: itemId,
                    month: month,
                    amount: newVal,
                    year: appState.currentYear
                })
            });
            const res = await resp.json();
            if (res.success) {
                // Update local memory
                const found = appState.items.find(i => i.id == itemId);
                if (found) {
                    found.months[month] = newVal;
                    let newTot = 0;
                    for (let m = 1; m <= 12; m++) newTot += found.months[m];
                    found.total = newTot;
                }
                renderMatrixTable();
                calculateAndRenderKPIs();
                showSnackbar('Data berhasil diperbarui');
            } else {
                showSnackbar(res.message || 'Gagal update data', 'error');
            }
        } catch (e) {
            console.error(e);
            showSnackbar('Koneksi terputus saat menyimpan', 'error');
        }
    };

    input.addEventListener('blur', saveChange);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            cell.innerHTML = currentRaw == 0 ? '-' : formatNumber(currentRaw);
        }
    });
}

// Inline editing nama Pos Anggaran di kolom kiri
function triggerInlineEditItemName(container) {
    if (container.querySelector('input')) return; // sedang edit

    const currentName = container.getAttribute('data-item-name') || '';
    const itemId = container.getAttribute('data-item-id');

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-edit-name-input';
    input.value = currentName;

    container.innerHTML = '';
    container.appendChild(input);
    input.focus();
    input.select();

    const saveNameChange = async () => {
        const newName = input.value.trim();
        if (!newName || newName === currentName) {
            // Jika kosong atau sama, kembalikan ke semula
            container.innerHTML = `
                <span class="item-name-text" style="font-weight:600; color:#1e293b;">${escapeHtml(currentName)}</span>
                <span class="material-symbols-outlined edit-hint-icon">edit</span>
            `;
            return;
        }

        // Tampilkan sementara teks baru
        container.innerHTML = `
            <span class="item-name-text" style="font-weight:600; color:#1e293b;">${escapeHtml(newName)}</span>
            <span class="material-symbols-outlined edit-hint-icon">edit</span>
        `;
        container.setAttribute('data-item-name', newName);

        // Update ke server via AJAX
        try {
            const resp = await fetch(\x60?action=update_item_name', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: itemId,
                    item_name: newName
                })
            });
            const res = await resp.json();
            if (res.success) {
                // Update local memory
                const found = appState.items.find(i => i.id == itemId);
                if (found) {
                    found.item_name = newName;
                }
                showSnackbar(`Nama pos diubah menjadi "${newName}"`);
            } else {
                showSnackbar(res.message || 'Gagal mengubah nama pos', 'error');
                loadFinPlanData();
            }
        } catch (e) {
            console.error(e);
            showSnackbar('Koneksi terputus saat menyimpan', 'error');
            loadFinPlanData();
        }
    };

    input.addEventListener('blur', saveNameChange);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            container.innerHTML = `
                <span class="item-name-text" style="font-weight:600; color:#1e293b;">${escapeHtml(currentName)}</span>
                <span class="material-symbols-outlined edit-hint-icon">edit</span>
            `;
        }
    });
}

// AUTOCOMPLETE SYSTEM (Material Design - Menggantikan Dropdown Tradisional)
function initAutocompleteHandlers() {
    // 1. Kategori Autocomplete
    const catInput = document.getElementById('categoryInput');
    const catDropdown = document.getElementById('categorySuggestions');
    const catIdHidden = document.getElementById('selectedCategoryId');

    catInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        catIdHidden.value = "0"; // reset
        const itemType = document.querySelector('input[name="item_type"]:checked').value;

        if (query.length < 1) {
            catDropdown.classList.remove('show');
            return;
        }

        try {
            const resp = await fetch(\x60?action=search_autocomplete&q=${encodeURIComponent(query)}&type=${itemType}`);
            const data = await resp.json();

            if (data.success && data.data.categories.length > 0) {
                catDropdown.innerHTML = '';
                data.data.categories.forEach(cat => {
                    const item = document.createElement('div');
                    item.className = 'autocomplete-item';
                    item.innerHTML = `
                        <span><strong>${escapeHtml(cat.group_name)}</strong></span>
                        <span class="autocomplete-item-desc">${cat.is_investment == 1 ? 'Investasi' : 'Rutin'}</span>
                    `;
                    item.addEventListener('click', () => {
                        catInput.value = cat.group_name;
                        catIdHidden.value = cat.id;
                        document.getElementById('isInvestmentCheck').checked = (cat.is_investment == 1);
                        catDropdown.classList.remove('show');
                    });
                    catDropdown.appendChild(item);
                });
                catDropdown.classList.add('show');
            } else {
                catDropdown.innerHTML = `
                    <div class="autocomplete-item" style="color:#1a73e8;">
                        <span>+ Gunakan kategori baru: <strong>"${escapeHtml(query)}"</strong></span>
                    </div>
                `;
                catDropdown.classList.add('show');
                catDropdown.firstElementChild.addEventListener('click', () => {
                    catIdHidden.value = "0";
                    catDropdown.classList.remove('show');
                });
            }
        } catch (err) {
            console.error(err);
        }
    });

    // 2. Nama Pos Autocomplete
    const itemNameInput = document.getElementById('itemNameInput');
    const itemDropdown = document.getElementById('itemSuggestions');

    itemNameInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        if (query.length < 1) {
            itemDropdown.classList.remove('show');
            return;
        }

        try {
            const resp = await fetch(\x60?action=search_autocomplete&q=${encodeURIComponent(query)}`);
            const data = await resp.json();

            if (data.success && data.data.common_items.length > 0) {
                itemDropdown.innerHTML = '';
                data.data.common_items.forEach(name => {
                    const el = document.createElement('div');
                    el.className = 'autocomplete-item';
                    el.textContent = name;
                    el.addEventListener('click', () => {
                        itemNameInput.value = name;
                        itemDropdown.classList.remove('show');
                    });
                    itemDropdown.appendChild(el);
                });
                itemDropdown.classList.add('show');
            } else {
                itemDropdown.classList.remove('show');
            }
        } catch (err) {
            console.error(err);
        }
    });

    // 3. Bulan Agenda Autocomplete
    const agendaMonthInput = document.getElementById('agendaMonthInput');
    const monthDropdown = document.getElementById('monthSuggestions');
    const selectedMonthHidden = document.getElementById('selectedAgendaMonth');

    agendaMonthInput.addEventListener('focus', () => {
        renderMonthSuggestions(agendaMonthInput.value);
    });

    agendaMonthInput.addEventListener('input', (e) => {
        renderMonthSuggestions(e.target.value);
    });

    function renderMonthSuggestions(filterVal) {
        const q = filterVal.toLowerCase().trim();
        monthDropdown.innerHTML = '';
        let count = 0;

        for (let m = 1; m <= 12; m++) {
            const name = MONTH_NAMES[m];
            if (!q || name.toLowerCase().includes(q) || m.toString() === q) {
                const el = document.createElement('div');
                el.className = 'autocomplete-item';
                el.innerHTML = `<span>${name}</span> <span class="autocomplete-item-desc">Bulan ${m}</span>`;
                el.addEventListener('click', () => {
                    agendaMonthInput.value = name;
                    selectedMonthHidden.value = m;
                    monthDropdown.classList.remove('show');
                });
                monthDropdown.appendChild(el);
                count++;
            }
        }

        if (count > 0) monthDropdown.classList.add('show');
        else monthDropdown.classList.remove('show');
    }

    // Klik di luar autocomplete menutup dropdown
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-wrapper')) {
            document.querySelectorAll('.autocomplete-dropdown').forEach(d => d.classList.remove('show'));
        }
    });
}

// Pencarian Filter Cepat di Bar Atas
function initFilterSearch() {
    const input = document.getElementById('quickFilterInput');
    input.addEventListener('input', (e) => {
        appState.filterQuery = e.target.value;
        renderMatrixTable();
    });
}

// Modal Form Handlers
function openModal(id) {
    document.getElementById(id).classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

function openAddItemModal() {
    document.getElementById('formAddItem').reset();
    document.getElementById('selectedCategoryId').value = "0";
    openModal('modalAddItem');
}

function quickAddItemToCategory(catId, catName, type) {
    openAddItemModal();
    document.querySelector(`input[name="item_type"][value="${type}"]`).checked = true;
    document.getElementById('selectedCategoryId').value = catId;
    document.getElementById('categoryInput').value = catName;
    document.getElementById('itemNameInput').focus();
}

function onItemTypeChange() {
    const type = document.querySelector('input[name="item_type"]:checked').value;
    const isInvestGroup = document.getElementById('isInvestmentGroup');
    if (type === 'income') {
        isInvestGroup.style.display = 'none';
        document.getElementById('isInvestmentCheck').checked = false;
    } else {
        isInvestGroup.style.display = 'block';
    }
}

async function handleAddItemSubmit(e) {
    e.preventDefault();
    const type = document.querySelector('input[name="item_type"]:checked').value;
    const catId = parseInt(document.getElementById('selectedCategoryId').value) || 0;
    const catName = document.getElementById('categoryInput').value.trim();
    const itemName = document.getElementById('itemNameInput').value.trim();
    const isInvest = document.getElementById('isInvestmentCheck').checked ? 1 : 0;
    const defAmount = parseFloat(document.getElementById('defaultAmountInput').value) || 0;

    try {
        const resp = await fetch(\x60?action=add_item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category_id: catId,
                category_name: catName,
                item_name: itemName,
                type: type,
                is_investment: isInvest,
                default_monthly_amount: defAmount,
                year: appState.currentYear
            })
        });

        const res = await resp.json();
        if (res.success) {
            closeModal('modalAddItem');
            showSnackbar('Pos anggaran berhasil ditambahkan!');
            loadFinPlanData();
        } else {
            showSnackbar(res.message || 'Gagal menambah item', 'error');
        }
    } catch (err) {
        showSnackbar('Koneksi gagal', 'error');
    }
}

async function confirmDeleteItem(id, name) {
    if (!confirm(`Apakah Anda yakin ingin menghapus pos anggaran "${name}" beserta seluruh data bulanannya?`)) {
        return;
    }

    try {
        const resp = await fetch(\x60?action=delete_item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        const res = await resp.json();
        if (res.success) {
            showSnackbar(`Pos "${name}" berhasil dihapus`);
            loadFinPlanData();
        } else {
            showSnackbar(res.message || 'Gagal menghapus', 'error');
        }
    } catch (e) {
        showSnackbar('Gagal menghapus', 'error');
    }
}

// Agenda Modal Handlers
function openAgendaModal() {
    document.getElementById('formAgenda').reset();
    document.getElementById('agendaEditId').value = "0";
    document.getElementById('agendaModalTitle').textContent = "Tambah Agenda Bulanan";
    document.getElementById('btnDeleteAgenda').style.display = 'none';
    document.getElementById('agendaMonthInput').value = MONTH_NAMES[1];
    document.getElementById('selectedAgendaMonth').value = 1;
    openModal('modalAgenda');
}

function quickAddAgenda(monthNumber) {
    openAgendaModal();
    document.getElementById('agendaMonthInput').value = MONTH_NAMES[monthNumber];
    document.getElementById('selectedAgendaMonth').value = monthNumber;
    document.getElementById('agendaTitleInput').focus();
}

function openEditAgendaModal(agendaId) {
    const ag = appState.agendas.find(a => a.id == agendaId);
    if (!ag) return;

    document.getElementById('agendaEditId').value = ag.id;
    document.getElementById('agendaModalTitle').textContent = "Edit Agenda Bulanan";
    document.getElementById('agendaMonthInput').value = MONTH_NAMES[ag.month];
    document.getElementById('selectedAgendaMonth').value = ag.month;
    document.getElementById('agendaTitleInput').value = ag.title;
    document.getElementById('agendaCostInput').value = ag.estimated_cost;
    document.getElementById('agendaDescInput').value = ag.description || '';
    document.getElementById('btnDeleteAgenda').style.display = 'inline-flex';

    openModal('modalAgenda');
}

async function handleAgendaSubmit(e) {
    e.preventDefault();
    const editId = parseInt(document.getElementById('agendaEditId').value) || 0;
    const m = parseInt(document.getElementById('selectedAgendaMonth').value) || 1;
    const title = document.getElementById('agendaTitleInput').value.trim();
    const cost = parseFloat(document.getElementById('agendaCostInput').value) || 0;
    const desc = document.getElementById('agendaDescInput').value.trim();

    const isEdit = editId > 0;
    const action = isEdit ? 'update_agenda' : 'add_agenda';

    try {
        const resp = await fetch(\x60?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: editId,
                month: m,
                title: title,
                estimated_cost: cost,
                description: desc,
                plan_year: appState.currentYear
            })
        });

        const res = await resp.json();
        if (res.success) {
            closeModal('modalAgenda');
            showSnackbar(isEdit ? 'Agenda berhasil diperbarui' : 'Agenda berhasil ditambahkan!');
            loadFinPlanData();
        } else {
            showSnackbar(res.message || 'Gagal menyimpan agenda', 'error');
        }
    } catch (e) {
        showSnackbar('Koneksi gagal', 'error');
    }
}

async function handleDeleteAgenda() {
    const editId = parseInt(document.getElementById('agendaEditId').value) || 0;
    if (editId <= 0) return;

    if (!confirm('Hapus agenda ini?')) return;

    try {
        const resp = await fetch(\x60?action=delete_agenda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editId })
        });
        const res = await resp.json();
        if (res.success) {
            closeModal('modalAgenda');
            showSnackbar('Agenda telah dihapus');
            loadFinPlanData();
        }
    } catch (e) {
        showSnackbar('Gagal menghapus agenda', 'error');
    }
}

// Settings Modal
function openSettingsModal() {
    document.getElementById('settingYearInput').value = appState.currentYear;
    document.getElementById('settingNotesInput').value = appState.settings.family_notes || '';
    document.getElementById('settingTargetInput').value = appState.settings.target_kekayaan || 15150000;
    openModal('modalSettings');
}

async function handleSettingsSubmit(e) {
    e.preventDefault();
    const year = parseInt(document.getElementById('settingYearInput').value) || 2026;
    const notes = document.getElementById('settingNotesInput').value.trim();
    const target = parseFloat(document.getElementById('settingTargetInput').value) || 0;

    try {
        const resp = await fetch(\x60?action=update_settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plan_year: year,
                family_notes: notes,
                target_kekayaan: target
            })
        });
        const res = await resp.json();
        if (res.success) {
            appState.currentYear = year;
            closeModal('modalSettings');
            showSnackbar('Pengaturan profil berhasil disimpan');
            loadFinPlanData();
        } else {
            showSnackbar(res.message || 'Gagal update settings', 'error');
        }
    } catch (e) {
        showSnackbar('Koneksi gagal', 'error');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}
