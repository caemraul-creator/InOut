// ============================================
// LOG.JS - ROBUST DATE PARSING
// ============================================

let currentWarehouse = 'A';
let allTransactions = [];
let filteredTransactions = [];

const GudangMapping = {
    'A': { display: 'Gudang Kalipucang', value: 'Kalipucang' },
    'B': { display: 'Gudang Troso', value: 'Troso' }
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('Log page initializing...');
    
    if (!AUTH.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    
    loadTransactions();
    
    const searchInput = document.getElementById('searchBarang');
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => { applyFilters(); }, 300);
    });
});

function switchWarehouse(warehouse) {
    currentWarehouse = warehouse;
    document.getElementById('tabA').classList.remove('active');
    document.getElementById('tabB').classList.remove('active');
    document.getElementById('tab' + warehouse).classList.add('active');
    
    const gudangInfo = GudangMapping[warehouse];
    document.querySelector('.page-title').innerHTML = 
        `<i class="fas fa-clipboard-list"></i> Log - ${gudangInfo.display}`;
    
    loadTransactions();
}

async function loadTransactions() {
    try {
        UI.showLoading();
        const response = await API.get('getTransactions', { gudang: currentWarehouse });
        allTransactions = response || [];
        applyFilters();
        UI.hideLoading();
    } catch (error) {
        console.error('Error loading transactions:', error);
        UI.hideLoading();
        UI.showAlert('Gagal memuat data: ' + error.message, 'danger');
        allTransactions = [];
        renderTable([]);
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('searchBarang').value.toLowerCase().trim();
    const filterMonth = document.getElementById('filterMonth').value;
    const filterJenis = document.getElementById('filterJenis').value;
    
    filteredTransactions = allTransactions.filter(transaction => {
        // Filter Search
        if (searchTerm) {
            const matchId = (transaction.idBarang || '').toLowerCase().includes(searchTerm);
            const matchName = (transaction.namaBarang || '').toLowerCase().includes(searchTerm);
            if (!matchId && !matchName) return false;
        }
        
        // Filter Month
        if (filterMonth) {
            const transDate = parseIndonesianDate(transaction.tanggal);
            if (!transDate || transDate.getTime() === 0) return false;
            try {
                const transMonth = transDate.toISOString().slice(0, 7);
                if (transMonth !== filterMonth) return false;
            } catch (e) { return false; }
        }
        
        // Filter Jenis
        if (filterJenis) {
            const tJenis = (transaction.jenis || '').toLowerCase();
            const normalizedTJenis = (tJenis === 'masuk') ? 'in' : (tJenis === 'keluar') ? 'out' : tJenis;
            if (normalizedTJenis !== filterJenis.toLowerCase()) return false;
        }
        
        return true;
    });
    
    renderTable(filteredTransactions);
}

// ============================================
// ROBUST DATE PARSER
// ============================================
function parseIndonesianDate(dateStr) {
    if (!dateStr && dateStr !== 0) return new Date(0); // Handle null/undefined, but allow 0
    
    // 1. Jika angka (Excel Serial Date)
    if (typeof dateStr === 'number') {
        // Excel serial date conversion (adjust for Excel leap year bug)
        // Excel: 1 = Jan 1, 1900. JS: Jan 1, 1970.
        // Correct formula: (Serial - 25569) * 86400 * 1000
        const ms = (dateStr - 25569) * 86400 * 1000;
        return new Date(ms);
    }

    if (typeof dateStr !== 'string') return new Date(0);
    if (dateStr.trim() === '' || dateStr === '-') return new Date(0);

    try {
        // 2. Format ISO (YYYY-MM-DD atau YYYY-MM-DDTHH:mm:ss)
        if (dateStr.includes('T') || (dateStr.length === 10 && dateStr.includes('-'))) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) return d;
        }

        // 3. Format String DD/MM/YYYY HH:mm:ss
        if (dateStr.includes('/')) {
            const parts = dateStr.trim().split(' ');
            const dateParts = parts[0].split('/');
            
            if (dateParts.length >= 3) {
                const day = parseInt(dateParts[0], 10);
                const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
                const year = parseInt(dateParts[2], 10);
                
                let hours = 0, minutes = 0, seconds = 0;
                
                if (parts.length > 1 && parts[1].includes(':')) {
                    const timeParts = parts[1].split(':');
                    hours = parseInt(timeParts[0], 10) || 0;
                    minutes = parseInt(timeParts[1], 10) || 0;
                    seconds = parseInt(timeParts[2], 10) || 0;
                }
                
                const d = new Date(year, month, day, hours, minutes, seconds);
                if (!isNaN(d.getTime())) return d;
            }
        }
        
        // 4. Fallback General
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;
        
        return new Date(0);
    } catch (e) {
        console.error('Date parse error:', e);
        return new Date(0);
    }
}

function formatDateForDisplay(date) {
    if (!date || date.getTime() === 0) return '-';
    
    try {
        const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        
        const dayName = days[date.getDay()];
        const day = String(date.getDate()).padStart(2, '0');
        const monthName = months[date.getMonth()];
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${dayName}, ${day} ${monthName} ${year} ${hours}:${minutes}`;
    } catch (e) {
        return '-';
    }
}

function renderTable(transactions) {
    const tbody = document.getElementById('logTableBody');
    
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="no-data"><i class="fas fa-inbox" style="font-size:2rem; margin-bottom:0.5rem; opacity:0.5;"></i><p>Tidak ada data</p></td></tr>`;
        return;
    }
    
    // Sort Descending
    transactions.sort((a, b) => {
        const dateA = parseIndonesianDate(a.tanggal);
        const dateB = parseIndonesianDate(b.tanggal);
        return dateB.getTime() - dateA.getTime();
    });
    
    let html = '';
    transactions.forEach((t, index) => {
        // Ambil tanggal, cek berbagai kemungkinan key (fallback)
        const rawDate = t.tanggal || t.Tanggal || t.timestamp || t.Timestamp;
        const tDate = parseIndonesianDate(rawDate);
        const displayDate = formatDateForDisplay(tDate);
        
        const isIn = ['in', 'masuk'].includes((t.jenis || '').toLowerCase());
        const badgeClass = isIn ? 'badge-in' : 'badge-out';
        const badgeText = isIn ? 'Masuk' : 'Keluar';
        const jumlahColor = isIn ? '#38ef7d' : '#f45c43';
        const jumlahSign = isIn ? '+' : '-';
        
        const escapedNama = (t.namaBarang || '').replace(/'/g, "\\'");
        
        html += `
            <tr style="animation: fadeInUp 0.3s ease ${index * 0.02}s both;">
                <td data-label="Tanggal">
                    <i class="far fa-clock" style="color:var(--text-secondary); margin-right:5px;"></i>
                    ${displayDate}
                </td>
                <td data-label="Jenis">
                    <span class="badge ${badgeClass}">
                        <i class="fas fa-arrow-${isIn ? 'down' : 'up'}"></i> ${badgeText}
                    </span>
                </td>
                <td data-label="Nama Barang">
                    <strong>${t.namaBarang || '-'}</strong>
                    <div style="font-size:0.75rem; color:var(--text-secondary);">ID: ${t.idBarang || '-'}</div>
                </td>
                <td data-label="Jumlah">
                    <span style="font-weight:700; font-size:1.1rem; color:${jumlahColor};">
                        ${jumlahSign}${t.jumlah || 0}
                    </span>
                </td>
                <td data-label="Keterangan" style="color:var(--text-secondary);">
                    ${t.keterangan || '-'}
                </td>
                <td data-label="Aksi" style="text-align:center;">
                    <button class="btn-delete-transaction" 
                            onclick="deleteTransaction(${t.rowIndex}, '${t.idBarang}', '${isIn ? 'In' : 'Out'}', ${t.jumlah}, '${escapedNama}')">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

async function deleteTransaction(rowIndex, idBarang, jenis, jumlah, namaBarang) {
    if (!rowIndex) { UI.showAlert('❌ Index transaksi tidak valid', 'danger'); return; }
    
    if (!confirm(`Hapus transaksi ini?\n\nBarang: ${namaBarang}\nJenis: ${jenis}\nJumlah: ${jumlah}\n\nStok akan dikembalikan.`)) return;

    try {
        UI.showLoading();
        const result = await API.post('deleteTransaction', {
            gudang: currentWarehouse,
            rowIndex: rowIndex,
            idBarang: idBarang,
            jenis: jenis,
            jumlah: jumlah
        });
        
        UI.hideLoading();
        
        if (result && (result.success || result.status === 'success')) {
            UI.showAlert('✅ Transaksi dihapus. Stok dikembalikan.', 'success');
            localStorage.setItem('dataBarangChanged', 'true'); // Trigger reload di index
            await loadTransactions();
        } else {
            throw new Error(result.error || 'Gagal menghapus');
        }
    } catch (error) {
        UI.hideLoading();
        console.error('Delete error:', error);
        UI.showAlert('❌ Gagal: ' + error.message, 'danger');
    }
}

// ... (kode sebelumnya tetap sama sampai fungsi deleteTransaction) ...

// ============================================
// EXPORT SO BULANAN - EXCEL DENGAN BORDER
// ============================================

async function exportMonthlySO() {
    const filterMonth = document.getElementById('filterMonth').value;
    if (!filterMonth) {
        UI.showAlert('❌ Pilih bulan terlebih dahulu!', 'warning');
        return;
    }
    
    // Cek apakah library XLSX tersedia
    if (typeof XLSX === 'undefined') {
        UI.showAlert('❌ Library Export belum termuat. Coba refresh halaman.', 'danger');
        return;
    }

    const [year, month] = filterMonth.split('-').map(Number);
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    // Hitung periode cut-off
    let startDate;
    if (month === 1) {
        startDate = new Date(year - 1, 11, 26);
    } else {
        startDate = new Date(year, month - 2, 26);
    }
    const endDate = new Date(year, month - 1, 25, 23, 59, 59);
    
    const formatDate = (d) => `${String(d.getDate()).padStart(2, '0')} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    
    const gudangDisplay = GudangMapping[currentWarehouse].display;
    if (!confirm(`Download SO ${gudangDisplay}\nPeriode: ${startDateStr} - ${endDateStr}?`)) return;

    try {
        UI.showLoading();
        
        const masterBarang = await API.get('getAllBarang');
        if (!masterBarang || masterBarang.length === 0) throw new Error('Master barang kosong');
        
        // Proses data (sama seperti sebelumnya)
        const transAfterCutOff = allTransactions.filter(t => parseIndonesianDate(t.tanggal) > endDate);
        const transInPeriod = allTransactions.filter(t => {
            const d = parseIndonesianDate(t.tanggal);
            return d >= startDate && d <= endDate;
        });

        const soMap = new Map();
        
        masterBarang.forEach(item => {
            const currentStok = Number(currentWarehouse === 'A' ? item.stokA : item.stokB) || 0;
            let adjustment = 0;
            transAfterCutOff.forEach(t => {
                if (t.idBarang === item.id) {
                    const jml = Number(t.jumlah) || 0;
                    const isOut = ['out', 'keluar'].includes((t.jenis || '').toLowerCase());
                    adjustment += isOut ? jml : -jml; 
                }
            });
            const stokAkhirPeriode = currentStok + adjustment;
            
            soMap.set(item.id, {
                id: item.id, nama: item.nama, kategori: item.kategori, satuan: item.satuan,
                saldoAwal: 0, masuk: 0, keluar: 0, stokAkhir: stokAkhirPeriode,
                harga: item.harga || 0
            });
        });
        
        transInPeriod.forEach(t => {
            if (!soMap.has(t.idBarang)) return;
            const item = soMap.get(t.idBarang);
            const jml = Number(t.jumlah) || 0;
            const isOut = ['out', 'keluar'].includes((t.jenis || '').toLowerCase());
            if (isOut) item.keluar += jml;
            else item.masuk += jml;
        });
        
        soMap.forEach(item => {
            item.saldoAwal = item.stokAkhir - item.masuk + item.keluar;
        });
        
        const activeItems = Array.from(soMap.values()).filter(i => i.saldoAwal > 0 || i.masuk > 0 || i.keluar > 0 || i.stokAkhir > 0);
        
        // ============================================
        // MEMBUAT FILE EXCEL DENGAN STYLE
        // ============================================
        
        // 1. Siapkan Data Array
        const rows = [];
        
        // Header Laporan
        rows.push([{ v: "LAPORAN STOCK OPNAME (SO) BULANAN", s: { font: { bold: true, sz: 16 } } }]);
        rows.push([{ v: gudangDisplay.toUpperCase(), s: { font: { bold: true, sz: 12 } } }]);
        rows.push([{ v: "PERIODE CUT OFF", s: { font: { bold: true } } }]);
        rows.push([`DARI: ${startDateStr}`]);
        rows.push([`SAMPAI: ${endDateStr}`]);
        rows.push([]); // Spacer
        rows.push([`TANGGAL CETAK: ${new Date().toLocaleString('id-ID')}`]);
        rows.push([]); // Spacer
        
        // Header Tabel
        const tableHeader = ["NO", "ID BARANG", "NAMA BARANG", "KATEGORI", "SATUAN", "SALDO AWAL", "MASUK", "KELUAR", "SALDO AKHIR", "HARGA SATUAN", "TOTAL NILAI"];
        rows.push(tableHeader);
        
        // Data Tabel
        let totalNilaiAkhir = 0;
        activeItems.forEach((item, i) => {
            const nilai = item.stokAkhir * item.harga;
            totalNilaiAkhir += nilai;
            
            rows.push([
                i + 1,
                item.id,
                item.nama,
                item.kategori,
                item.satuan,
                item.saldoAwal,
                item.masuk,
                item.keluar,
                item.stokAkhir,
                item.harga,
                nilai
            ]);
        });
        
        // Footer Ringkasan
        rows.push([]); // Spacer
        rows.push(["RINGKASAN"]);
        rows.push(["Total Item Aktif", activeItems.length]);
        rows.push(["Total Saldo Awal", activeItems.reduce((s, i) => s + i.saldoAwal, 0)]);
        rows.push(["Total Masuk", activeItems.reduce((s, i) => s + i.masuk, 0)]);
        rows.push(["Total Keluar", activeItems.reduce((s, i) => s + i.keluar, 0)]);
        rows.push(["Total Saldo Akhir", activeItems.reduce((s, i) => s + i.stokAkhir, 0)]);
        rows.push(["Total Nilai Persediaan", totalNilaiAkhir]);
        
        // 2. Buat Worksheet
        const ws = XLSX.utils.aoa_to_sheet(rows);
        
        // 3. Definisikan Style
        const borderStyle = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" }
        };
        
        const headerCellStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4F81BD" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: borderStyle
        };
        
        const dataCellStyle = {
            border: borderStyle,
            alignment: { vertical: "center" }
        };
        
        const numberCellStyle = {
            border: borderStyle,
            alignment: { horizontal: "right", vertical: "center" }
        };
        
        // 4. Terapkan Style ke Range Tabel
        const range = XLSX.utils.decode_range(ws['!ref']);
        const startRow = 8; // Baris ke-9 (index 8) adalah header tabel
        const endRow = startRow + activeItems.length;
        
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                
                if (!ws[cellAddress]) continue;
                
                // Style Header Tabel (Baris ke-9)
                if (R === startRow) {
                    ws[cellAddress].s = headerCellStyle;
                }
                // Style Data Tabel
                else if (R > startRow && R <= endRow) {
                    // Kolom Number (Saldo, Masuk, Keluar, Harga, Nilai) -> Index 5,6,7,8,9,10
                    if (C >= 5) {
                        ws[cellAddress].s = numberCellStyle;
                        // Format Angka
                        if (typeof ws[cellAddress].v === 'number') {
                            ws[cellAddress].z = '#,##0';
                        }
                    } else {
                        ws[cellAddress].s = dataCellStyle;
                    }
                }
            }
        }
        
        // Set Column Widths
        ws['!cols'] = [
            { wch: 5 },  // NO
            { wch: 12 }, // ID
            { wch: 35 }, // NAMA
            { wch: 15 }, // KATEGORI
            { wch: 8 },  // SATUAN
            { wch: 12 }, // SALDO AWAL
            { wch: 10 }, // MASUK
            { wch: 10 }, // KELUAR
            { wch: 12 }, // SALDO AKHIR
            { wch: 15 }, // HARGA
            { wch: 18 }  // NILAI
        ];
        
        // 5. Buat Workbook dan Download
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Stock Opname");
        
        const fileName = `SO_${gudangDisplay.replace(/ /g, '')}_${monthNames[month - 1]}${year}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        UI.hideLoading();
        UI.showAlert(`✅ Export Excel berhasil!`, 'success');
        
    } catch (error) {
        UI.hideLoading();
        UI.showAlert('❌ Gagal export: ' + error.message, 'danger');
        console.error(error);
    }
}

// ... (kode selanjutnya tetap sama)

// Global Access
window.switchWarehouse = switchWarehouse;
window.applyFilters = applyFilters;
window.deleteTransaction = deleteTransaction;
window.exportMonthlySO = exportMonthlySO;