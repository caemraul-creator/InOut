// ============================================
// APP.JS - FINAL VERSION (MODIFIED)
// Support Gudang Kalipucang & Gudang Troso
// Spreadsheet tetap pakai A/B
// ============================================

let dataMaster = [];
let dataKategori = [];
let html5QrCode = null;
let tempSelectedItem = null;
let pendingTransaction = null;
let searchedQuery = '';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 App initializing...');
    
    if (typeof AUTH !== 'undefined') {
        AUTH.init();
    }
    
    if (window.location.pathname.includes('login.html')) {
        console.log('On login page, skipping app init');
        return;
    }
    
    if (!AUTH.isLoggedIn()) {
        console.log('User not logged in, redirecting...');
        return;
    }
    
    if (document.getElementById('transaksiForm')) {
        initIndexPage();
    }
});

// ============================================
// INDEX PAGE
// ============================================

async function initIndexPage() {
    console.log('📄 Initializing index page...');
    
    try {
        await loadDataBarang();
        await loadKategori();
        
        if (AUTH && typeof AUTH.autoFillForm === 'function') {
            AUTH.autoFillForm();
        }
        
        setupEventListeners();
        setupConfirmationModal();
        setupAddItemModal();
        
        console.log('✅ Index page initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing index page:', error);
        UI.showAlert('Error initializing app: ' + error.message, 'danger');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    console.log('🔌 Setting up event listeners...');
    
    const searchInput = document.getElementById('manualIdInput');
    if (!searchInput) {
        console.error('❌ Search input not found!');
        return;
    }
    
    let searchTimeout;
    
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length >= 2) {
            searchTimeout = setTimeout(() => {
                searchBarang(query);
            }, 150); // Dipercepat dari 300ms ke 150ms
        } else {
            hideItemResult();
        }
    });
    
    const btnScan = document.getElementById('btnScan');
    if (btnScan) {
        btnScan.addEventListener('click', startScanner);
    }
    
    const btnReset = document.getElementById('btnReset');
    if (btnReset) {
        btnReset.addEventListener('click', resetItem);
    }
    
    const form = document.getElementById('transaksiForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('📝 Form submitted');
            showConfirmation();
        });
    }
    
    const warehouseBtns = document.querySelectorAll('.warehouse-btn');
    warehouseBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            updateStockDisplay();
        });
    });
    
    console.log('✅ Event listeners set up successfully');
}

// ============================================
// ADD ITEM MODAL
// ============================================

function setupAddItemModal() {
    console.log('🔧 Setting up add item modal...');
    
    const btnCloseModal = document.getElementById('btnCloseAddModal');
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', closeAddItemModal);
    }
    
    const btnCancelAddItem = document.getElementById('btnCancelAddItem');
    if (btnCancelAddItem) {
        btnCancelAddItem.addEventListener('click', closeAddItemModal);
    }
    
    const tabBtns = document.querySelectorAll('.modal-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });
    
    const addItemForm = document.getElementById('addItemForm');
    if (addItemForm) {
        addItemForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await submitNewItem();
        });
    }
    
    const addKategoriForm = document.getElementById('addKategoriForm');
    if (addKategoriForm) {
        addKategoriForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await submitNewKategori();
        });
    }
    
    const kategoriSelect = document.getElementById('newItemKategori');
    if (kategoriSelect) {
        kategoriSelect.addEventListener('change', function() {
            generateNewItemId();
        });
    }
    
    console.log('✅ Add item modal set up');
}

function openAddItemModal(query = '') {
    console.log('📦 Opening add item modal for:', query);
    
    searchedQuery = query;
    
    const namaInput = document.getElementById('newItemNama');
    if (namaInput && query) {
        namaInput.value = query;
    }
    
    populateKategoriOptions();
    
    const modal = document.getElementById('addItemModal');
    if (modal) {
        modal.classList.add('show');
        
        setTimeout(() => {
            if (namaInput) namaInput.focus();
        }, 150); // Dipercepat dari 300ms ke 150ms
    }
}

function closeAddItemModal() {
    console.log('Closing add item modal');
    
    const modal = document.getElementById('addItemModal');
    if (modal) {
        modal.classList.remove('show');
    }
    
    const addItemForm = document.getElementById('addItemForm');
    if (addItemForm) {
        addItemForm.reset();
    }
    
    searchedQuery = '';
}

function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    const tabBtns = document.querySelectorAll('.modal-tab-btn');
    tabBtns.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    const barangTab = document.getElementById('barangTab');
    const kategoriTab = document.getElementById('kategoriTab');
    
    if (tabName === 'barang') {
        barangTab.classList.add('active');
        kategoriTab.classList.remove('active');
    } else {
        barangTab.classList.remove('active');
        kategoriTab.classList.add('active');
    }
}

function populateKategoriOptions() {
    const select = document.getElementById('newItemKategori');
    if (!select) return;
    
    select.innerHTML = '<option value="">Pilih kategori</option>';
    
    dataKategori.forEach(kat => {
        const option = document.createElement('option');
        option.value = kat.inisial;
        option.textContent = kat.nama;
        option.dataset.inisial = kat.inisial;
        select.appendChild(option);
    });
    
    console.log('✅ Kategori options populated:', dataKategori.length);
}

function generateNewItemId() {
    const kategoriSelect = document.getElementById('newItemKategori');
    const idInput = document.getElementById('newItemId');
    
    if (!kategoriSelect || !idInput) return;
    
    const inisial = kategoriSelect.value;
    
    if (!inisial) {
        idInput.value = '';
        return;
    }
    
    const existingIds = dataMaster
        .filter(item => item.id.startsWith(inisial + '-'))
        .map(item => {
            const parts = item.id.split('-');
            return parseInt(parts[1]) || 0;
        });
    
    const nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    const newId = `${inisial}-${String(nextNum).padStart(3, '0')}`;
    
    idInput.value = newId;
    console.log('Generated new ID:', newId);
}

async function submitNewItem() {
    const idBarang = document.getElementById('newItemId').value;
    const nama = document.getElementById('newItemNama').value;
    const kategoriSelect = document.getElementById('newItemKategori');
    const kategori = kategoriSelect.selectedOptions[0]?.text || 'Umum';
    const satuan = document.getElementById('newItemSatuan').value;
    const stokAwal = document.getElementById('newItemStok').value;
    const gudang = document.getElementById('newItemGudang').value;
    
    // ✅ GET CURRENT USER
    const user = AUTH.getUserName() || 'System';
    
    console.log('📦 Submitting new item:', { idBarang, nama, kategori, satuan, stokAwal, gudang, user });
    
    try {
        UI.showLoading();
        
        const result = await API.post('addBarang', {
            idBarang: idBarang,
            nama: nama,
            kategori: kategori,
            satuan: satuan,
            stokAwal: stokAwal,
            gudang: gudang, // Kirim A/B
            user: user
        });
        
        console.log('✅ New item added:', result);
        
        UI.hideLoading();
        UI.showAlert('✅ Barang baru berhasil ditambahkan!', 'success');
        
        await loadDataBarang();
        
        closeAddItemModal();
        
        const newItem = dataMaster.find(item => item.id === idBarang);
        if (newItem) {
            selectItem(newItem);
        }
        
    } catch (error) {
        console.error('❌ Error adding item:', error);
        UI.hideLoading();
        UI.showAlert('❌ Gagal menambah barang: ' + error.message, 'danger');
    }
}

async function submitNewKategori() {
    const nama = document.getElementById('newKategoriNama').value;
    const inisial = document.getElementById('newKategoriInisial').value.toUpperCase();
    
    console.log('🏷️ Submitting new kategori:', { nama, inisial });
    
    try {
        UI.showLoading();
        
        const result = await API.post('addKategori', {
            nama: nama,
            inisial: inisial
        });
        
        console.log('✅ New kategori added:', result);
        
        UI.hideLoading();
        UI.showAlert('✅ Kategori baru berhasil ditambahkan!', 'success');
        
        await loadKategori();
        
        switchTab('barang');
        
        document.getElementById('addKategoriForm').reset();
        
        populateKategoriOptions();
        
        const kategoriSelect = document.getElementById('newItemKategori');
        if (kategoriSelect) {
            kategoriSelect.value = inisial;
            generateNewItemId();
        }
        
    } catch (error) {
        console.error('❌ Error adding kategori:', error);
        UI.hideLoading();
        UI.showAlert('❌ Gagal menambah kategori: ' + error.message, 'danger');
    }
}

// ============================================
// CONFIRMATION MODAL
// ============================================

function setupConfirmationModal() {
    const modal = document.getElementById('confirmModal');
    const btnCancel = document.getElementById('btnCancelConfirm');
    const btnOk = document.getElementById('btnOkConfirm');
    
    if (btnCancel) {
        btnCancel.addEventListener('click', hideConfirmation);
    }
    
    if (btnOk) {
        btnOk.addEventListener('click', submitTransaction);
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideConfirmation();
            }
        });
    }
}

function showConfirmation() {
    console.log('📋 Showing confirmation modal...');
    
    if (!validateForm()) {
        console.log('❌ Form validation failed');
        return;
    }
    
    const gudangBtn = document.querySelector('.warehouse-btn.active');
    const gudangValue = gudangBtn.dataset.warehouse; // "Kalipucang" atau "Troso"
    const gudangDisplay = getGudangDisplayNameFromValue(gudangValue);
    
    const jenis = document.querySelector('.type-btn.active').dataset.type;
    const barangNama = tempSelectedItem ? tempSelectedItem.nama : '-';
    const barangId = tempSelectedItem ? tempSelectedItem.id : '-';
    const jumlah = document.getElementById('jumlah').value;
    const satuan = tempSelectedItem ? tempSelectedItem.satuan : 'Unit';
    const petugas = document.getElementById('user').value;
    const keterangan = document.getElementById('keterangan').value;
    
    // Kirim A/B ke API, tampilkan nama lengkap ke user
    const gudangApi = gudangValue === 'Kalipucang' ? 'A' : 'B';
    
    pendingTransaction = {
        lokasiGudang: gudangApi, // Kirim "A" atau "B" ke API
        jenis: jenis,
        idBarang: barangId,
        namaBarang: barangNama,
        jumlah: jumlah,
        satuan: satuan,
        user: petugas,
        keterangan: keterangan
    };
    
    console.log('📦 Pending transaction:', pendingTransaction);
    
    document.getElementById('confirmGudang').textContent = gudangDisplay;
    document.getElementById('confirmJenis').textContent = jenis;
    document.getElementById('confirmBarang').textContent = barangNama;
    document.getElementById('confirmId').textContent = barangId;
    document.getElementById('confirmJumlah').textContent = `${jumlah} ${satuan}`;
    document.getElementById('confirmPetugas').textContent = petugas;
    
    const ketRow = document.getElementById('confirmKetRow');
    if (keterangan && keterangan.trim() !== '') {
        document.getElementById('confirmKeterangan').textContent = keterangan;
        ketRow.style.display = 'flex';
    } else {
        ketRow.style.display = 'none';
    }
    
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.classList.add('show');
        console.log('✅ Confirmation modal shown');
    }
}

function hideConfirmation() {
    console.log('Hiding confirmation modal');
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.classList.remove('show');
    }
    pendingTransaction = null;
}

function validateForm() {
    console.log('🔍 Validating form...');
    
    if (!tempSelectedItem) {
        UI.showAlert('⚠️ Pilih barang terlebih dahulu!', 'danger');
        return false;
    }
    
    const jumlah = document.getElementById('jumlah').value;
    if (!jumlah || jumlah <= 0) {
        UI.showAlert('⚠️ Jumlah tidak valid!', 'danger');
        return false;
    }
    
    const user = document.getElementById('user').value;
    if (!user || user.trim() === '') {
        UI.showAlert('⚠️ Nama petugas harus diisi!', 'danger');
        return false;
    }
    
    console.log('✅ Form validation passed');
    return true;
}

async function submitTransaction() {
    if (!pendingTransaction) {
        console.error('❌ No pending transaction');
        return;
    }
    
    const btnOk = document.getElementById('btnOkConfirm');
    const originalText = btnOk.innerHTML;
    
    try {
        console.log('💾 Submitting transaction...');
        console.log('Transaction data:', pendingTransaction);
        
        btnOk.disabled = true;
        btnOk.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        
        const result = await API.post('submitTransaksi', pendingTransaction);
        
        console.log('✅ Transaction submitted successfully:', result);
        
        hideConfirmation();
        UI.showAlert('✅ Transaksi berhasil disimpan!', 'success');
        
        setTimeout(() => {
            resetForm();
        }, 500);
        
    } catch (error) {
        console.error('❌ Error submitting transaction:', error);
        UI.showAlert('❌ Gagal menyimpan transaksi: ' + error.message, 'danger');
        btnOk.disabled = false;
        btnOk.innerHTML = originalText;
    }
}

// ============================================
// DATA LOADING
// ============================================

async function loadDataBarang() {
    try {
        console.log('📡 Loading data barang...');
        UI.showLoading();
        
        const data = await API.get('getBarangList');
        dataMaster = data;
        
        console.log(`✅ Loaded ${data.length} items`);
        
        UI.hideLoading();
        
    } catch (error) {
        console.error('❌ Error loading data:', error);
        UI.hideLoading();
        UI.showAlert('❌ Gagal memuat data barang: ' + error.message, 'danger');
    }
}

async function loadKategori() {
    try {
        console.log('📡 Loading kategori...');
        
        const data = await API.get('getKategoriList');
        dataKategori = data;
        
        console.log(`✅ Loaded ${data.length} categories`);
        
    } catch (error) {
        console.error('❌ Error loading kategori:', error);
        dataKategori = [
            { nama: 'Umum', inisial: 'UMM' },
            { nama: 'Elektronik', inisial: 'ELEC' },
            { nama: 'Tools', inisial: 'TOOL' }
        ];
    }
}

// ============================================
// SEARCH
// ============================================

function searchBarang(query) {
    console.log('🔎 Searching for:', query);
    
    const results = dataMaster.filter(item => {
        return item.id.toLowerCase().includes(query.toLowerCase()) ||
               item.nama.toLowerCase().includes(query.toLowerCase());
    });
    
    console.log(`Found ${results.length} results`);
    
    if (results.length > 0) {
        selectItem(results[0]);
    } else {
        hideItemResult();
        
        UI.showAlert('❌ Barang tidak ditemukan. Membuka form tambah barang...', 'warning', 2000);
        
        setTimeout(() => {
            openAddItemModal(query);
        }, 500);
    }
}

function selectItem(item) {
    console.log('✅ Item selected:', item);
    
    tempSelectedItem = item;
    
    document.getElementById('itemName').textContent = item.nama;
    document.getElementById('itemId').textContent = 'ID: ' + item.id;
    document.getElementById('itemKategori').textContent = item.kategori;
    document.getElementById('itemSatuan').textContent = item.satuan;
    document.getElementById('satuanLabel').textContent = item.satuan;
    
    updateStockDisplay();
    
    document.getElementById('itemResult').classList.remove('hidden');
    document.getElementById('manualIdInput').value = item.nama;
    
    // ✅ TAMBAHKAN INI - Update gudang colors
    updateGudangColors();
}

function updateStockDisplay() {
    if (!tempSelectedItem) return;
    
    const activeWarehouse = document.querySelector('.warehouse-btn.active');
    const gudang = activeWarehouse ? activeWarehouse.dataset.warehouse : 'Kalipucang';
    
    // Mapping: Kalipucang = A, Troso = B
    const gudangKey = gudang === 'Kalipucang' ? 'A' : 'B';
    const stok = gudangKey === 'A' ? tempSelectedItem.stokA : tempSelectedItem.stokB;
    
    console.log(`Stock for ${gudang} (${gudangKey}):`, stok);
    
    const displayName = getGudangDisplayNameFromValue(gudang);
    document.getElementById('stockGudang').textContent = displayName;
    document.getElementById('stockValue').textContent = `${stok} ${tempSelectedItem.satuan}`;
}

function hideItemResult() {
    document.getElementById('itemResult').classList.add('hidden');
    tempSelectedItem = null;
}

function resetItem() {
    console.log('🔄 Resetting item selection');
    hideItemResult();
    document.getElementById('manualIdInput').value = '';
    document.getElementById('manualIdInput').focus();
}

function resetForm() {
    console.log('🔄 Resetting form');
    resetItem();
    document.getElementById('jumlah').value = '';
    document.getElementById('keterangan').value = '';
    loadDataBarang();
}

// ============================================
// BARCODE SCANNER
// ============================================

function startScanner() {
    const reader = document.getElementById('reader');
    
    if (!reader) {
        console.error('❌ Reader element not found');
        return;
    }
    
    console.log('📸 Starting scanner...');
    
    reader.classList.remove('hidden');
    document.getElementById('manualIdInput').classList.add('hidden');
    
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }
    
    html5QrCode.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        console.error('❌ Scanner error:', err);
        UI.showAlert('❌ Gagal membuka kamera', 'danger');
        stopScanner();
    });
}

function stopScanner() {
    console.log('Stopping scanner');
    
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            console.log('✅ Scanner stopped');
        }).catch(err => {
            console.error('Error stopping scanner:', err);
        });
    }
    
    const reader = document.getElementById('reader');
    if (reader) {
        reader.classList.add('hidden');
    }
    
    const searchInput = document.getElementById('manualIdInput');
    if (searchInput) {
        searchInput.classList.remove('hidden');
    }
}

function onScanSuccess(decodedText, decodedResult) {
    console.log('✅ QR Code scanned:', decodedText);
    
    stopScanner();
    document.getElementById('manualIdInput').value = decodedText;
    searchBarang(decodedText);
}

function onScanFailure(error) {
    // Silent - scanning in progress
}

// ============================================
// HELPER FUNCTIONS - GUDANG MAPPING
// ============================================

// Konversi nilai gudang ke nama display
function getGudangDisplayNameFromValue(gudangValue) {
    return gudangValue === 'Kalipucang' ? 'Gudang Kalipucang' : 'Gudang Troso';
}

// Konversi nilai gudang ke kode API
function getGudangApiCode(gudangValue) {
    return gudangValue === 'Kalipucang' ? 'A' : 'B';
}

// Konversi kode API ke nilai gudang
function getGudangValueFromApiCode(apiCode) {
    return apiCode === 'A' ? 'Kalipucang' : 'Troso';
}

// Konversi kode API ke nama display
function getGudangDisplayNameFromApiCode(apiCode) {
    return apiCode === 'A' ? 'Gudang Kalipucang' : 'Gudang Troso';
}

// ============================================
// GUDANG COLOR HELPER - Auto add color classes
// ============================================

// Function untuk update warna berdasarkan gudang aktif
function updateGudangColors() {
    const activeWarehouse = document.querySelector('.warehouse-btn.active');
    if (!activeWarehouse) return;
    
    const gudang = activeWarehouse.dataset.warehouse; // "Kalipucang" atau "Troso"
    const gudangClass = gudang === 'Kalipucang' ? 'gudang-a' : 'gudang-b';
    
    console.log('🎨 Updating colors for:', gudang);
    
    // Update item card
    const itemCard = document.querySelector('.item-card');
    if (itemCard) {
        itemCard.classList.remove('gudang-a', 'gudang-b');
        itemCard.classList.add(gudangClass);
    }
    
    // Update stock info
    const stockInfo = document.querySelector('.stock-info');
    if (stockInfo) {
        stockInfo.classList.remove('gudang-a', 'gudang-b');
        stockInfo.classList.add(gudangClass);
    }
    
    // Update submit button
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.classList.remove('gudang-a', 'gudang-b');
        submitBtn.classList.add(gudangClass);
    }
    
    // Update atau create gudang indicator
    updateGudangIndicator(gudang);
}

// Function untuk show/update gudang indicator
function updateGudangIndicator(gudang) {
    let indicator = document.getElementById('gudangIndicator');
    
    if (!indicator) {
        // Create indicator
        indicator = document.createElement('div');
        indicator.id = 'gudangIndicator';
        indicator.className = 'gudang-indicator';
        document.body.appendChild(indicator);
    }
    
    // Update class dan text
    const gudangClass = gudang === 'Kalipucang' ? 'gudang-a' : 'gudang-b';
    const displayName = getGudangDisplayNameFromValue(gudang);
    
    indicator.className = 'gudang-indicator active ' + gudangClass;
    indicator.innerHTML = `<i class="fas fa-warehouse"></i> ${displayName}`;
}

// ============================================
// EVENT LISTENERS - Auto update colors
// ============================================

// Tambahkan di setupEventListeners() yang sudah ada
function setupGudangColorListeners() {
    const warehouseBtns = document.querySelectorAll('.warehouse-btn');
    
    warehouseBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active state
            warehouseBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update colors
            updateGudangColors();
            
            // Update stock display (function yang sudah ada)
            if (typeof updateStockDisplay === 'function') {
                updateStockDisplay();
            }
        });
    });
    
    // Initial color update
    updateGudangColors();
}

// ============================================
// INITIALIZE - Panggil saat page load
// ============================================

// Tambahkan di DOMContentLoaded atau initIndexPage()
document.addEventListener('DOMContentLoaded', function() {
    // ... kode yang sudah ada ...
    
    // Setup gudang color listeners
    if (document.getElementById('transaksiForm')) {
        setupGudangColorListeners();
    }
});

// ============================================
// OPTIONAL: Data Page Color Helper
// Untuk halaman data.html
// ============================================

function setupDataPageColors() {
    // Add color to stat cards based on gudang
    const statCards = document.querySelectorAll('.stat-card');
    
    statCards.forEach(card => {
        const label = card.querySelector('.stat-label')?.textContent || '';
        
        if (label.includes('Kalipucang') || label.includes('Stok A')) {
            card.classList.add('gudang-a');
        } else if (label.includes('Troso') || label.includes('Stok B')) {
            card.classList.add('gudang-b');
        }
    });
    
    // Add color to table rows based on stock
    const tableRows = document.querySelectorAll('table tbody tr');
    
    tableRows.forEach(row => {
        const stokACell = row.querySelector('.stok-a');
        const stokBCell = row.querySelector('.stok-b');
        
        if (stokACell) {
            const badge = stokACell.querySelector('.stock-badge');
            if (badge) {
                badge.classList.add('badge-gudang-a');
            }
        }
        
        if (stokBCell) {
            const badge = stokBCell.querySelector('.stock-badge');
            if (badge) {
                badge.classList.add('badge-gudang-b');
            }
        }
    });
}

// Call on data page load
if (window.location.pathname.includes('data.html')) {
    document.addEventListener('DOMContentLoaded', setupDataPageColors);
}

// ============================================
// MOBILE RESPONSIVE FUNCTIONS
// ============================================

// Function untuk update warehouse buttons di mobile
function updateWarehouseButtonsForMobile() {
    const warehouseBtns = document.querySelectorAll('.warehouse-btn');
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        warehouseBtns.forEach(btn => {
            const warehouse = btn.dataset.warehouse;
            const shortName = warehouse === 'Kalipucang' ? 'Kalip.' : 'Troso';
            btn.querySelector('span').textContent = shortName;
        });
    } else {
        warehouseBtns.forEach(btn => {
            const warehouse = btn.dataset.warehouse;
            const fullName = warehouse === 'Kalipucang' ? 'Gudang Kalipucang' : 'Gudang Troso';
            btn.querySelector('span').textContent = fullName;
        });
    }
}

// Listen for window resize
window.addEventListener('resize', updateWarehouseButtonsForMobile);

// Initial call
document.addEventListener('DOMContentLoaded', updateWarehouseButtonsForMobile);

// ============================================
// EXPORT FUNCTIONS (untuk file lain)
// ============================================

// Export fungsi helper gudang untuk digunakan di file lain
window.GudangHelper = {
    getDisplayName: function(gudangValue) {
        return getGudangDisplayNameFromValue(gudangValue);
    },
    
    getApiCode: function(gudangValue) {
        return getGudangApiCode(gudangValue);
    },
    
    getValueFromApiCode: function(apiCode) {
        return getGudangValueFromApiCode(apiCode);
    },
    
    getDisplayNameFromApiCode: function(apiCode) {
        return getGudangDisplayNameFromApiCode(apiCode);
    }
};

// ============================================
// DEBUG FUNCTIONS
// ============================================

// Fungsi untuk debugging mapping gudang
function debugGudangMapping() {
    console.log('=== DEBUG GUDANG MAPPING ===');
    console.log('Kalipucang -> API Code:', getGudangApiCode('Kalipucang'), '(should be A)');
    console.log('Troso -> API Code:', getGudangApiCode('Troso'), '(should be B)');
    console.log('A -> Display:', getGudangDisplayNameFromApiCode('A'), '(should be Gudang Kalipucang)');
    console.log('B -> Display:', getGudangDisplayNameFromApiCode('B'), '(should be Gudang Troso)');
    console.log('===========================');
}

// Panggil debug jika diperlukan
// debugGudangMapping();

// ============================================
// GLOBAL FUNCTIONS
// ============================================

// Fungsi global untuk dipanggil dari HTML inline
window.updateGudangColors = updateGudangColors;
window.updateGudangIndicator = updateGudangIndicator;

// Fungsi untuk mendapatkan gudang aktif saat ini
window.getActiveGudang = function() {
    const activeBtn = document.querySelector('.warehouse-btn.active');
    return activeBtn ? activeBtn.dataset.warehouse : 'Kalipucang';
};

// Fungsi untuk mendapatkan display name gudang aktif
window.getActiveGudangDisplayName = function() {
    const activeGudang = getActiveGudang();
    return getGudangDisplayNameFromValue(activeGudang);
};

// ============================================
// AUTO-RUN FUNCTIONS
// ============================================

// Auto-setup untuk halaman index
if (document.getElementById('transaksiForm')) {
    // Setup initial colors
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            updateGudangColors();
            updateWarehouseButtonsForMobile();
        }, 100);
    });
}