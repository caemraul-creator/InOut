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
            if (currentIndex >= 0) {
                items[currentIndex].click();
            } else if (items.length > 0) {
                items[0].click();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            hideSearchResults();
        }
    });
    
    // Click outside to close dropdown
    document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('searchResultsDropdown');
        const searchInput = document.getElementById('manualIdInput');
        
        if (dropdown && 
            dropdown.style.display === 'block' &&
            !searchInput.contains(e.target) && 
            !dropdown.contains(e.target)) {
            hideSearchResults();
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
// CONFIRMATION MODAL (DEPRECATED - NOT USED ANYMORE)
// ============================================

function setupConfirmationModal() {
    // Modal konfirmasi sudah tidak digunakan
    // Function ini tetap ada untuk backward compatibility
    console.log('⚠️ Confirmation modal is deprecated, transactions are now direct');
}

function showConfirmation() {
    console.log('📋 Validating and submitting transaction...');
    
    if (!validateForm()) {
        console.log('❌ Form validation failed');
        return;
    }
    
    // Langsung submit tanpa modal konfirmasi
    submitTransactionDirect();
}

function hideConfirmation() {
    // Function ini tetap ada untuk backward compatibility
    // Tapi tidak digunakan lagi
    console.log('Hiding confirmation modal (deprecated)');
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

async function submitTransactionDirect() {
    try {
        console.log('💾 Submitting transaction directly...');
        
        const gudangBtn = document.querySelector('.warehouse-btn.active');
        const gudangValue = gudangBtn.dataset.warehouse; // "Kalipucang" atau "Troso"
        
        const jenis = document.querySelector('.type-btn.active').dataset.type;
        const barangNama = tempSelectedItem ? tempSelectedItem.nama : '-';
        const barangId = tempSelectedItem ? tempSelectedItem.id : '-';
        const jumlah = document.getElementById('jumlah').value;
        const satuan = tempSelectedItem ? tempSelectedItem.satuan : 'Unit';
        const petugas = document.getElementById('user').value;
        const keterangan = document.getElementById('keterangan').value;
        
        // Kirim A/B ke API
        const gudangApi = gudangValue === 'Kalipucang' ? 'A' : 'B';
        
        const transactionData = {
            lokasiGudang: gudangApi,
            jenis: jenis,
            idBarang: barangId,
            namaBarang: barangNama,
            jumlah: jumlah,
            satuan: satuan,
            user: petugas,
            keterangan: keterangan
        };
        
        console.log('Transaction data:', transactionData);
        
        // Show loading
        UI.showLoading();
        
        const result = await API.post('submitTransaksi', transactionData);
        
        console.log('✅ Transaction submitted successfully:', result);
        
        UI.hideLoading();
        
        // Show success message
        const jenisText = jenis === 'Masuk' ? 'masuk' : 'keluar';
        UI.showAlert(`✅ Transaksi ${jenisText} berhasil! ${barangNama} (${jumlah} ${satuan})`, 'success', 2000);
        
        // Reset form langsung tanpa delay
        resetForm();
        
    } catch (error) {
        console.error('❌ Error submitting transaction:', error);
        UI.hideLoading();
        UI.showAlert('❌ Gagal menyimpan transaksi: ' + error.message, 'danger');
    }
}

// Keep old submitTransaction for backward compatibility
async function submitTransaction() {
    // Redirect to direct submit
    await submitTransactionDirect();
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
    
    const queryLower = query.toLowerCase().trim();
    
    // Filter dengan scoring untuk prioritas
    const scoredResults = dataMaster
        .map(item => {
            const idLower = item.id.toLowerCase();
            const namaLower = item.nama.toLowerCase();
            let score = 0;
            
            // EXACT MATCH (highest priority) - Score: 1000
            if (idLower === queryLower || namaLower === queryLower) {
                score = 1000;
            }
            // STARTS WITH (high priority) - Score: 500
            else if (idLower.startsWith(queryLower) || namaLower.startsWith(queryLower)) {
                score = 500;
            }
            // CONTAINS (medium priority) - Score: 100
            else if (idLower.includes(queryLower) || namaLower.includes(queryLower)) {
                score = 100;
            }
            // FUZZY MATCH (low priority) - Score: 10
            else if (fuzzyMatch(queryLower, namaLower) || fuzzyMatch(queryLower, idLower)) {
                score = 10;
            }
            
            return { item, score };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score);
    
    const results = scoredResults.map(r => r.item);
    
    console.log(`Found ${results.length} results (top score: ${scoredResults[0]?.score || 0})`);
    
    if (results.length > 0) {
        // Jika hanya 1 hasil atau hasil pertama exact match, langsung pilih
        if (results.length === 1 || scoredResults[0].score === 1000) {
            selectItem(results[0]);
        } else {
            // Tampilkan dropdown dengan multiple results
            showSearchResults(results, query);
        }
    } else {
        hideItemResult();
        hideSearchResults();
        
        UI.showAlert('❌ Barang tidak ditemukan. Membuka form tambah barang...', 'warning', 2000);
        
        setTimeout(() => {
            openAddItemModal(query);
        }, 500);
    }
}

// Fuzzy matching untuk toleransi typo
function fuzzyMatch(query, target) {
    // Hapus spasi dan karakter khusus
    const cleanQuery = query.replace(/[\s-_]/g, '');
    const cleanTarget = target.replace(/[\s-_]/g, '');
    
    // Cek apakah semua karakter query ada di target (dengan urutan)
    let queryIndex = 0;
    for (let i = 0; i < cleanTarget.length && queryIndex < cleanQuery.length; i++) {
        if (cleanTarget[i] === cleanQuery[queryIndex]) {
            queryIndex++;
        }
    }
    
    return queryIndex === cleanQuery.length;
}

// Tampilkan dropdown hasil pencarian
function showSearchResults(results, query) {
    console.log('📋 Showing search results dropdown');
    
    const searchInput = document.getElementById('manualIdInput');
    const inputRect = searchInput.getBoundingClientRect();
    
    // Buat atau ambil dropdown container
    let dropdown = document.getElementById('searchResultsDropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'searchResultsDropdown';
        dropdown.className = 'search-results-dropdown';
        
        // Append ke body, bukan ke parent input
        document.body.appendChild(dropdown);
    }
    
    // Position dropdown di bawah input dengan fixed positioning
    dropdown.style.position = 'fixed';
    dropdown.style.top = (inputRect.bottom + 8) + 'px';
    dropdown.style.left = inputRect.left + 'px';
    dropdown.style.width = inputRect.width + 'px';
    
    // Batasi hasil maksimal 5
    const maxResults = 5;
    const displayResults = results.slice(0, maxResults);
    
    let html = '';
    displayResults.forEach((item, index) => {
        const highlightedName = highlightMatch(item.nama, query);
        const highlightedId = highlightMatch(item.id, query);
        
        html += `
            <div class="search-result-item" onclick="window.selectItemFromDropdown(${index})" data-index="${index}">
                <div class="result-name">${highlightedName}</div>
                <div class="result-details">
                    <span class="result-id">ID: ${highlightedId}</span>
                    <span class="result-stock">Stok A: ${item.stokA} | B: ${item.stokB}</span>
                </div>
            </div>
        `;
    });
    
    if (results.length > maxResults) {
        html += `
            <div class="search-result-more">
                +${results.length - maxResults} hasil lainnya...
            </div>
        `;
    }
    
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
    
    // Store results untuk dipilih
    window.searchResultsCache = displayResults;
    
    // Update posisi saat scroll atau resize
    const updatePosition = () => {
        const newRect = searchInput.getBoundingClientRect();
        dropdown.style.top = (newRect.bottom + 8) + 'px';
        dropdown.style.left = newRect.left + 'px';
        dropdown.style.width = newRect.width + 'px';
    };
    
    // Add scroll listener
    window.removeEventListener('scroll', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    // Add resize listener
    window.removeEventListener('resize', updatePosition);
    window.addEventListener('resize', updatePosition);
}

// Highlight matching text
function highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// Pilih item dari dropdown
window.selectItemFromDropdown = function(index) {
    if (window.searchResultsCache && window.searchResultsCache[index]) {
        selectItem(window.searchResultsCache[index]);
        hideSearchResults();
    }
};

// Sembunyikan dropdown hasil pencarian
function hideSearchResults() {
    const dropdown = document.getElementById('searchResultsDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
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

// ============================================
// MOBILE KEYBOARD HANDLER
// ============================================ 

function setupMobileKeyboardHandler() {
    if (!('ontouchstart' in window)) return; // Hanya untuk touch devices
    
    console.log('📱 Setting up mobile keyboard handler');
    
    const inputs = document.querySelectorAll('input, textarea, select');
    let activeInput = null;
    let keyboardHeight = 0;
    
    // Detect keyboard show/hide
    function checkKeyboard() {
        const viewportHeight = window.innerHeight;
        const documentHeight = document.documentElement.clientHeight;
        
        // Jika keyboard muncul, height berubah
        if (documentHeight > viewportHeight) {
            keyboardHeight = documentHeight - viewportHeight;
            document.body.classList.add('keyboard-open');
            
            // Scroll ke input yang aktif
            if (activeInput) {
                setTimeout(() => {
                    activeInput.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }, 100);
            }
        } else {
            document.body.classList.remove('keyboard-open');
            keyboardHeight = 0;
        }
    }
    
    // Track active input
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            activeInput = this;
            document.body.classList.add('input-focused');
            
            // Untuk Android, beri delay
            setTimeout(checkKeyboard, 300);
        });
        
        input.addEventListener('blur', function() {
            activeInput = null;
            document.body.classList.remove('input-focused');
            
            // Delay untuk memastikan keyboard benar-benar tertutup
            setTimeout(checkKeyboard, 500);
        });
    });
    
    // Listen untuk resize (keyboard show/hide memicu resize di mobile)
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(checkKeyboard, 100);
    });
    
    // Initial check
    setTimeout(checkKeyboard, 1000);
}

// Panggil saat page load
if (document.getElementById('transaksiForm')) {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(setupMobileKeyboardHandler, 500);
    });
}