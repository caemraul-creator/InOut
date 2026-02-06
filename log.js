// ============================================
// LOG.JS - Transaction Log Functions (WITH DELETE)
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
    // User can manually select month if needed
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
        
        console.log('Transactions loaded:', response);
        
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
            if (filterJenis && transaction.jenis !== filterJenis) {
                return false;
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

// Parse Indonesian date format (dd/MM/yyyy HH:mm:ss)
function parseIndonesianDate(dateStr) {
    if (!dateStr || dateStr === '-' || dateStr.trim() === '') {
        console.warn('Empty or invalid date string:', dateStr);
        return new Date(0); // Return epoch time for invalid dates
    }
    
    try {
        // Format: "31/12/2024 23:59:59" or "31/12/2024"
        const parts = String(dateStr).trim().split(' ');
        const dateParts = parts[0].split('/');
        
        // Validate date parts
        if (dateParts.length < 3) {
            console.warn('Invalid date format (missing parts):', dateStr);
            return new Date(0);
        }
        
        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
        const year = parseInt(dateParts[2]);
        
        // Validate numeric values
        if (isNaN(day) || isNaN(month) || isNaN(year)) {
            console.warn('Invalid date values:', { day, month, year, dateStr });
            return new Date(0);
        }
        
        // Validate ranges
        if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900 || year > 2100) {
            console.warn('Date values out of range:', { day, month, year, dateStr });
            return new Date(0);
        }
        
        let hours = 0, minutes = 0, seconds = 0;
        
        if (parts[1]) {
            const timeParts = parts[1].split(':');
            hours = parseInt(timeParts[0]) || 0;
            minutes = parseInt(timeParts[1]) || 0;
            seconds = parseInt(timeParts[2]) || 0;
        }
        
        const date = new Date(year, month, day, hours, minutes, seconds);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.warn('Constructed date is invalid:', dateStr, date);
            return new Date(0);
        }
        
        return date;
    } catch (error) {
        console.error('Date parse error:', error, 'for dateStr:', dateStr);
        return new Date(0); // Return epoch time on error
    }
}

// Render table
function renderTable(transactions) {
    const tbody = document.getElementById('logTableBody');
    
    if (transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">
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
        const badgeClass = transaction.jenis === 'In' ? 'badge-in' : 'badge-out';
        const badgeText = transaction.jenis === 'In' ? 'Masuk' : 'Keluar';
        const badgeIcon = transaction.jenis === 'In' ? 'fa-arrow-down' : 'fa-arrow-up';
        
        // Escape strings for data attributes
        const escapedNama = (transaction.namaBarang || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const escapedId = (transaction.idBarang || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const escapedJenis = (transaction.jenis || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        
        html += `
            <tr style="animation: fadeInUp 0.3s ease ${index * 0.03}s both;" data-row-index="${transaction.rowIndex || 0}">
                <td data-label="Tanggal & Waktu">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <i class="far fa-clock" style="color: var(--text-secondary);"></i>
                        ${transaction.tanggal || '-'}
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
                    <span style="font-weight: 700; font-size: 1.1rem; color: ${transaction.jenis === 'In' ? '#38ef7d' : '#f45c43'};">
                        ${transaction.jenis === 'In' ? '+' : '-'}${transaction.jumlah || 0}
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
// DELETE TRANSACTION FUNCTION
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
        
        // Call API to delete transaction
        const response = await API.post('deleteTransaction', {
            gudang: currentWarehouse,
            rowIndex: rowIndex,
            idBarang: idBarang,
            jenis: jenis,
            jumlah: jumlah
        });
        
        console.log('Delete response:', response);
        
        if (response && response.success) {
            UI.showAlert('✅ Transaksi berhasil dihapus dan stock dikembalikan', 'success');
            
            // Reload transactions
            await loadTransactions();
        } else {
            throw new Error(response?.error || 'Gagal menghapus transaksi');
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
        csv += `"${t.tanggal}","${t.jenis === 'In' ? 'Masuk' : 'Keluar'}","${t.idBarang}","${t.namaBarang}","${t.jumlah}","${t.keterangan}","${t.petugas}"\n`;
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