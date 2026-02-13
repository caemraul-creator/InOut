// ============================================
// LOG.JS - FIXED & IMPROVED
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
    
    document.getElementById('filterMonth').value = '';
    loadTransactions();
    
    const searchInput = document.getElementById('searchBarang');
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => { applyFilters(); }, 200);
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
    const filterJenis = document.getElementById('filterJenis').value; // Value: "In" atau "Out"
    
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
            const transMonth = transDate.toISOString().slice(0, 7);
            if (transMonth !== filterMonth) return false;
        }
        
        // Filter Jenis (FIXED)
        if (filterJenis) {
            const tJenis = (transaction.jenis || '').toLowerCase();
            // Normalisasi: 'masuk' = 'in', 'keluar' = 'out'
            const normalizedTJenis = (tJenis === 'masuk') ? 'in' : (tJenis === 'keluar') ? 'out' : tJenis;
            const normalizedFJenis = filterJenis.toLowerCase();
            
            if (normalizedTJenis !== normalizedFJenis) return false;
        }
        
        return true;
    });
    
    renderTable(filteredTransactions);
}

function parseIndonesianDate(dateStr) {
    if (!dateStr || dateStr === '-' || dateStr.trim() === '') return new Date(0);
    try {
        // Handle ISO/String format
        if (typeof dateStr === 'object' || dateStr.includes('GMT') || dateStr.includes('T')) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) return d;
        }
        
        // Handle dd/mm/yyyy HH:mm:ss
        if (dateStr.includes('/')) {
            const parts = String(dateStr).trim().split(' ');
            const dateParts = parts[0].split('/');
            if (dateParts.length >= 3) {
                const day = parseInt(dateParts[0], 10);
                const month = parseInt(dateParts[1], 10) - 1;
                const year = parseInt(dateParts[2], 10);
                let hours = 0, minutes = 0, seconds = 0;
                if (parts.length > 1 && parts[1].includes(':')) {
                    const timeParts = parts[1].split(':');
                    hours = parseInt(timeParts[0], 10) || 0;
                    minutes = parseInt(timeParts[1], 10) || 0;
                }
                return new Date(year, month, day, hours, minutes, seconds);
            }
        }
        return new Date(dateStr); // Fallback
    } catch (e) {
        return new Date(0);
    }
}

function formatDateForDisplay(date) {
    if (!date || date.getTime() === 0) return '-';
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${days[date.getDay()]}, ${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function renderTable(transactions) {
    const tbody = document.getElementById('logTableBody');
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="no-data"><i class="fas fa-inbox" style="font-size:2rem; margin-bottom:0.5rem; opacity:0.5;"></i><p>Tidak ada data</p></td></tr>`;
        return;
    }
    
    // Sort Descending
    transactions.sort((a, b) => parseIndonesianDate(b.tanggal).getTime() - parseIndonesianDate(a.tanggal).getTime());
    
    let html = '';
    transactions.forEach((t, index) => {
        const tDate = parseIndonesianDate(t.tanggal);
        const displayDate = formatDateForDisplay(tDate);
        const isIn = ['in', 'masuk'].includes((t.jenis || '').toLowerCase());
        const badgeClass = isIn ? 'badge-in' : 'badge-out';
        const badgeText = isIn ? 'Masuk' : 'Keluar';
        const jumlahColor = isIn ? '#38ef7d' : '#f45c43';
        const jumlahSign = isIn ? '+' : '-';
        
        html += `
            <tr style="animation: fadeInUp 0.3s ease ${index * 0.02}s both;">
                <td data-label="Tanggal"><i class="far fa-clock" style="color:var(--text-secondary); margin-right:5px;"></i>${displayDate}</td>
                <td data-label="Jenis"><span class="badge ${badgeClass}"><i class="fas fa-arrow-${isIn ? 'down' : 'up'}"></i> ${badgeText}</span></td>
                <td data-label="Nama Barang"><strong>${t.namaBarang || '-'}</strong><div style="font-size:0.75rem; color:var(--text-secondary);">ID: ${t.idBarang || '-'}</div></td>
                <td data-label="Jumlah"><span style="font-weight:700; color:${jumlahColor};">${jumlahSign}${t.jumlah || 0}</span></td>
                <td data-label="Keterangan" style="color:var(--text-secondary);">${t.keterangan || '-'}</td>
                <td data-label="Aksi" style="text-align:center;">
                    <button class="btn-delete-transaction" onclick="deleteTransaction(${t.rowIndex}, '${t.idBarang}', '${isIn ? 'In' : 'Out'}', ${t.jumlah}, '${(t.namaBarang || '').replace(/'/g, "\\'")}')">
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
        // Menggunakan API.post agar konsisten dengan app.js, atau fetch manual jika perlu
        // Asumsi API.post menghandle JSON
        const result = await API.post('deleteTransaction', {
            gudang: currentWarehouse,
            rowIndex: rowIndex,
            idBarang: idBarang,
            jenis: jenis,
            jumlah: jumlah
        });
        
        UI.hideLoading();
        
        // Cek sukses secara longgar
        if (result && (result.success || result.status === 'success')) {
            UI.showAlert('✅ Transaksi dihapus. Stok dikembalikan.', 'success');
            localStorage.setItem('dataBarangChanged', 'true'); // Trigger reload di index
            await loadTransactions(); // Reload log
        } else {
            throw new Error(result.error || 'Gagal menghapus');
        }
    } catch (error) {
        UI.hideLoading();
        console.error('Delete error:', error);
        UI.showAlert('❌ Gagal: ' + error.message, 'danger');
    }
}

// ============================================
// EXPORT SO BULANAN (CUTOFF 26-25)
// ============================================

async function exportMonthlySO() {
    const filterMonth = document.getElementById('filterMonth').value;
    if (!filterMonth) {
        UI.showAlert('❌ Pilih bulan terlebih dahulu!', 'warning');
        return;
    }
    
    const [year, month] = filterMonth.split('-').map(Number);
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    // Hitung periode cut-off (26 bln lalu - 25 bln ini)
    let startDate, prevMonthName;
    if (month === 1) { // Januari
        startDate = new Date(year - 1, 11, 26); // 26 Des thn lalu
        prevMonthName = 'Desember ' + (year - 1);
    } else {
        startDate = new Date(year, month - 2, 26); // 26 bln sebelumnya
        prevMonthName = monthNames[month - 2] + ' ' + year;
    }
    const endDate = new Date(year, month - 1, 25, 23, 59, 59); // 25 bln ini
    
    const formatDate = (d) => `${String(d.getDate()).padStart(2, '0')} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    
    const gudangDisplay = GudangMapping[currentWarehouse].display;
    if (!confirm(`Download SO ${gudangDisplay}\nPeriode: ${startDateStr} - ${endDateStr}?`)) return;

    try {
        UI.showLoading();
        
        // 1. Load Master Barang
        const masterBarang = await API.get('getAllBarang');
        if (!masterBarang || masterBarang.length === 0) throw new Error('Master barang kosong');
        
        // 2. Hitung Stok Akhir per Cut-off
        // Logika: Stok Akhir (Cut-off) = Stok Saat Ini + (Trans Keluar SETELAH Cut-off) - (Trans Masuk SETELAH Cut-off)
        
        // Kelompokkan transaksi SETELAH cut-off
        const transAfterCutOff = allTransactions.filter(t => parseIndonesianDate(t.tanggal) > endDate);
        const transInPeriod = allTransactions.filter(t => {
            const d = parseIndonesianDate(t.tanggal);
            return d >= startDate && d <= endDate;
        });

        // Map untuk menyimpan data SO
        const soMap = new Map();
        
        masterBarang.forEach(item => {
            const currentStok = Number(currentWarehouse === 'A' ? item.stokA : item.stokB) || 0;
            
            // Hitung penyesuaian stok (transaksi setelah cut-off)
            let adjustment = 0;
            transAfterCutOff.forEach(t => {
                if (t.idBarang === item.id) {
                    const jml = Number(t.jumlah) || 0;
                    const isOut = ['out', 'keluar'].includes((t.jenis || '').toLowerCase());
                    // Jika Keluar setelah cut-off, berarti stok sekarang berkurang. Maka stok di cut-off lebih besar.
                    adjustment += isOut ? jml : -jml; 
                }
            });
            
            // Stok Akhir Periode = Stok Sekarang + Penyesuaian
            const stokAkhirPeriode = currentStok + adjustment;
            
            soMap.set(item.id, {
                id: item.id, nama: item.nama, kategori: item.kategori, satuan: item.satuan,
                saldoAwal: 0, masuk: 0, keluar: 0, stokAkhir: stokAkhirPeriode,
                harga: item.harga || 0
            });
        });
        
        // Hitung Masuk/Keluar di dalam periode
        transInPeriod.forEach(t => {
            if (!soMap.has(t.idBarang)) return;
            const item = soMap.get(t.idBarang);
            const jml = Number(t.jumlah) || 0;
            const isOut = ['out', 'keluar'].includes((t.jenis || '').toLowerCase());
            
            if (isOut) item.keluar += jml;
            else item.masuk += jml;
        });
        
        // Hitung Saldo Awal
        soMap.forEach(item => {
            // Saldo Awal = Stok Akhir - Masuk + Keluar
            item.saldoAwal = item.stokAkhir - item.masuk + item.keluar;
        });
        
        // Filter item aktif
        const activeItems = Array.from(soMap.values()).filter(i => i.saldoAwal > 0 || i.masuk > 0 || i.keluar > 0 || i.stokAkhir > 0);
        
        // Generate CSV
        let csv = `"LAPORAN STOCK OPNAME - ${gudangDisplay}"\n`;
        csv += `"Periode: ${startDateStr} - ${endDateStr}"\n\n`;
        csv += `"No","ID","Nama Barang","Kategori","Satuan","Saldo Awal","Masuk","Keluar","Stok Akhir","Nilai"\n`;
        
        activeItems.forEach((item, i) => {
            const nilai = item.stokAkhir * item.harga;
            csv += `${i+1},"${item.id}","${item.nama}","${item.kategori}","${item.satuan}",${item.saldoAwal},${item.masuk},${item.keluar},${item.stokAkhir},${nilai}\n`;
        });
        
        const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `SO_${gudangDisplay.replace(/ /g,'')}_${monthNames[month-1]}${year}.csv`;
        link.click();
        
        UI.hideLoading();
        UI.showAlert(`✅ Export berhasil! ${activeItems.length} item.`, 'success');
        
    } catch (error) {
        UI.hideLoading();
        UI.showAlert('❌ Gagal export: ' + error.message, 'danger');
    }
}

// Global Access
window.switchWarehouse = switchWarehouse;
window.applyFilters = applyFilters;
window.deleteTransaction = deleteTransaction;
window.exportMonthlySO = exportMonthlySO;