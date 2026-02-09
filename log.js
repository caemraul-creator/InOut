// ============================================
// LOG.JS - Transaction Log Functions (WITH DELETE) - FINAL FIXED VERSION
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
    
    // Check authentication
    if (!AUTH.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Set default month to EMPTY (show all)
    document.getElementById('filterMonth').value = '';
    
    // Load initial data
    loadTransactions();
    
    // Setup real-time search
    const searchInput = document.getElementById('searchBarang');
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFilters();
        }, 200);
    });
    
    // Enter key to search
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
    
    // Update tab UI
    document.getElementById('tabA').classList.remove('active');
    document.getElementById('tabB').classList.remove('active');
    document.getElementById('tab' + warehouse).classList.add('active');
    
    // Update page title dengan nama gudang yang benar
    const gudangInfo = GudangMapping[warehouse];
    document.querySelector('.page-title').innerHTML = 
        `<i class="fas fa-clipboard-list"></i> Log - ${gudangInfo.display}`;
    
    // Reload transactions
    loadTransactions();
}

// Load transactions from Google Sheets
async function loadTransactions() {
    try {
        UI.showLoading();
        
        console.log('Loading transactions for Gudang', currentWarehouse);
        
        // Get transactions from the specific warehouse sheet
        const sheetName = 'T_GUDANG_' + currentWarehouse;
        console.log('Sheet name:', sheetName);
        
        // Call API to get transaction data
        const response = await API.get('getTransactions', {
            gudang: currentWarehouse
        });
        
        console.log('Transactions loaded:', response?.length || 0);
        
        // DEBUG: Show first few transactions for inspection
        if (response && response.length > 0) {
            console.log('Sample transaction:', response[0]);
            console.log('Date field type:', typeof response[0].tanggal);
            console.log('Date value:', response[0].tanggal);
        }
        
        allTransactions = response || [];
        
        // Apply filters
        applyFilters();
        
        UI.hideLoading();
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        UI.hideLoading();
        UI.showAlert('Gagal memuat data transaksi: ' + error.message, 'danger');
        
        // Show empty state
        allTransactions = [];
        renderTable([]);
    }
}

// Apply filters to transactions
function applyFilters() {
    console.log('Applying filters...');
    
    const searchTerm = document.getElementById('searchBarang').value.toLowerCase().trim();
    const filterMonth = document.getElementById('filterMonth').value; // Format: YYYY-MM
    const filterJenis = document.getElementById('filterJenis').value;
    
    console.log('Filters:', { searchTerm, filterMonth, filterJenis });
    
    // Filter transactions
    filteredTransactions = allTransactions.filter(transaction => {
        try {
            // Search filter (ID or Name)
            if (searchTerm) {
                const matchId = (transaction.idBarang || '').toLowerCase().includes(searchTerm);
                const matchName = (transaction.namaBarang || '').toLowerCase().includes(searchTerm);
                if (!matchId && !matchName) return false;
            }
            
            // Month filter
            if (filterMonth) {
                const transDate = parseIndonesianDate(transaction.tanggal);
                
                // Skip invalid dates
                if (!transDate || transDate.getTime() === 0) {
                    console.warn('Skipping transaction with invalid date:', transaction.tanggal);
                    return false;
                }
                
                try {
                    const transMonth = transDate.toISOString().slice(0, 7); // Format: YYYY-MM
                    if (transMonth !== filterMonth) return false;
                } catch (isoError) {
                    console.warn('Cannot convert date to ISO:', transaction.tanggal, isoError);
                    return false;
                }
            }
            
            // Transaction type filter
            if (filterJenis) {
                let transactionJenis = transaction.jenis || '';
                
                // Normalize for comparison
                const normalizedTransactionJenis = transactionJenis.toLowerCase();
                const normalizedFilterJenis = filterJenis.toLowerCase();
                
                // Map different jenis formats
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
    
    // Render table (show all filtered data, no limit)
    renderTable(filteredTransactions);
}

// Parse date from various formats
function parseIndonesianDate(dateStr) {
    if (!dateStr || dateStr === '-' || dateStr.trim() === '') {
        console.warn('Empty or invalid date string:', dateStr);
        return new Date(0);
    }
    
    try {
        // CASE 1: Jika sudah berupa Date object atau string Date JavaScript
        if (typeof dateStr === 'object' || dateStr.includes('GMT') || dateStr.includes('T')) {
            // Coba langsung parse sebagai Date
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        
        // CASE 2: Format Indonesia dd/MM/yyyy HH:mm:ss
        if (dateStr.includes('/')) {
            const parts = String(dateStr).trim().split(' ');
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
                
                const date = new Date(year, month, day, hours, minutes, seconds);
                
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
        
        // CASE 3: Fallback to standard JavaScript Date parsing
        const fallbackDate = new Date(dateStr);
        if (!isNaN(fallbackDate.getTime())) {
            return fallbackDate;
        }
        
        // If all fails, return epoch
        console.warn('Cannot parse date:', dateStr);
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
        console.error('Error formatting date:', date, error);
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
                    <i class="fas fa-inbox"></i>
                    <p>Tidak ada data transaksi yang sesuai dengan filter</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by date (newest first) - with safe date parsing
    transactions.sort((a, b) => {
        try {
            const dateA = parseIndonesianDate(a.tanggal);
            const dateB = parseIndonesianDate(b.tanggal);
            return dateB.getTime() - dateA.getTime();
        } catch (error) {
            console.warn('Error sorting transactions:', error);
            return 0;
        }
    });
    
    let html = '';
    
    transactions.forEach((transaction, index) => {
        // Parse date for display
        const transDate = parseIndonesianDate(transaction.tanggal);
        const displayDate = formatDateForDisplay(transDate);
        
        // Determine jenis display
        const isIn = ['in', 'masuk'].includes((transaction.jenis || '').toLowerCase());
        const badgeClass = isIn ? 'badge-in' : 'badge-out';
        const badgeText = isIn ? 'Masuk' : 'Keluar';
        const badgeIcon = isIn ? 'fa-arrow-down' : 'fa-arrow-up';
        const jumlahColor = isIn ? '#38ef7d' : '#f45c43';
        const jumlahSign = isIn ? '+' : '-';
        
        // Escape strings for data attributes
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
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // Add event listeners to delete buttons
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
// DELETE TRANSACTION FUNCTION - FIXED VERSION
// ============================================

async function deleteTransaction(rowIndex, idBarang, jenis, jumlah, namaBarang) {
    // Safety check for parameters
    if (!rowIndex || !idBarang || !jenis || !jumlah) {
        console.error('Invalid parameters for deleteTransaction:', {rowIndex, idBarang, jenis, jumlah});
        UI.showAlert('❌ Parameter tidak lengkap untuk menghapus transaksi', 'danger');
        return;
    }
    
    // Confirm dialog
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
        
        // Call API to delete transaction - USING POST METHOD
        const url = new URL(CONFIG.API_URL);
        url.searchParams.append('action', 'deleteTransaction');
        
        console.log('📤 API DELETE URL:', url.toString());
        
        // Use POST method instead of GET
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
        
        console.log('Fetch response status:', fetchResponse.status, fetchResponse.statusText);
        
        if (!fetchResponse.ok) {
            const errorText = await fetchResponse.text();
            console.error('Fetch error response:', errorText);
            throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
        }
        
        const responseText = await fetchResponse.text();
        console.log('Raw response text:', responseText);
        
        // Try to parse as JSON
        let response;
        try {
            response = JSON.parse(responseText);
            console.log('Parsed response:', response);
        } catch (parseError) {
            console.error('Failed to parse JSON:', parseError);
            console.log('Response was:', responseText);
            throw new Error('Invalid response from server');
        }
        
        // FIXED: Improved success checking
        let isSuccess = false;
        
        if (response) {
            // Check multiple possible success indicators
            if (response.success === true) {
                isSuccess = true;
            } else if (response.message && (response.message.includes('✅') || response.message.includes('berhasil'))) {
                isSuccess = true;
            } else if (response.gudang && response.idBarang) {
                isSuccess = true;
            } else if (response.stockReversal) {
                isSuccess = true;
            }
            
            // Special case: if response has data property
            if (response.data && response.data.success === true) {
                isSuccess = true;
            }
        }
        
        if (isSuccess) {
            UI.showAlert('✅ Transaksi berhasil dihapus dan stock dikembalikan', 'success');
            
            // Clear cache
            API.clearCache();
            
            // Set flag untuk auto-reload data barang di halaman index
            localStorage.setItem('dataBarangChanged', 'true');
            console.log('✅ Flag dataBarangChanged set to trigger index page reload');
            
            // Reload transactions
            await loadTransactions();
        } else {
            // Check for error message
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

// Export to CSV (bonus feature)
function exportToCSV() {
    if (filteredTransactions.length === 0) {
        UI.showAlert('Tidak ada data untuk di-export', 'warning');
        return;
    }
    
    // Get gudang display name for filename
    const gudangDisplay = GudangMapping[currentWarehouse].display;
    
    let csv = 'Tanggal & Waktu,Jenis,ID Barang,Nama Barang,Jumlah,Keterangan,User/Petugas\n';
    
    filteredTransactions.forEach(t => {
        const transDate = parseIndonesianDate(t.tanggal);
        const displayDate = formatDateForDisplay(transDate);
        
        const isIn = ['in', 'masuk'].includes((t.jenis || '').toLowerCase());
        const jenisDisplay = isIn ? 'Masuk' : 'Keluar';
        
        csv += `"${displayDate}","${jenisDisplay}","${t.idBarang}","${t.namaBarang}","${t.jumlah}","${t.keterangan}","${t.petugas}"\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `log_${gudangDisplay}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    UI.showAlert(`Data ${gudangDisplay} berhasil di-export ke CSV`, 'success');
}

// Export functions untuk digunakan di file lain
window.LogHelper = {
    switchWarehouse: switchWarehouse,
    applyFilters: applyFilters,
    exportToCSV: exportToCSV,
    deleteTransaction: deleteTransaction
};