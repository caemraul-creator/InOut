// ============================================
// APP.JS - FIXED VERSION (RESPONSE HANDLER)
// ============================================

let dataMaster = [];
let dataKategori = [];
let html5QrCode = null;
let tempSelectedItem = null;
let pendingTransaction = null;
let searchedQuery = '';

// ============================================
// INITIALIZATION
// ============================================

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
        setupAutoReloadListener();
    }
});

// ============================================
// AUTO RELOAD DATA
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
                UI.showAlert('✅ Data diperbarui', 'success', 1500);
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
// INDEX PAGE INIT
// ============================================

async function initIndexPage() {
    console.log('📄 Initializing index page...');
    
    try {
        const [dataBarang, dataKategoriResult] = await Promise.all([
            loadAllBarang(),
            loadKategori()
        ]);
        
        console.log(`✅ Loaded ${dataBarang.length} items + ${dataKategoriResult.length} categories in parallel`);
        
        if (AUTH && typeof AUTH.autoFillForm === 'function') {
            AUTH.autoFillForm();
        }
        
        Promise.all([
            setupEventListeners(),
            setupConfirmationModal(),
            setupAddItemModal()
        ]).then(() => {
            console.log('✅ All event listeners ready');
        });
        
        initDropdownFix();
        
        console.log('✅ Index page initialized');
        
    } catch (error) {
        console.error('❌ Error initializing:', error);
        UI.showAlert('Error: ' + error.message, 'danger');
    }
}

// ============================================
// DROPDOWN FIX - POSITION & CLICK HANDLING
// ============================================

function initDropdownFix() {
    console.log('🔧 Initializing dropdown fix...');
    
    const oldDropdown = document.getElementById('searchResultsDropdown');
    if (oldDropdown) {
        oldDropdown.remove();
    }
    
    const dropdown = document.createElement('div');
    dropdown.id = 'searchResultsDropdown';
    document.body.appendChild(dropdown);
    console.log('✅ New dropdown created and appended to body');
    
    const updateDropdownPosition = () => {
        const dropdown = document.getElementById('searchResultsDropdown');
        const searchInput = document.getElementById('manualIdInput');
        
        if (!dropdown || !searchInput) return;
        
        const rect = searchInput.getBoundingClientRect();
        
        dropdown.style.setProperty('top', `${rect.bottom + 8}px`, 'important');
        dropdown.style.setProperty('left', `${rect.left}px`, 'important');
        dropdown.style.setProperty('width', `${rect.width}px`, 'important');
    };

    window.displaySearchResults = function(results) {
        const dropdown = document.getElementById('searchResultsDropdown');
        if (!dropdown) return;
        
        updateDropdownPosition();
        
        const activeGudang = getActiveGudang();
        dropdown.innerHTML = '';
        
        results.forEach(item => {
            const stok = activeGudang === 'Kalipucang' ? item.stokA : item.stokB;
            const stokClass = stok > 0 ? 'text-success' : 'text-danger';
            
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `
                <div class="search-item-main">
                    <div class="search-item-id">${item.id}</div>
                    <div class="search-item-name">${item.nama}</div>
                </div>
                <div class="search-item-stock ${stokClass}">
                    Stok: ${stok} ${item.satuan}
                </div>
            `;
            
            div.addEventListener('click', function() {
                selectItem(item);
                hideSearchResults();
            });
            
            div.addEventListener('mousedown', function(e) {
                e.preventDefault();
            });
            
            dropdown.appendChild(div);
        });
        
        dropdown.style.setProperty('display', 'block', 'important');
        
        const firstItem = dropdown.querySelector('.search-result-item');
        if (firstItem) firstItem.classList.add('active');
    };
    
    window.showNoResults = function(query) {
        const dropdown = document.getElementById('searchResultsDropdown');
        if (!dropdown) return;
        
        updateDropdownPosition();
        
        dropdown.innerHTML = `
            <div class="search-no-results">
                <i class="fas fa-search"></i>
                <p>Tidak ada hasil untuk "${query}"</p>
            </div>
        `;
        dropdown.style.setProperty('display', 'block', 'important');
    };
    
    window.hideSearchResults = function() {
        const dropdown = document.getElementById('searchResultsDropdown');
        if (dropdown) {
            dropdown.style.setProperty('display', 'none', 'important');
        }
    };
    
    window.addEventListener('scroll', function() {
        const dropdown = document.getElementById('searchResultsDropdown');
        if (dropdown && dropdown.style.display !== 'none') {
            updateDropdownPosition();
        }
    }, { passive: true });
    
    window.addEventListener('resize', function() {
        const dropdown = document.getElementById('searchResultsDropdown');
        if (dropdown && dropdown.style.display !== 'none') {
            updateDropdownPosition();
        }
    });
    
    console.log('✅ Dropdown fix applied');
}

// ============================================
// DATA LOADING
// ============================================

async function loadAllBarang() {
    try {
        console.log('📡 Loading ALL barang...');
        UI.showLoading();
        
        const data = await API.get('getAllBarang');
        dataMaster = data;
        
        console.log(`✅ ${data.length} items loaded`);
        
        if (dataKategori.length === 0) {
            API.prefetch('getKategoriList');
        }
        
        await UI.hideLoading();
        return data;
        
    } catch (error) {
        console.error('❌ Error loading data:', error);
        await UI.hideLoading();
        UI.showAlert('❌ Gagal memuat data: ' + error.message, 'danger');
        throw error;
    }
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
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    console.log('🔌 Setting up event listeners...');
    
    const searchInput = document.getElementById('manualIdInput');
    if (!searchInput) {
        console.error('❌ Search input not found!');
        return Promise.resolve();
    }
    
    let searchTimeout;
    
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length >= 2) {
            searchTimeout = setTimeout(() => {
                searchBarang(query);
            }, 100);
        } else {
            hideItemResult();
            hideSearchResults();
        }
    });
    
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
    
    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
        scanBtn.addEventListener('click', startScanner);
    }
    
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
    
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.type-btn').forEach(b => 
                b.classList.remove('active')
            );
            this.classList.add('active');
        });
    });
    
    const form = document.getElementById('transaksiForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    
    console.log('✅ Event listeners ready');
    return Promise.resolve();
}

// ============================================
// SEARCH FUNCTION
// ============================================

function searchBarang(query) {
    if (!query || query.length < 2) {
        hideSearchResults();
        return;
    }
    
    searchedQuery = query;
    const searchLower = query.toLowerCase().trim();
    
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
    
    if (results.length === 1 || 
        results[0].id.toLowerCase() === searchLower) {
        selectItem(results[0]);
        hideSearchResults();
        return;
    }
    
    displaySearchResults(results);
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
        
        resultDiv.classList.remove('hidden');
    }
    
    updateStockDisplay(item);
    updateGudangColors();
    
    const jumlahInput = document.getElementById('jumlah');
    if (jumlahInput) {
        setTimeout(() => jumlahInput.focus(), 50);
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
        resultDiv.classList.add('hidden');
    }
    tempSelectedItem = null;
}

function hideSearchResults() {
    const dropdown = document.getElementById('searchResultsDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
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
    // Silent
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
    
    if (transaksiType === 'Keluar') {
        const currentStock = activeGudang === 'Kalipucang' ? 
            tempSelectedItem.stokA : tempSelectedItem.stokB;
        
        if (jumlah > currentStock) {
            UI.showAlert(`❌ Stok tidak cukup! Tersedia: ${currentStock} ${tempSelectedItem.satuan}`, 'danger');
            return;
        }
    }
    
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
    
    document.getElementById('confirmBarang').textContent = data.namaBarang;
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

// ============================================
// SUBMIT TRANSACTION (FIXED LOGIC)
// ============================================

async function submitTransaction() {
    if (!pendingTransaction) return;
    
    try {
        UI.showLoading();
        hideConfirmationModal();
        
        const result = await API.post('submitTransaksi', {
            lokasiGudang: 'Gudang ' + pendingTransaction.gudang,
            jenis: pendingTransaction.jenis,
            tanggal: pendingTransaction.tanggal,
            idBarang: pendingTransaction.idBarang,
            namaBarang: pendingTransaction.namaBarang,
            jumlah: pendingTransaction.jumlah,
            satuan: pendingTransaction.satuan,
            pic: pendingTransaction.user,
            user: pendingTransaction.user,
            petugas: pendingTransaction.user,
            keterangan: pendingTransaction.keterangan || ''
        });
        
        // ============================================
        // DEBUGGING & PERBAIKAN LOGIC
        // ============================================
        console.log('📥 Response dari Server:', result);

        await UI.hideLoading();

        // Validasi sukses secara fleksibel.
        // 1. Jika result.success == true (Format standar)
        // 2. Jika result berisi string "Success" (Format lama/string)
        // 3. Jika result.status === "success"
        const isSuccess = (result && result.success === true) || 
                          (result === "Success") || 
                          (result && result.status === "success");

        // Jika tidak ada error spesifik, anggap sukses (karena data sudah masuk sheet menurut laporan)
        if (isSuccess || (result && !result.error)) {
            UI.showAlert(`✅ ${pendingTransaction.jenis} berhasil dicatat!`, 'success');
            await loadAllBarang();
            resetForm();
            localStorage.setItem('dataBarangChanged', 'true');
        } else {
            // Jika ada properti error di result
            throw new Error(result.error || result.message || 'Gagal menyimpan transaksi (Response tidak sesuai)');
        }
        
    } catch (error) {
        await UI.hideLoading();
        console.error('Submit error:', error);

        // Handle timeout atau network error
        if (error.message.includes('timeout') || error.message.includes('Failed to fetch')) {
            UI.showAlert('⚠️ Response lambat. Cek manual di spreadsheet apakah data sudah masuk.', 'warning', 5000);
            // Coba reload data
            setTimeout(async () => {
                try { await loadAllBarang(); } catch (e) { }
            }, 2000);
        } else {
            UI.showAlert('❌ Gagal: ' + error.message, 'danger');
        }
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
    
    const tanggalInput = document.getElementById('tanggal');
    if (tanggalInput) {
        const today = new Date().toISOString().split('T')[0];
        tanggalInput.value = today;
    }
    
    if (AUTH && typeof AUTH.autoFillForm === 'function') {
        AUTH.autoFillForm();
    }
    
    tempSelectedItem = null;
    pendingTransaction = null;
}

// ============================================
// ADD ITEM MODAL
// ============================================

function setupAddItemModal() {
    const addItemBtn = document.getElementById('addItemBtn');
    const addItemModal = document.getElementById('addItemModal');
    const btnCloseAddModal = document.getElementById('btnCloseAddModal');
    const btnCancelAddItem = document.getElementById('btnCancelAddItem');
    const addItemForm = document.getElementById('addItemForm');
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
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.modal-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const targetContent = document.getElementById(`${tabName}Tab`);
    
    if (targetBtn) targetBtn.classList.add('active');
    if (targetContent) targetContent.classList.add('active');
};

function populateKategoriSelect() {
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
    const kategoriSelect = document.getElementById('newItemKategori');
    const previewDiv = document.getElementById('newItemId');
    
    if (!kategoriSelect || !previewDiv) return;
    
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
}

async function handleAddItem(e) {
    e.preventDefault();
    
    const kategoriInisial = document.getElementById('newItemKategori').value;
    const nama = document.getElementById('newItemNama').value;
    const satuan = document.getElementById('newItemSatuan').value;
    const stokAwal = parseInt(document.getElementById('newItemStok').value) || 0;
    const gudang = document.getElementById('newItemGudang').value;
    
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
// INITIALIZATION
// ============================================

if (document.getElementById('transaksiForm')) {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            updateGudangColors();
            updateWarehouseButtonsForMobile();
        }, 50);
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
    }
};