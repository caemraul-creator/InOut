// ============================================
// LOG.JS - Transaction Log Functions + EXPORT SO BULANAN
// CUT OFF: 26 bulan sebelumnya - 25 bulan ini
// ============================================

let currentWarehouse = 'A';
let allTransactions = [];
let filteredTransactions = [];

// Gudang mapping helper
const GudangMapping = {
    'A': { display: 'Gudang Kalipucang', value: 'Kalipucang' },
    'B': { display: 'Gudang Troso', value: 'Troso' }
};

// Initialize log page
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
        searchTimeout = setTimeout(() => {
            applyFilters();
        }, 200);
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });
});

// Switch warehouse tab
function switchWarehouse(warehouse) {
    console.log('Switching to warehouse:', warehouse);
    
    currentWarehouse = warehouse;
    
    document.getElementById('tabA').classList.remove('active');
    document.getElementById('tabB').classList.remove('active');
    document.getElementById('tab' + warehouse).classList.add('active');
    
    const gudangInfo = GudangMapping[warehouse];
    document.querySelector('.page-title').innerHTML = 
        `<i class="fas fa-clipboard-list"></i> Log - ${gudangInfo.display}`;
    
    loadTransactions();
}

// Load transactions from Google Sheets
async function loadTransactions() {
    try {
        UI.showLoading();
        
        console.log('Loading transactions for Gudang', currentWarehouse);
        
        const sheetName = 'T_GUDANG_' + currentWarehouse;
        console.log('Sheet name:', sheetName);
        
        const response = await API.get('getTransactions', {
            gudang: currentWarehouse
        });
        
        console.log('Transactions loaded:', response?.length || 0);
        
        if (response && response.length > 0) {
            console.log('Sample transaction:', response[0]);
        }
        
        allTransactions = response || [];
        applyFilters();
        
        UI.hideLoading();
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        UI.hideLoading();
        UI.showAlert('Gagal memuat data transaksi: ' + error.message, 'danger');
        
        allTransactions = [];
        renderTable([]);
    }
}

// Apply filters to transactions
function applyFilters() {
    console.log('Applying filters...');
    
    const searchTerm = document.getElementById('searchBarang').value.toLowerCase().trim();
    const filterMonth = document.getElementById('filterMonth').value;
    const filterJenis = document.getElementById('filterJenis').value;
    
    console.log('Filters:', { searchTerm, filterMonth, filterJenis });
    
    filteredTransactions = allTransactions.filter(transaction => {
        try {
            if (searchTerm) {
                const matchId = (transaction.idBarang || '').toLowerCase().includes(searchTerm);
                const matchName = (transaction.namaBarang || '').toLowerCase().includes(searchTerm);
                if (!matchId && !matchName) return false;
            }
            
            if (filterMonth) {
                const transDate = parseIndonesianDate(transaction.tanggal);
                if (!transDate || transDate.getTime() === 0) {
                    return false;
                }
                try {
                    const transMonth = transDate.toISOString().slice(0, 7);
                    if (transMonth !== filterMonth) return false;
                } catch (isoError) {
                    return false;
                }
            }
            
            if (filterJenis) {
                let transactionJenis = transaction.jenis || '';
                const normalizedTransactionJenis = transactionJenis.toLowerCase();
                const normalizedFilterJenis = filterJenis.toLowerCase();
                
                const jenisMapping = {
                    'masuk': ['in', 'masuk'],
                    'keluar': ['out', 'keluar']
                };
                
                let match = false;
                if (jenisMapping[normalizedFilterJenis]) {
                    match = jenisMapping[normalizedFilterJenis].includes(normalizedTransactionJenis);
                } else {
                    match = normalizedTransactionJenis === normalizedFilterJenis;
                }
                
                if (!match) return false;
            }
            
            return true;
        } catch (filterError) {
            console.error('Error filtering transaction:', transaction, filterError);
            return false;
        }
    });
    
    console.log('Filtered transactions:', filteredTransactions.length, 'of', allTransactions.length);
    
    renderTable(filteredTransactions);
}

// Parse date from various formats
function parseIndonesianDate(dateStr) {
    if (!dateStr || dateStr === '-' || dateStr.trim() === '') {
        return new Date(0);
    }
    
    try {
        if (typeof dateStr === 'object' || dateStr.includes('GMT') || dateStr.includes('T')) {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        
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
                    seconds = parseInt(timeParts[2], 10) || 0;
                }
                
                const date = new Date(year, month, day, hours, minutes, seconds);
                
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
        
        const fallbackDate = new Date(dateStr);
        if (!isNaN(fallbackDate.getTime())) {
            return fallbackDate;
        }
        
        return new Date(0);
        
    } catch (error) {
        console.error('Error parsing date:', dateStr, error);
        return new Date(0);
    }
}

// Format date for display
function formatDateForDisplay(date) {
    if (!date || date.getTime() === 0) {
        return '-';
    }
    
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
    } catch (error) {
        return '-';
    }
}

// Render table
function renderTable(transactions) {
    const tbody = document.getElementById('logTableBody');
    
    if (!tbody) {
        console.error('Table body not found');
        return;
    }
    
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                    <p>Tidak ada data transaksi yang sesuai dengan filter</p>
                </td>
            </tr>
        `;
        return;
    }
    
    transactions.sort((a, b) => {
        try {
            const dateA = parseIndonesianDate(a.tanggal);
            const dateB = parseIndonesianDate(b.tanggal);
            return dateB.getTime() - dateA.getTime();
        } catch (error) {
            return 0;
        }
    });
    
    let html = '';
    
    transactions.forEach((transaction, index) => {
        const transDate = parseIndonesianDate(transaction.tanggal);
        const displayDate = formatDateForDisplay(transDate);
        
        const isIn = ['in', 'masuk'].includes((transaction.jenis || '').toLowerCase());
        const badgeClass = isIn ? 'badge-in' : 'badge-out';
        const badgeText = isIn ? 'Masuk' : 'Keluar';
        const badgeIcon = isIn ? 'fa-arrow-down' : 'fa-arrow-up';
        const jumlahColor = isIn ? '#38ef7d' : '#f45c43';
        const jumlahSign = isIn ? '+' : '-';
        
        const escapedNama = (transaction.namaBarang || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const escapedId = (transaction.idBarang || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const escapedJenis = isIn ? 'In' : 'Out';
        
        html += `
            <tr style="animation: fadeInUp 0.3s ease ${index * 0.03}s both;" data-row-index="${transaction.rowIndex || 0}">
                <td data-label="Tanggal & Waktu">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <i class="far fa-clock" style="color: var(--text-secondary);"></i>
                        ${displayDate}
                    </div>
                </td>
                <td data-label="Jenis">
                    <span class="badge ${badgeClass}">
                        <i class="fas ${badgeIcon}"></i> ${badgeText}
                    </span>
                </td>
                <td data-label="Nama Barang">
                    <strong>${transaction.namaBarang || '-'}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        ID: ${transaction.idBarang || '-'}
                    </div>
                </td>
                <td data-label="Jumlah">
                    <span style="font-weight: 700; font-size: 1.1rem; color: ${jumlahColor};">
                        ${jumlahSign}${transaction.jumlah || 0}
                    </span>
                </td>
                <td data-label="Keterangan" style="color: var(--text-secondary);">
                    ${transaction.keterangan || '-'}
                </td>
                <td data-label="Aksi" style="text-align: center;">
                    <button class="btn-delete-transaction" 
                            data-row-index="${transaction.rowIndex}"
                            data-id-barang="${escapedId}"
                            data-jenis="${escapedJenis}"
                            data-jumlah="${transaction.jumlah}"
                            data-nama-barang="${escapedNama}"
                            title="Hapus transaksi ini">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    const deleteButtons = document.querySelectorAll('.btn-delete-transaction');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const rowIndex = parseInt(this.getAttribute('data-row-index'));
            const idBarang = this.getAttribute('data-id-barang');
            const jenis = this.getAttribute('data-jenis');
            const jumlah = parseInt(this.getAttribute('data-jumlah'));
            const namaBarang = this.getAttribute('data-nama-barang');
            
            deleteTransaction(rowIndex, idBarang, jenis, jumlah, namaBarang);
        });
    });
    
    console.log('Table rendered with', transactions.length, 'rows');
}

// ============================================
// DELETE TRANSACTION FUNCTION
// ============================================

async function deleteTransaction(rowIndex, idBarang, jenis, jumlah, namaBarang) {
    if (!rowIndex || !idBarang || !jenis || !jumlah) {
        console.error('Invalid parameters for deleteTransaction:', {rowIndex, idBarang, jenis, jumlah});
        UI.showAlert('❌ Parameter tidak lengkap untuk menghapus transaksi', 'danger');
        return;
    }
    
    const confirmMsg = `Apakah Anda yakin ingin menghapus transaksi ini?\n\n` +
                      `Barang: ${namaBarang || idBarang}\n` +
                      `Jenis: ${jenis === 'In' ? 'Masuk' : 'Keluar'}\n` +
                      `Jumlah: ${jumlah}\n\n` +
                      `Stock akan dikembalikan ke kondisi sebelum transaksi.`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        UI.showLoading();
        
        console.log('Deleting transaction:', {
            rowIndex,
            idBarang,
            jenis,
            jumlah,
            gudang: currentWarehouse
        });
        
        const url = new URL(CONFIG.API_URL);
        url.searchParams.append('action', 'deleteTransaction');
        
        const fetchResponse = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                gudang: currentWarehouse,
                rowIndex: rowIndex,
                idBarang: idBarang,
                jenis: jenis,
                jumlah: jumlah
            })
        });
        
        if (!fetchResponse.ok) {
            const errorText = await fetchResponse.text();
            console.error('Fetch error response:', errorText);
            throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
        }
        
        const responseText = await fetchResponse.text();
        console.log('Raw response text:', responseText);
        
        let response;
        try {
            response = JSON.parse(responseText);
            console.log('Parsed response:', response);
        } catch (parseError) {
            console.error('Failed to parse JSON:', parseError);
            throw new Error('Invalid response from server');
        }
        
        let isSuccess = false;
        
        if (response) {
            if (response.success === true) {
                isSuccess = true;
            } else if (response.message && (response.message.includes('✅') || response.message.includes('berhasil'))) {
                isSuccess = true;
            } else if (response.gudang && response.idBarang) {
                isSuccess = true;
            } else if (response.stockReversal) {
                isSuccess = true;
            }
            
            if (response.data && response.data.success === true) {
                isSuccess = true;
            }
        }
        
        if (isSuccess) {
            UI.showAlert('✅ Transaksi berhasil dihapus dan stock dikembalikan', 'success');
            
            API.clearCache();
            localStorage.setItem('dataBarangChanged', 'true');
            console.log('✅ Flag dataBarangChanged set to trigger index page reload');
            
            await loadTransactions();
        } else {
            let errorMessage = 'Gagal menghapus transaksi - response tidak valid';
            if (response && response.error) {
                errorMessage = response.error;
            } else if (response && response.message) {
                errorMessage = response.message;
            }
            
            console.error('Delete failed:', response);
            throw new Error(errorMessage);
        }
        
        UI.hideLoading();
        
    } catch (error) {
        console.error('Error deleting transaction:', error);
        UI.hideLoading();
        UI.showAlert('❌ Gagal menghapus transaksi: ' + (error.message || 'Unknown error'), 'danger');
    }
}

// ============================================
// EXPORT MONTHLY SO REPORT (STOCK OPNAME)
// CUT OFF: 26 BULAN LALU - 25 BULAN INI
// ============================================

async function exportMonthlySO() {
    const filterMonth = document.getElementById('filterMonth').value;
    
    // VALIDASI: Harus pilih bulan
    if (!filterMonth) {
        UI.showAlert('❌ Pilih bulan terlebih dahulu!', 'warning', 4000);
        document.getElementById('filterMonth').focus();
        document.getElementById('filterMonth').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    
    // Parse tahun dan bulan yang dipilih
    const [year, month] = filterMonth.split('-');
    const currentYear = parseInt(year);
    const currentMonth = parseInt(month) - 1; // 0-indexed untuk JS Date
    
    // Nama bulan
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthName = monthNames[currentMonth];
    
    // ============================================
    // HITUNG PERIODE CUT OFF
    // ============================================
    
    // START DATE: 26 bulan sebelumnya
    let startDate;
    let prevMonthName;
    
    if (currentMonth === 0) { // Januari
        // Bulan sebelumnya adalah Desember tahun lalu
        startDate = new Date(currentYear - 1, 11, 26, 0, 0, 0); // 26 Desember tahun lalu
        prevMonthName = 'Desember ' + (currentYear - 1);
    } else {
        // Bulan sebelumnya
        startDate = new Date(currentYear, currentMonth - 1, 26, 0, 0, 0);
        prevMonthName = monthNames[currentMonth - 1] + ' ' + currentYear;
    }
    
    // END DATE: 25 bulan ini
    const endDate = new Date(currentYear, currentMonth, 25, 23, 59, 59);
    
    // Format untuk display
    const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };
    
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    
    // ============================================
    // KONFIRMASI
    // ============================================
    
    const gudangDisplay = GudangMapping[currentWarehouse].display;
    const confirmMsg = `📊 DOWNLOAD LAPORAN STOCK OPNAME (SO) BULANAN\n\n` +
                      `🏭 Gudang: ${gudangDisplay}\n` +
                      `📅 PERIODE CUT OFF:\n` +
                      `   Dari: ${startDateStr}\n` +
                      `   Sampai: ${endDateStr}\n\n` +
                      `Laporan akan berisi:\n` +
                      `• Saldo awal per ${startDateStr}\n` +
                      `• Total barang masuk (${startDateStr} - ${endDateStr})\n` +
                      `• Total barang keluar (${startDateStr} - ${endDateStr})\n` +
                      `• Saldo akhir per ${endDateStr}\n` +
                      `• Nilai persediaan\n\n` +
                      `Lanjutkan download?`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        UI.showLoading();
        
        console.log(`📊 Generating SO Report for ${gudangDisplay}`);
        console.log(`📅 Period: ${startDateStr} to ${endDateStr}`);
        console.log(`📦 All transactions count:`, allTransactions.length);
        
        // ============================================
        // STEP 1: FILTER TRANSAKSI SESUAI PERIODE CUT OFF
        // ============================================
        
        const periodTransactions = allTransactions.filter(transaction => {
            const transDate = parseIndonesianDate(transaction.tanggal);
            if (!transDate || transDate.getTime() === 0) {
                return false;
            }
            
            // Transaksi harus antara startDate dan endDate
            return transDate >= startDate && transDate <= endDate;
        });
        
        console.log(`📦 Transaksi dalam periode cut off: ${periodTransactions.length} records`);
        
        // ============================================
        // STEP 2: Dapatkan data stok dari master barang
        // ============================================
        
        console.log('📡 Fetching master barang...');
        let masterBarang;
        
        try {
            masterBarang = await API.get('getAllBarang');
            console.log(`✅ Master barang loaded: ${masterBarang.length} items`);
        } catch (error) {
            console.error('❌ Error loading master barang:', error);
            UI.hideLoading();
            UI.showAlert('❌ Gagal mengambil data master barang: ' + error.message, 'danger', 5000);
            return;
        }
        
        if (!masterBarang || masterBarang.length === 0) {
            UI.hideLoading();
            UI.showAlert('❌ Data master barang kosong!', 'danger', 5000);
            return;
        }
        
        // ============================================
        // STEP 3: HITUNG SALDO AWAL & PERGERAKAN
        // ============================================
        
        const sortedTransactions = [...periodTransactions].sort((a, b) => {
            const dateA = parseIndonesianDate(a.tanggal);
            const dateB = parseIndonesianDate(b.tanggal);
            return dateA.getTime() - dateB.getTime();
        });
        
        const soMap = new Map();
        
        // Inisialisasi dengan semua barang
        masterBarang.forEach(item => {
            const stokField = currentWarehouse === 'A' ? 'stokA' : 'stokB';
            const stokAkhir = Number(item[stokField]) || 0;
            
            soMap.set(item.id, {
                id: item.id,
                nama: item.nama,
                kategori: item.kategori,
                satuan: item.satuan,
                saldoAwal: 0,
                totalMasuk: 0,
                totalKeluar: 0,
                stokAkhir: stokAkhir,
                hargaSatuan: item.harga || 0,
                totalNilai: 0
            });
        });
        
        // Hitung total masuk/keluar dalam periode
        sortedTransactions.forEach(transaction => {
            const id = transaction.idBarang;
            if (!id || !soMap.has(id)) return;
            
            const item = soMap.get(id);
            const jumlah = Number(transaction.jumlah) || 0;
            const jenis = (transaction.jenis || '').toLowerCase();
            
            if (jenis === 'in' || jenis === 'masuk') {
                item.totalMasuk += jumlah;
            } else if (jenis === 'out' || jenis === 'keluar') {
                item.totalKeluar += jumlah;
            }
        });
        
        // Hitung saldo AWAL (stok akhir + total keluar - total masuk)
        soMap.forEach(item => {
            item.saldoAwal = item.stokAkhir + item.totalKeluar - item.totalMasuk;
            item.totalNilai = item.stokAkhir * (item.hargaSatuan || 0);
        });
        
        // ============================================
        // STEP 4: FILTER HANYA BARANG YANG AKTIF
        // ============================================
        
        const activeItems = Array.from(soMap.values()).filter(item => {
            return item.totalMasuk > 0 || 
                   item.totalKeluar > 0 || 
                   item.stokAkhir > 0 || 
                   item.saldoAwal > 0;
        });
        
        activeItems.sort((a, b) => a.nama.localeCompare(b.nama));
        
        // ============================================
        // STEP 5: GENERATE CSV
        // ============================================
        
        const gudangCode = currentWarehouse === 'A' ? 'Kalipucang' : 'Troso';
        const dateGenerated = new Date().toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        let csv = '';
        
        // HEADER LAPORAN
        csv += `"LAPORAN STOCK OPNAME (SO) BULANAN - WAREHOUSE PRO"\n`;
        csv += `"${gudangDisplay}"\n`;
        csv += `"PERIODE CUT OFF"\n`;
        csv += `"DARI: ${startDateStr}"\n`;
        csv += `"SAMPAI: ${endDateStr}"\n`;
        csv += `"\n"`;
        csv += `"TANGGAL GENERATE: ${dateGenerated}"\n`;
        csv += `"USER: ${AUTH.getUserName() || 'System'}"\n`;
        csv += `"\n"`;
        
        // HEADER TABEL
        csv += `"NO","ID BARANG","NAMA BARANG","KATEGORI","SATUAN","SALDO AWAL (${startDateStr})","MASUK","KELUAR","SALDO AKHIR (${endDateStr})","HARGA SATUAN","TOTAL NILAI"\n`;
        
        // DATA
        activeItems.forEach((item, index) => {
            const no = index + 1;
            const id = item.id;
            const nama = item.nama.replace(/"/g, '""');
            const kategori = item.kategori.replace(/"/g, '""');
            const satuan = item.satuan;
            const saldoAwal = item.saldoAwal;
            const masuk = item.totalMasuk;
            const keluar = item.totalKeluar;
            const stokAkhir = item.stokAkhir;
            const harga = item.hargaSatuan;
            const totalNilai = stokAkhir * harga;
            
            csv += `"${no}","${id}","${nama}","${kategori}","${satuan}",${saldoAwal},${masuk},${keluar},${stokAkhir},${harga},${totalNilai}\n`;
        });
        
        // RINGKASAN
        const totalBarang = activeItems.length;
        const totalStokAwal = activeItems.reduce((sum, item) => sum + item.saldoAwal, 0);
        const totalMasuk = activeItems.reduce((sum, item) => sum + item.totalMasuk, 0);
        const totalKeluar = activeItems.reduce((sum, item) => sum + item.totalKeluar, 0);
        const totalStokAkhir = activeItems.reduce((sum, item) => sum + item.stokAkhir, 0);
        const totalNilaiAkhir = activeItems.reduce((sum, item) => sum + (item.stokAkhir * (item.hargaSatuan || 0)), 0);
        
        csv += `\n`;
        csv += `"═══════════════════════════════════════════════════════════════════════════════"\n`;
        csv += `"RINGKASAN LAPORAN"\n`;
        csv += `"═══════════════════════════════════════════════════════════════════════════════"\n`;
        csv += `"Periode Cut Off","${startDateStr} - ${endDateStr}"\n`;
        csv += `"Total Item Aktif",${totalBarang}\n`;
        csv += `"Total Stok Awal (Unit)",${totalStokAwal}\n`;
        csv += `"Total Barang Masuk",${totalMasuk}\n`;
        csv += `"Total Barang Keluar",${totalKeluar}\n`;
        csv += `"Total Stok Akhir (Unit)",${totalStokAkhir}\n`;
        csv += `"Total Nilai Persediaan (Rp)",${totalNilaiAkhir}\n`;
        csv += `\n`;
        csv += `"═══════════════════════════════════════════════════════════════════════════════"\n`;
        csv += `"Gudang",${gudangCode}\n`;
        csv += `"Periode Laporan","${startDateStr} - ${endDateStr}"\n`;
        csv += `"Dibuat oleh",${AUTH.getUserName() || 'System'}\n`;
        csv += `"Tanggal Generate",${dateGenerated}\n`;
        csv += `"═══════════════════════════════════════════════════════════════════════════════"\n`;
        
        // ============================================
        // STEP 6: DOWNLOAD FILE
        // ============================================
        
        // Format nama file: SO_GudangKalipucang_Januari2026_26Des2025-25Jan2026.csv
        const startDay = String(startDate.getDate()).padStart(2, '0');
        const startMonth = monthNames[startDate.getMonth()].substring(0, 3);
        const startYear = startDate.getFullYear();
        const endDay = String(endDate.getDate()).padStart(2, '0');
        const endMonth = monthNames[endDate.getMonth()].substring(0, 3);
        const endYear = endDate.getFullYear();
        
        const fileName = `SO_${gudangDisplay.replace(/ /g, '')}_${monthName}${year}_${startDay}${startMonth}${startYear}-${endDay}${endMonth}${endYear}.csv`;
        
        const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        UI.hideLoading();
        
        // ============================================
        // STEP 7: TAMPILKAN RINGKASAN
        // ============================================
        
        UI.showAlert(
            `✅ Laporan SO ${gudangDisplay} periode ${startDateStr} - ${endDateStr} berhasil di-download!\n` +
            `📦 ${totalBarang} item aktif | 📊 Total transaksi: ${periodTransactions.length} | 💰 Nilai: Rp ${totalNilaiAkhir.toLocaleString('id-ID')}`,
            'success', 
            8000
        );
        
        console.log(`✅ SO Report generated: ${fileName}`);
        console.log(`📊 Period: ${startDateStr} - ${endDateStr}`);
        console.log(`📊 Summary: Awal=${totalStokAwal}, Masuk=${totalMasuk}, Keluar=${totalKeluar}, Akhir=${totalStokAkhir}, Nilai=Rp ${totalNilaiAkhir}`);
        
    } catch (error) {
        console.error('❌ Error generating SO report:', error);
        UI.hideLoading();
        UI.showAlert('❌ Gagal membuat laporan: ' + error.message, 'danger', 5000);
    }
}

// ============================================
// EXPORT TO CSV (Bonus Feature)
// ============================================

function exportToCSV() {
    if (filteredTransactions.length === 0) {
        UI.showAlert('Tidak ada data untuk di-export', 'warning');
        return;
    }
    
    const gudangDisplay = GudangMapping[currentWarehouse].display;
    
    let csv = 'Tanggal & Waktu,Jenis,ID Barang,Nama Barang,Jumlah,Keterangan,User/Petugas\n';
    
    filteredTransactions.forEach(t => {
        const transDate = parseIndonesianDate(t.tanggal);
        const displayDate = formatDateForDisplay(transDate);
        
        const isIn = ['in', 'masuk'].includes((t.jenis || '').toLowerCase());
        const jenisDisplay = isIn ? 'Masuk' : 'Keluar';
        
        csv += `"${displayDate}","${jenisDisplay}","${t.idBarang}","${t.namaBarang}","${t.jumlah}","${t.keterangan}","${t.petugas}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `log_${gudangDisplay}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    UI.showAlert(`✅ Data ${gudangDisplay} berhasil di-export ke CSV`, 'success');
}

// Export functions untuk digunakan di file lain
window.LogHelper = {
    switchWarehouse: switchWarehouse,
    applyFilters: applyFilters,
    exportToCSV: exportToCSV,
    deleteTransaction: deleteTransaction,
    exportMonthlySO: exportMonthlySO,
    loadTransactions: loadTransactions // Tambahkan ini
};

// Make functions globally accessible untuk onclick
window.switchWarehouse = switchWarehouse;
window.applyFilters = applyFilters;
window.exportToCSV = exportToCSV;
window.deleteTransaction = deleteTransaction;
window.exportMonthlySO = exportMonthlySO;
window.loadTransactions = loadTransactions;