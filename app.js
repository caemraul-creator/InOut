// ============================================
// APP.JS - ULTRA-FAST VERSION (FIXED)
// ⚡ Optimizations:
// - Parallel data loading
// - Faster search debounce
// - Reduced timeouts
// - Lazy initialization
// ✅ FIXED: ID element mismatch
// ✅ ADDED: Search functionality in Add Item modal
// ============================================

let dataMaster = [];
let dataKategori = [];
let html5QrCode = null;
let tempSelectedItem = null;
let pendingTransaction = null;
let searchedQuery = '';

// ⚡ Initialize - with faster startup
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 App initializing (ULTRA-FAST)...');
    
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
        setupAutoReloadListener();
    }
});

// ============================================
// AUTO RELOAD DATA - OPTIMIZED
// ============================================

function setupAutoReloadListener() {
    console.log('🔄 Setting up auto-reload listener...');
    
    const handleReload = async function() {
        const dataChanged = localStorage.getItem('dataBarangChanged');
        
        if (dataChanged === 'true') {
            console.log('🔄 Data changed detected, reloading...');
            localStorage.removeItem('dataBarangChanged');
            
            if (typeof API !== 'undefined' && API.clearCache) {
                API.clearCache();
            }
            
            try {
                await loadAllBarang();
                UI.showAlert('✅ Data diperbarui', 'success', 1500); // ⚡ Shorter alert
            } catch (error) {
                console.error('Error reloading data:', error);
            }
        }
    };
    
    window.addEventListener('focus', handleReload);
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) handleReload();
    });
    
    console.log('✅ Auto-reload set up');
}

// ============================================
// INDEX PAGE - PARALLEL LOADING
// ============================================

async function initIndexPage() {
    console.log('📄 Initializing index page (ULTRA-FAST)...');
    
    try {
        // ⚡ PARALLEL LOADING - load data barang dan kategori bersamaan
        const [dataBarang, dataKategori] = await Promise.all([
            loadAllBarang(),
            loadKategori()
        ]);
        
        console.log(`✅ Loaded ${dataBarang.length} items + ${dataKategori.length} categories in parallel`);
        
        // ⚡ Auth auto-fill (non-blocking)
        if (AUTH && typeof AUTH.autoFillForm === 'function') {
            AUTH.autoFillForm();
        }
        
        // ⚡ Setup listeners dan modals (parallel)
        Promise.all([
            setupEventListeners(),
            setupConfirmationModal(),
            setupAddItemModal()
        ]).then(() => {
            console.log('✅ All event listeners ready');
        });
        
        console.log('✅ Index page initialized');
        
    } catch (error) {
        console.error('❌ Error initializing:', error);
        UI.showAlert('Error: ' + error.message, 'danger');
    }
}

// ============================================
// DATA LOADING - PARALLEL & CACHED
// ============================================

async function loadAllBarang() {
    try {
        console.log('📡 Loading ALL barang...');
        UI.showLoading();
        
        const data = await API.get('getAllBarang');
        dataMaster = data;
        
        console.log(`✅ ${data.length} items loaded`);
        
        // ⚡ Background prefetch kategori jika belum ada
        if (dataKategori.length === 0) {
            API.prefetch('getKategoriList');
        }
        
        await UI.hideLoading(); // ⚡ Await untuk smooth transition
        return data;
        
    } catch (error) {
        console.error('❌ Error loading data:', error);
        await UI.hideLoading();
        UI.showAlert('❌ Gagal memuat data: ' + error.message, 'danger');
        throw error;
    }
}

async function loadDataBarang() {
    return loadAllBarang();
}

async function loadKategori() {
    try {
        console.log('📡 Loading kategori...');
        
        const data = await API.get('getKategoriList');
        dataKategori = data;
        
        console.log(`✅ ${data.length} categories loaded`);
        return data;
        
    } catch (error) {
        console.error('❌ Error loading kategori:', error);
        dataKategori = [
            { nama: 'Umum', inisial: 'UMM' },
            { nama: 'Elektronik', inisial: 'ELEC' },
            { nama: 'Elektrik', inisial: 'ELK' },
            { nama: 'Tools', inisial: 'TOOL' }
        ];
        return dataKategori;
    }
}

// ============================================
// EVENT LISTENERS - OPTIMIZED SEARCH
// ============================================

function setupEventListeners() {
    console.log('🔌 Setting up event listeners...');
    
    const searchInput = document.getElementById('manualIdInput');
    if (!searchInput) {
        console.error('❌ Search input not found!');
        return Promise.resolve();
    }
    
    let searchTimeout;
    
    // ⚡ FASTER SEARCH - 100ms debounce (dari 150ms)
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length >= 2) {
            searchTimeout = setTimeout(() => {
                searchBarang(query);
            }, 100); // ⚡ Faster debounce
        } else {
            hideItemResult();
            hideSearchResults();
        }
    });
    
    // Keyboard navigation untuk dropdown
    searchInput.addEventListener('keydown', function(e) {
        const dropdown = document.getElementById('searchResultsDropdown');
        if (!dropdown || dropdown.style.display === 'none') return;
        
        const items = dropdown.querySelectorAll('.search-result-item');
        if (items.length === 0) return;
        
        let currentIndex = -1;
        items.forEach((item, index) => {
            if (item.classList.contains('active')) {
                currentIndex = index;
            }
        });
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            items.forEach(item => item.classList.remove('active'));
            const nextIndex = (currentIndex + 1) % items.length;
            items[nextIndex].classList.add('active');
            items[nextIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            items.forEach(item => item.classList.remove('active'));
            const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
            items[prevIndex].classList.add('active');
            items[prevIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const activeItem = dropdown.querySelector('.search-result-item.active');
            if (activeItem) {
                activeItem.click();
            } else if (items.length > 0) {
                items[0].click();
            }
        } else if (e.key === 'Escape') {
            hideSearchResults();
        }
    });
    
    // Scanner button
    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
        scanBtn.addEventListener('click', startScanner);
    }
    
    // Warehouse buttons
    document.querySelectorAll('.warehouse-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.warehouse-btn').forEach(b => 
                b.classList.remove('active')
            );
            this.classList.add('active');
            
            updateGudangColors();
            
            if (tempSelectedItem) {
                updateStockDisplay(tempSelectedItem);
            }
        });
    });
    
    // Transaction type buttons
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.type-btn').forEach(b => 
                b.classList.remove('active')
            );
            this.classList.add('active');
        });
    });
    
    // Form submit
    const form = document.getElementById('transaksiForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    
    console.log('✅ Event listeners ready');
    return Promise.resolve();
}

// ============================================
// SEARCH FUNCTION - OPTIMIZED
// ============================================

function searchBarang(query) {
    if (!query || query.length < 2) {
        hideSearchResults();
        return;
    }
    
    searchedQuery = query;
    const searchLower = query.toLowerCase().trim();
    
    // ⚡ Optimized search with early exit
    const results = [];
    for (let i = 0; i < dataMaster.length && results.length < 10; i++) {
        const item = dataMaster[i];
        const idMatch = item.id.toLowerCase().includes(searchLower);
        const nameMatch = item.nama.toLowerCase().includes(searchLower);
        
        if (idMatch || nameMatch) {
            results.push(item);
        }
    }
    
    console.log(`🔍 Search "${query}": ${results.length} results`);
    
    if (results.length === 0) {
        showNoResults(query);
        return;
    }
    
    // Exact match - auto select
    if (results.length === 1 || 
        results[0].id.toLowerCase() === searchLower) {
        selectItem(results[0]);
        hideSearchResults();
        return;
    }
    
    displaySearchResults(results);
}

function displaySearchResults(results) {
    const dropdown = document.getElementById('searchResultsDropdown');
    if (!dropdown) return;
    
    // ⚡ Use innerHTML for faster rendering
    const html = results.map(item => {
        const activeGudang = getActiveGudang();
        const stok = activeGudang === 'Kalipucang' ? item.stokA : item.stokB;
        const stokClass = stok > 0 ? 'text-success' : 'text-danger';
        
        return `
            <div class="search-result-item" onclick="selectItemById('${item.id}')">
                <div class="search-item-main">
                    <div class="search-item-id">${item.id}</div>
                    <div class="search-item-name">${item.nama}</div>
                </div>
                <div class="search-item-stock ${stokClass}">
                    Stok: ${stok} ${item.satuan}
                </div>
            </div>
        `;
    }).join('');
    
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
    
    // Auto-select first item
    const firstItem = dropdown.querySelector('.search-result-item');
    if (firstItem) {
        firstItem.classList.add('active');
    }
}

function showNoResults(query) {
    const dropdown = document.getElementById('searchResultsDropdown');
    if (!dropdown) return;
    
    dropdown.innerHTML = `
        <div class="search-no-results">
            <div class="text-muted">
                <i class="fas fa-search"></i>
                <p>Tidak ada hasil untuk "${query}"</p>
            </div>
        </div>
    `;
    dropdown.style.display = 'block';
}

function hideSearchResults() {
    const dropdown = document.getElementById('searchResultsDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

// ============================================
// ITEM SELECTION
// ============================================

window.selectItemById = function(id) {
    const item = dataMaster.find(i => i.id === id);
    if (item) {
        selectItem(item);
        hideSearchResults();
    }
};

function selectItem(item) {
    console.log('✅ Selected:', item.id, item.nama);
    
    tempSelectedItem = item;
    
    // ⚡ Fast DOM updates
    const resultDiv = document.getElementById('itemResult');
    if (resultDiv) {
        resultDiv.innerHTML = `
            <div class="item-card">
                <div class="item-card-header">
                    <h5>${item.nama}</h5>
                    <span class="item-id">${item.id}</span>
                </div>
                <div class="item-card-body">
                    <div class="item-info">
                        <span class="label">Kategori:</span>
                        <span class="value">${item.kategori}</span>
                    </div>
                    <div class="item-info">
                        <span class="label">Satuan:</span>
                        <span class="value">${item.satuan}</span>
                    </div>
                    <div id="stockDisplay" class="stock-info"></div>
                </div>
            </div>
        `;
        resultDiv.style.display = 'block';
    }
    
    updateStockDisplay(item);
    updateGudangColors();
    
    // Auto-focus jumlah input
    const jumlahInput = document.getElementById('jumlah');
    if (jumlahInput) {
        setTimeout(() => jumlahInput.focus(), 50); // ⚡ Reduced timeout
    }
}

function updateStockDisplay(item) {
    const stockDiv = document.getElementById('stockDisplay');
    if (!stockDiv) return;
    
    const activeGudang = getActiveGudang();
    const stok = activeGudang === 'Kalipucang' ? item.stokA : item.stokB;
    const stokClass = stok > 0 ? 'text-success' : 'text-danger';
    const gudangDisplay = activeGudang === 'Kalipucang' ? 'Gudang Kalipucang' : 'Gudang Troso';
    
    stockDiv.innerHTML = `
        <div class="stock-label">Stok ${gudangDisplay}:</div>
        <div class="stock-value ${stokClass}">${stok} ${item.satuan}</div>
    `;
}

function hideItemResult() {
    const resultDiv = document.getElementById('itemResult');
    if (resultDiv) {
        resultDiv.style.display = 'none';
    }
    tempSelectedItem = null;
}

// ============================================
// SCANNER FUNCTIONS
// ============================================

function startScanner() {
    console.log('📷 Starting scanner...');
    
    const modal = document.getElementById('scannerModal');
    const reader = document.getElementById('reader');
    
    if (!modal || !reader) return;
    
    modal.style.display = 'flex';
    
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }
    
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        onScanSuccess,
        onScanError
    ).catch(err => {
        console.error('Scanner error:', err);
        UI.showAlert('❌ Tidak dapat mengakses kamera', 'danger');
        stopScanner();
    });
}

function onScanSuccess(decodedText) {
    console.log('✅ QR Code scanned:', decodedText);
    
    stopScanner();
    
    const searchInput = document.getElementById('manualIdInput');
    if (searchInput) {
        searchInput.value = decodedText;
        searchBarang(decodedText);
    }
}

function onScanError(error) {
    // Silent - normal scanning errors
}

function stopScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            console.log('Scanner stopped');
        }).catch(err => {
            console.error('Error stopping scanner:', err);
        });
    }
    
    const modal = document.getElementById('scannerModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close scanner modal
document.addEventListener('DOMContentLoaded', function() {
    const closeScannerBtn = document.getElementById('closeScannerBtn');
    if (closeScannerBtn) {
        closeScannerBtn.addEventListener('click', stopScanner);
    }
});

// ============================================
// FORM SUBMIT
// ============================================

async function handleSubmit(e) {
    e.preventDefault();
    
    if (!tempSelectedItem) {
        UI.showAlert('❌ Pilih barang terlebih dahulu', 'danger');
        return;
    }
    
    const activeGudang = getActiveGudang();
    const activeType = document.querySelector('.type-btn.active');
    const jumlah = parseInt(document.getElementById('jumlah').value);
    const keterangan = document.getElementById('keterangan').value.trim();
    const tanggal = document.getElementById('tanggal').value;
    const user = document.getElementById('user').value.trim();
    
    if (!activeType) {
        UI.showAlert('❌ Pilih jenis transaksi', 'danger');
        return;
    }
    
    if (!jumlah || jumlah <= 0) {
        UI.showAlert('❌ Masukkan jumlah yang valid', 'danger');
        return;
    }
    
    if (!user) {
        UI.showAlert('❌ Nama petugas harus diisi', 'danger');
        return;
    }
    
    const transaksiType = activeType.dataset.type;
    
    // Validation for Keluar
    if (transaksiType === 'Keluar') {
        const currentStock = activeGudang === 'Kalipucang' ? 
            tempSelectedItem.stokA : tempSelectedItem.stokB;
        
        if (jumlah > currentStock) {
            UI.showAlert(`❌ Stok tidak cukup! Tersedia: ${currentStock} ${tempSelectedItem.satuan}`, 'danger');
            return;
        }
    }
    
    // Store pending transaction
    pendingTransaction = {
        idBarang: tempSelectedItem.id,
        namaBarang: tempSelectedItem.nama,
        kategori: tempSelectedItem.kategori,
        satuan: tempSelectedItem.satuan,
        jenis: transaksiType,
        jumlah: jumlah,
        gudang: getGudangApiCode(activeGudang),
        gudangDisplay: getGudangDisplayNameFromValue(activeGudang),
        keterangan: keterangan,
        tanggal: tanggal,
        user: user
    };
    
    // Show confirmation modal
    showConfirmationModal(pendingTransaction);
}

// ============================================
// CONFIRMATION MODAL
// ============================================

function setupConfirmationModal() {
    const btnCancel = document.getElementById('btnCancelConfirm');
    const btnOk = document.getElementById('btnOkConfirm');
    
    if (btnCancel) {
        btnCancel.onclick = hideConfirmationModal;
    }
    
    if (btnOk) {
        btnOk.onclick = submitTransaction;
    }
    
    return Promise.resolve();
}

function showConfirmationModal(data) {
    const modal = document.getElementById('confirmModal');
    if (!modal) return;
    
    // Populate data
    document.getElementById('confirmNama').textContent = data.namaBarang;
    document.getElementById('confirmId').textContent = data.idBarang;
    document.getElementById('confirmJenis').textContent = data.jenis;
    document.getElementById('confirmGudang').textContent = data.gudangDisplay;
    document.getElementById('confirmJumlah').textContent = `${data.jumlah} ${data.satuan}`;
    document.getElementById('confirmPetugas').textContent = data.user;
    
    const ketRow = document.getElementById('confirmKetRow');
    const ketValue = document.getElementById('confirmKeterangan');
    if (data.keterangan) {
        ketValue.textContent = data.keterangan;
        ketRow.style.display = 'flex';
    } else {
        ketRow.style.display = 'none';
    }
    
    modal.style.display = 'flex';
}

function hideConfirmationModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function submitTransaction() {
    if (!pendingTransaction) return;
    
    try {
        UI.showLoading();
        hideConfirmationModal();
        
        const result = await API.post('addTransaksi', pendingTransaction);
        
        await UI.hideLoading();
        
        if (result.success) {
            UI.showAlert(`✅ ${pendingTransaction.jenis} berhasil dicatat!`, 'success');
            
            // Reload data
            await loadAllBarang();
            
            // Reset form
            resetForm();
            
            localStorage.setItem('dataBarangChanged', 'true');
        } else {
            throw new Error(result.error || 'Gagal menyimpan transaksi');
        }
        
    } catch (error) {
        await UI.hideLoading();
        console.error('Submit error:', error);
        UI.showAlert('❌ Gagal: ' + error.message, 'danger');
    }
}

function resetForm() {
    const form = document.getElementById('transaksiForm');
    if (form) {
        form.reset();
    }
    
    hideItemResult();
    hideSearchResults();
    
    const searchInput = document.getElementById('manualIdInput');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    
    // Reset to today's date
    const tanggalInput = document.getElementById('tanggal');
    if (tanggalInput) {
        const today = new Date().toISOString().split('T')[0];
        tanggalInput.value = today;
    }
    
    // Re-apply auto-fill
    if (AUTH && typeof AUTH.autoFillForm === 'function') {
        AUTH.autoFillForm();
    }
    
    tempSelectedItem = null;
    pendingTransaction = null;
}

// ============================================
// ADD ITEM MODAL - ✅ FIXED ID ELEMENTS
// ============================================

function setupAddItemModal() {
    const addItemBtn = document.getElementById('addItemBtn');
    const addItemModal = document.getElementById('addItemModal');
    const btnCloseAddModal = document.getElementById('btnCloseAddModal');
    const btnCancelAddItem = document.getElementById('btnCancelAddItem');
    const addItemForm = document.getElementById('addItemForm');
    
    // ✅ FIXED: Use correct ID from HTML
    const kategoriSelect = document.getElementById('newItemKategori');
    
    if (addItemBtn) {
        addItemBtn.onclick = function() {
            if (addItemModal) addItemModal.style.display = 'flex';
            populateKategoriSelect();
            updateNewIdPreview();
        };
    }
    
    if (btnCloseAddModal) {
        btnCloseAddModal.onclick = function() {
            if (addItemModal) addItemModal.style.display = 'none';
        };
    }
    
    if (btnCancelAddItem) {
        btnCancelAddItem.onclick = function() {
            if (addItemModal) addItemModal.style.display = 'none';
        };
    }
    
    if (kategoriSelect) {
        kategoriSelect.addEventListener('change', updateNewIdPreview);
    }
    
    if (addItemForm) {
        addItemForm.addEventListener('submit', handleAddItem);
    }
    
    // Setup modal tabs
    setupModalTabs();
    
    return Promise.resolve();
}

function setupModalTabs() {
    const tabBtns = document.querySelectorAll('.modal-tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            switchTab(targetTab);
        });
    });
}

window.switchTab = function(tabName) {
    // Remove active from all tabs
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.modal-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Add active to target
    const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const targetContent = document.getElementById(`${tabName}Tab`);
    
    if (targetBtn) targetBtn.classList.add('active');
    if (targetContent) targetContent.classList.add('active');
};

function populateKategoriSelect() {
    // ✅ FIXED: Use correct ID from HTML
    const select = document.getElementById('newItemKategori');
    if (!select) {
        console.error('❌ newItemKategori select not found!');
        return;
    }
    
    select.innerHTML = '<option value="">-- Pilih Kategori --</option>';
    
    dataKategori.forEach(kat => {
        const option = document.createElement('option');
        option.value = kat.inisial;
        option.textContent = `${kat.nama} (${kat.inisial})`;
        select.appendChild(option);
    });
    
    console.log(`✅ Populated ${dataKategori.length} categories`);
}

function updateNewIdPreview() {
    // ✅ FIXED: Use correct ID from HTML
    const kategoriSelect = document.getElementById('newItemKategori');
    const previewDiv = document.getElementById('newItemId');
    
    if (!kategoriSelect || !previewDiv) {
        console.error('❌ Elements not found:', {
            kategoriSelect: !!kategoriSelect,
            previewDiv: !!previewDiv
        });
        return;
    }
    
    const selectedKat = kategoriSelect.value;
    
    if (!selectedKat) {
        previewDiv.value = '';
        previewDiv.placeholder = 'Pilih kategori terlebih dahulu';
        return;
    }
    
    const itemsInKat = dataMaster.filter(item => 
        item.id.startsWith(selectedKat + '-')
    );
    
    const nextNumber = itemsInKat.length + 1;
    const newId = `${selectedKat}-${String(nextNumber).padStart(3, '0')}`;
    
    previewDiv.value = newId;
    previewDiv.placeholder = '';
    
    console.log(`✅ Generated new ID: ${newId}`);
}

async function handleAddItem(e) {
    e.preventDefault();
    
    // ✅ FIXED: Use correct IDs from HTML
    const kategoriInisial = document.getElementById('newItemKategori').value;
    const nama = document.getElementById('newItemNama').value;
    const satuan = document.getElementById('newItemSatuan').value;
    const stokAwal = parseInt(document.getElementById('newItemStok').value) || 0;
    const gudang = document.getElementById('newItemGudang').value;
    
    console.log('📝 Form values:', {
        kategoriInisial,
        nama,
        satuan,
        stokAwal,
        gudang
    });
    
    if (!kategoriInisial || !nama || !satuan || !gudang) {
        UI.showAlert('❌ Lengkapi semua field', 'danger');
        return;
    }
    
    const itemsInKat = dataMaster.filter(item => 
        item.id.startsWith(kategoriInisial + '-')
    );
    const nextNumber = itemsInKat.length + 1;
    const newId = `${kategoriInisial}-${String(nextNumber).padStart(3, '0')}`;
    
    try {
        UI.showLoading();
        
        const result = await API.post('addBarang', {
            idBarang: newId,
            nama: nama,
            kategori: dataKategori.find(k => k.inisial === kategoriInisial)?.nama || kategoriInisial,
            satuan: satuan,
            stokAwal: stokAwal,
            gudang: gudang,
            user: AUTH.getUserName() || 'System'
        });
        
        await UI.hideLoading();
        
        if (result.success) {
            UI.showAlert('✅ Barang berhasil ditambahkan!', 'success');
            
            const modal = document.getElementById('addItemModal');
            if (modal) modal.style.display = 'none';
            
            document.getElementById('addItemForm').reset();
            
            await loadAllBarang();
            
            localStorage.setItem('dataBarangChanged', 'true');
        } else {
            throw new Error(result.error || 'Gagal menambahkan barang');
        }
        
    } catch (error) {
        await UI.hideLoading();
        console.error('Add item error:', error);
        UI.showAlert('❌ Gagal: ' + error.message, 'danger');
    }
}

// ============================================
// GUDANG HELPERS
// ============================================

function getActiveGudang() {
    const activeBtn = document.querySelector('.warehouse-btn.active');
    return activeBtn ? activeBtn.dataset.warehouse : 'Kalipucang';
}

function getGudangDisplayNameFromValue(gudangValue) {
    return gudangValue === 'Kalipucang' ? 'Gudang Kalipucang' : 'Gudang Troso';
}

function getGudangApiCode(gudangValue) {
    return gudangValue === 'Kalipucang' ? 'A' : 'B';
}

function updateGudangColors() {
    const activeWarehouse = document.querySelector('.warehouse-btn.active');
    if (!activeWarehouse) return;
    
    const gudang = activeWarehouse.dataset.warehouse;
    const gudangClass = gudang === 'Kalipucang' ? 'gudang-a' : 'gudang-b';
    
    const itemCard = document.querySelector('.item-card');
    if (itemCard) {
        itemCard.classList.remove('gudang-a', 'gudang-b');
        itemCard.classList.add(gudangClass);
    }
    
    const stockInfo = document.querySelector('.stock-info');
    if (stockInfo) {
        stockInfo.classList.remove('gudang-a', 'gudang-b');
        stockInfo.classList.add(gudangClass);
    }
    
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.classList.remove('gudang-a', 'gudang-b');
        submitBtn.classList.add(gudangClass);
    }
}

// ============================================
// MOBILE RESPONSIVE
// ============================================

function updateWarehouseButtonsForMobile() {
    const warehouseBtns = document.querySelectorAll('.warehouse-btn');
    const isMobile = window.innerWidth <= 768;
    
    warehouseBtns.forEach(btn => {
        const warehouse = btn.dataset.warehouse;
        const text = isMobile ? 
            (warehouse === 'Kalipucang' ? 'Kalip.' : 'Troso') :
            (warehouse === 'Kalipucang' ? 'Gudang Kalipucang' : 'Gudang Troso');
        btn.querySelector('span').textContent = text;
    });
}

window.addEventListener('resize', updateWarehouseButtonsForMobile);

// ============================================
// MOBILE KEYBOARD HANDLER
// ============================================

function setupMobileKeyboardHandler() {
    if (!('ontouchstart' in window)) return;
    
    console.log('📱 Mobile keyboard handler');
    
    const inputs = document.querySelectorAll('input, textarea, select');
    let activeInput = null;
    
    function checkKeyboard() {
        const viewportHeight = window.innerHeight;
        const documentHeight = document.documentElement.clientHeight;
        
        if (documentHeight > viewportHeight) {
            document.body.classList.add('keyboard-open');
            
            if (activeInput) {
                setTimeout(() => {
                    activeInput.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }, 50); // ⚡ Reduced delay
            }
        } else {
            document.body.classList.remove('keyboard-open');
        }
    }
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            activeInput = this;
            document.body.classList.add('input-focused');
            setTimeout(checkKeyboard, 200); // ⚡ Reduced delay
        });
        
        input.addEventListener('blur', function() {
            activeInput = null;
            document.body.classList.remove('input-focused');
            setTimeout(checkKeyboard, 300); // ⚡ Reduced delay
        });
    });
    
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(checkKeyboard, 50); // ⚡ Faster check
    });
}

// ============================================
// INITIALIZATION
// ============================================

if (document.getElementById('transaksiForm')) {
    document.addEventListener('DOMContentLoaded', function() {
        // ⚡ Reduced all delays
        setTimeout(() => {
            updateGudangColors();
            updateWarehouseButtonsForMobile();
        }, 50);
        
        setTimeout(setupMobileKeyboardHandler, 200);
    });
}

// ============================================
// GLOBAL FUNCTIONS
// ============================================

window.updateGudangColors = updateGudangColors;
window.getActiveGudang = getActiveGudang;
window.getActiveGudangDisplayName = function() {
    return getGudangDisplayNameFromValue(getActiveGudang());
};

// ============================================
// DEBUG
// ============================================

window.debugApp = {
    reloadData: async function() {
        console.log('🔄 Manual reload...');
        await loadAllBarang();
        console.log('✅ Reloaded');
    },
    
    checkELK: function() {
        const elkItems = dataMaster.filter(item => item.id.startsWith('ELK-'));
        console.log(`ELK items: ${elkItems.length}`);
        console.log('ELK IDs:', elkItems.map(item => item.id));
        return elkItems;
    },
    
    findID: function(id) {
        const item = dataMaster.find(item => item.id === id);
        console.log(`ID: ${id}`, item);
        return item;
    },
    
    clearCache: function() {
        if (typeof API !== 'undefined' && API.clearCache) {
            API.clearCache();
            console.log('✅ Cache cleared');
        }
    },
    
    testModal: function() {
        console.log('🧪 Testing modal elements...');
        const elements = {
            'newItemKategori': document.getElementById('newItemKategori'),
            'newItemNama': document.getElementById('newItemNama'),
            'newItemSatuan': document.getElementById('newItemSatuan'),
            'newItemStok': document.getElementById('newItemStok'),
            'newItemGudang': document.getElementById('newItemGudang'),
            'newItemId': document.getElementById('newItemId')
        };
        
        Object.keys(elements).forEach(key => {
            console.log(`${key}:`, elements[key] ? '✅ Found' : '❌ Not found');
        });
        
        return elements;
    }
};