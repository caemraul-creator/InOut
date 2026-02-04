// ============================================
// LOG.JS - Transaction Log Functions
// ============================================

let currentWarehouse = 'A';
let allTransactions = [];
let filteredTransactions = [];

// Initialize log page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Log page initializing...');
    
    // Check authentication
    if (!AUTH.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Set default month to current month
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7); // Format: YYYY-MM
    document.getElementById('filterMonth').value = currentMonth;
    
    // Load initial data
    loadTransactions();
    
    // Setup real-time search
    const searchInput = document.getElementById('searchBarang');
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFilters();
        }, 500);
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
        // Search filter (ID or Name)
        if (searchTerm) {
            const matchId = (transaction.idBarang || '').toLowerCase().includes(searchTerm);
            const matchName = (transaction.namaBarang || '').toLowerCase().includes(searchTerm);
            if (!matchId && !matchName) return false;
        }
        
        // Month filter
        if (filterMonth) {
            const transDate = parseIndonesianDate(transaction.tanggal);
            const transMonth = transDate.toISOString().slice(0, 7); // Format: YYYY-MM
            if (transMonth !== filterMonth) return false;
        }
        
        // Transaction type filter
        if (filterJenis && transaction.jenis !== filterJenis) {
            return false;
        }
        
        return true;
    });
    
    console.log('Filtered transactions:', filteredTransactions.length, 'of', allTransactions.length);
    
    // Render table (show all filtered data, no limit)
    renderTable(filteredTransactions);
}

// Parse Indonesian date format (dd/MM/yyyy HH:mm:ss)
function parseIndonesianDate(dateStr) {
    if (!dateStr) return new Date();
    
    try {
        // Format: "31/12/2024 23:59:59" or "31/12/2024"
        const parts = dateStr.split(' ');
        const dateParts = parts[0].split('/');
        
        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
        const year = parseInt(dateParts[2]);
        
        let hours = 0, minutes = 0, seconds = 0;
        
        if (parts[1]) {
            const timeParts = parts[1].split(':');
            hours = parseInt(timeParts[0]) || 0;
            minutes = parseInt(timeParts[1]) || 0;
            seconds = parseInt(timeParts[2]) || 0;
        }
        
        return new Date(year, month, day, hours, minutes, seconds);
    } catch (error) {
        console.error('Date parse error:', error, dateStr);
        return new Date();
    }
}

// Render table
function renderTable(transactions) {
    const tbody = document.getElementById('logTableBody');
    
    if (transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="no-data">
                    <i class="fas fa-inbox"></i>
                    <p>Tidak ada data transaksi yang sesuai dengan filter</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by date (newest first)
    transactions.sort((a, b) => {
        const dateA = parseIndonesianDate(a.tanggal);
        const dateB = parseIndonesianDate(b.tanggal);
        return dateB - dateA;
    });
    
    let html = '';
    
    transactions.forEach((transaction, index) => {
        const badgeClass = transaction.jenis === 'In' ? 'badge-in' : 'badge-out';
        const badgeText = transaction.jenis === 'In' ? 'Masuk' : 'Keluar';
        const badgeIcon = transaction.jenis === 'In' ? 'fa-arrow-down' : 'fa-arrow-up';
        
        html += `
            <tr style="animation: fadeInUp 0.3s ease ${index * 0.03}s both;">
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
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    console.log('Table rendered with', transactions.length, 'rows');
}

// Export to CSV (bonus feature)
function exportToCSV() {
    if (filteredTransactions.length === 0) {
        UI.showAlert('Tidak ada data untuk di-export', 'warning');
        return;
    }
    
    let csv = 'Tanggal & Waktu,Jenis,ID Barang,Nama Barang,Jumlah,Keterangan,User/Petugas\n';
    
    filteredTransactions.forEach(t => {
        csv += `"${t.tanggal}","${t.jenis === 'In' ? 'Masuk' : 'Keluar'}","${t.idBarang}","${t.namaBarang}","${t.jumlah}","${t.keterangan}","${t.petugas}"\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `log_gudang_${currentWarehouse}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    UI.showAlert('Data berhasil di-export ke CSV', 'success');
}