// ============================================
// APP.JS - FINAL VERSION (MODIFIED)
// Support Gudang Kalipucang & Gudang Troso
// PERBAIKAN: Menggunakan getAllBarang untuk data lengkap
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
        setupAutoReloadListener();
    }
});

// ============================================
// AUTO RELOAD DATA KETIKA ADA PERUBAHAN
// ============================================

function setupAutoReloadListener() {
    console.log('🔄 Setting up auto-reload listener...');
    
    window.addEventListener('focus', async function() {
        console.log('👀 Page got focus, checking for data changes...');
        
        const dataChanged = localStorage.getItem('dataBarangChanged');
        
        if (dataChanged === 'true') {
            console.log('🔄 Data changed detected, reloading data barang...');
            
            localStorage.removeItem('dataBarangChanged');
            
            if (typeof API !== 'undefined' && API.clearCache) {
                API.clearCache();
            }
            
            try {
                await loadAllBarang(); // ✅ PERBAIKAN: Gunakan loadAllBarang
                UI.showAlert('✅ Data barang telah diperbarui', 'success', 2000);
            } catch (error) {
                console.error('Error reloading data:', error);
            }
        }
    });
    
    document.addEventListener('visibilitychange', async function() {
        if (!document.hidden) {
            const dataChanged = localStorage.getItem('dataBarangChanged');
            
            if (dataChanged === 'true') {
                console.log('🔄 Data changed detected (visibility), reloading...');
                localStorage.removeItem('dataBarangChanged');
                
                if (typeof API !== 'undefined' && API.clearCache) {
                    API.clearCache();
                }
                
                try {
                    await loadAllBarang(); // ✅ PERBAIKAN: Gunakan loadAllBarang
                    UI.showAlert('✅ Data barang telah diperbarui', 'success', 2000);
                } catch (error) {
                    console.error('Error reloading data:', error);
                }
            }
        }
    });
    
    console.log('✅ Auto-reload listener set up');
}

// ============================================
// INDEX PAGE
// ============================================

async function initIndexPage() {
    console.log('📄 Initializing index page...');
    
    try {
        // ✅ PERBAIKAN: Gunakan loadAllBarang untuk ambil SEMUA barang
        await loadAllBarang();
        await loadKategori();
        
        if (AUTH && typeof AUTH.autoFillForm === 'function') {
            AUTH.autoFillForm();
        }
        
        setupEventListeners();
        setupConfirmationModal();
        setupAddItemModal();
        
        console.log('✅ Index page initialized successfully');
        console.log(`📊 Total items loaded: ${dataMaster.length}`);
        
        // Debug: cek kategori ELK
        const elkItems = dataMaster.filter(item => item.id.startsWith('ELK-'));
        if (elkItems.length > 0) {
            console.log(`📊 Kategori ELK: ${elkItems.length} items`);
            console.log('📋 ID ELK yang ada:', elkItems.map(item => item.id).slice(0, 10));
        }
        
    } catch (error) {
        console.error('❌ Error initializing index page:', error);
        UI.showAlert('Error initializing app: ' + error.message, 'danger');
    }
}

// ============================================
// DATA LOADING - PERBAIKAN: AMBIL SEMUA BARANG
// ============================================

// Fungsi untuk load SEMUA barang (untuk index page)
async function loadAllBarang() {
    try {
        console.log('📡 Loading ALL barang (including zero stock)...');
        UI.showLoading();
        
        // ✅ PERBAIKAN: Gunakan getAllBarang untuk ambil SEMUA data
        const data = await API.get('getAllBarang');
        
        // Simpan SEMUA data ke dataMaster
        dataMaster = data;
        
        console.log(`✅ Loaded ALL ${data.length} items (including zero stock)`);
        
        // Debug info
        const withStock = data.filter(item => {
            const stokA = Number(item.stokA) || 0;
            const stokB = Number(item.stokB) || 0;
            return (stokA > 0 || stokB > 0);
        });
        
        console.log(`📊 Items with stock: ${withStock.length}`);
        console.log(`📊 Items with zero stock: ${data.length - withStock.length}`);
        
        UI.hideLoading();
        return data;
        
    } catch (error) {
        console.error('❌ Error loading all data:', error);
        UI.hideLoading();
        UI.showAlert('❌ Gagal memuat data barang: ' + error.message, 'danger');
        throw error;
    }
}

// Fungsi lama (untuk backward compatibility)
async function loadDataBarang() {
    return loadAllBarang();
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
            { nama: 'Elektrik', inisial: 'ELK' },
            { nama: 'Tools', inisial: 'TOOL' }
        ];
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
            }, 150);
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
            
            // ✅ PERBAIKAN: Pastikan data sudah terload sebelum generate ID
            if (!dataMaster || dataMaster.length === 0) {
                console.log('📥 Loading all barang data for ID generation...');
                loadAllBarang().then(() => {
                    generateNewItemId();
                }).catch(error => {
                    console.error('❌ Failed to load barang data:', error);
                    // Fallback: generate simple ID
                    generateSimpleItemId();
                });
            } else {
                generateNewItemId();
            }
            
            // ✅ Boleh edit ID secara manual
            const idInput = document.getElementById('newItemId');
            if (idInput) {
                idInput.removeAttribute('readonly');
                idInput.title = "Bisa diedit manual jika perlu";
            }
        }, 150);
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

// ✅ PERBAIKAN: Fungsi generate ID yang lebih baik
function generateNewItemId() {
    const kategoriSelect = document.getElementById('newItemKategori');
    const idInput = document.getElementById('newItemId');
    
    if (!kategoriSelect || !idInput) return;
    
    const inisial = kategoriSelect.value;
    
    if (!inisial) {
        idInput.value = '';
        return;
    }
    
    // Pastikan dataMaster sudah terisi
    if (!dataMaster || dataMaster.length === 0) {
        console.warn('⚠️ dataMaster kosong, menggunakan ID sederhana');
        idInput.value = `${inisial}-0001`;
        return;
    }
    
    // Ambil semua ID untuk kategori ini
    const existingIds = dataMaster
        .filter(item => item.id && item.id.startsWith(inisial + '-'))
        .map(item => item.id);
    
    console.log(`🔍 Kategori ${inisial}: ${existingIds.length} existing IDs`);
    
    if (existingIds.length === 0) {
        idInput.value = `${inisial}-0001`;
        console.log(`✅ Generated first ID: ${inisial}-0001`);
        return;
    }
    
    // Ambil semua numbers dari ID yang ada
    const existingNumbers = existingIds.map(id => {
        const parts = id.split('-');
        if (parts.length < 2) return 0;
        const num = parseInt(parts[1]);
        return isNaN(num) ? 0 : num;
    }).filter(num => !isNaN(num) && num > 0);
    
    if (existingNumbers.length === 0) {
        idInput.value = `${inisial}-0001`;
        console.log(`✅ Generated first ID (no valid numbers): ${inisial}-0001`);
        return;
    }
    
    // Urutkan numbers
    existingNumbers.sort((a, b) => a - b);
    
    console.log(`📊 Existing numbers (first 10): ${existingNumbers.slice(0, 10).join(', ')}`);
    console.log(`📊 Max number: ${Math.max(...existingNumbers)}`);
    
    // Cari gap pertama yang kosong
    let nextNum = 1;
    let foundGap = false;
    
    for (let i = 0; i < existingNumbers.length; i++) {
        if (existingNumbers[i] !== i + 1) {
            nextNum = i + 1;
            foundGap = true;
            break;
        }
    }
    
    if (!foundGap) {
        nextNum = existingNumbers[existingNumbers.length - 1] + 1;
    }
    
    // Format dengan 4 digit
    let newId = `${inisial}-${String(nextNum).padStart(4, '0')}`;
    
    // Double check: pastikan ID belum ada
    let attempts = 0;
    while (existingIds.includes(newId) && attempts < 100) {
        console.warn(`⚠️ ID ${newId} already exists, trying next...`);
        nextNum++;
        newId = `${inisial}-${String(nextNum).padStart(4, '0')}`;
        attempts++;
    }
    
    if (attempts >= 100) {
        console.error('❌ Cannot find available ID after 100 attempts');
        // Gunakan timestamp sebagai fallback
        const timestamp = Date.now().toString().slice(-4);
        newId = `${inisial}-${timestamp}`;
    }
    
    idInput.value = newId;
    console.log(`✅ Generated new ID: ${newId} (nextNum: ${nextNum})`);
}

// Fallback function untuk generate ID sederhana
function generateSimpleItemId() {
    const kategoriSelect = document.getElementById('newItemKategori');
    const idInput = document.getElementById('newItemId');
    
    if (!kategoriSelect || !idInput) return;
    
    const inisial = kategoriSelect.value;
    
    if (!inisial) {
        idInput.value = '';
        return;
    }
    
    // Gunakan timestamp untuk ID unik
    const timestamp = Date.now().toString().slice(-4);
    const newId = `${inisial}-${timestamp}`;
    
    idInput.value = newId;
    console.log(`✅ Generated simple ID: ${newId}`);
}

async function submitNewItem() {
    const idBarang = document.getElementById('newItemId').value.trim();
    const nama = document.getElementById('newItemNama').value.trim();
    const kategoriSelect = document.getElementById('newItemKategori');
    const kategori = kategoriSelect.selectedOptions[0]?.text || 'Umum';
    const satuan = document.getElementById('newItemSatuan').value;
    const stokAwal = document.getElementById('newItemStok').value;
    const gudang = document.getElementById('newItemGudang').value;
    
    const user = AUTH.getUserName() || 'System';
    
    console.log('📦 Submitting new item:', { idBarang, nama, kategori, satuan, stokAwal, gudang, user });
    
    // ✅ PERBAIKAN: Validasi input
    if (!idBarang) {
        UI.showAlert('❌ ID Barang tidak boleh kosong!', 'danger');
        document.getElementById('newItemId').focus();
        return;
    }
    
    if (!nama) {
        UI.showAlert('❌ Nama Barang tidak boleh kosong!', 'danger');
        document.getElementById('newItemNama').focus();
        return;
    }
    
    // ✅ PERBAIKAN: Cek apakah ID sudah ada di dataMaster
    const idExists = dataMaster.some(item => item.id === idBarang);
    if (idExists) {
        UI.showAlert(`❌ ID ${idBarang} sudah ada di sistem!`, 'danger');
        
        // Tampilkan barang yang sudah ada
        const existingItem = dataMaster.find(item => item.id === idBarang);
        if (existingItem) {
            UI.showAlert(`📋 Barang dengan ID ${idBarang} sudah ada: ${existingItem.nama}`, 'info', 4000);
        }
        
        // Tawarkan untuk edit ID
        setTimeout(() => {
            const editId = confirm(`ID ${idBarang} sudah ada.\n\nApakah ingin mengedit ID sekarang?`);
            if (editId) {
                document.getElementById('newItemId').focus();
                document.getElementById('newItemId').select();
            }
        }, 500);
        
        return;
    }
    
    try {
        UI.showLoading();
        
        const result = await API.post('addBarang', {
            idBarang: idBarang,
            nama: nama,
            kategori: kategori,
            satuan: satuan,
            stokAwal: stokAwal,
            gudang: gudang,
            user: user
        });
        
        console.log('✅ New item added:', result);
        
        // Clear cache dan reload data
        if (typeof API !== 'undefined' && API.clearCache) {
            API.clearCache();
        }
        
        // ✅ PERBAIKAN: Reload SEMUA data barang
        await loadAllBarang();
        
        UI.hideLoading();
        UI.showAlert('✅ Barang baru berhasil ditambahkan!', 'success');
        
        closeAddItemModal();
        
        // Coba pilih barang yang baru ditambahkan
        const newItem = dataMaster.find(item => item.id === idBarang);
        if (newItem) {
            selectItem(newItem);
        } else {
            // Jika tidak ditemukan, coba search dengan nama
            document.getElementById('manualIdInput').value = nama;
            searchBarang(nama);
        }
        
    } catch (error) {
        console.error('❌ Error adding item:', error);
        UI.hideLoading();
        
        // ✅ PERBAIKAN: Tampilkan error yang lebih informatif
        let errorMessage = '❌ Gagal menambah barang';
        if (error.message.includes('ID Barang sudah ada')) {
            errorMessage = `❌ ID ${idBarang} sudah ada di sistem!`;
            
            // Update dataMaster dan cek lagi
            await loadAllBarang();
            
            // Tawarkan solusi
            setTimeout(() => {
                const editId = confirm(`${errorMessage}\n\nApakah ingin mengedit ID sekarang?`);
                if (editId) {
                    document.getElementById('newItemId').focus();
                    document.getElementById('newItemId').select();
                }
            }, 500);
        } else {
            errorMessage += ': ' + error.message;
        }
        
        UI.showAlert(errorMessage, 'danger');
    }
}

async function submitNewKategori() {
    const nama = document.getElementById('newKategoriNama').value.trim();
    const inisial = document.getElementById('newKategoriInisial').value.toUpperCase().trim();
    
    console.log('🏷️ Submitting new kategori:', { nama, inisial });
    
    // Validasi
    if (!nama || !inisial) {
        UI.showAlert('❌ Nama dan Inisial harus diisi!', 'danger');
        return;
    }
    
    if (inisial.length > 4) {
        UI.showAlert('❌ Inisial maksimal 4 karakter!', 'danger');
        return;
    }
    
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
    console.log('⚠️ Confirmation modal is deprecated, transactions are now direct');
}

function showConfirmation() {
    console.log('📋 Validating and submitting transaction...');
    
    if (!validateForm()) {
        console.log('❌ Form validation failed');
        return;
    }
    
    submitTransactionDirect();
}

function hideConfirmation() {
    console.log('Hiding confirmation modal (deprecated)');
}

function validateForm() {
    console.log('🔍 Validating form...');
    
    if (!tempSelectedItem) {
        UI.showAlert('⚠️ Pilih barang terlebih dahulu!', 'danger');
        return false;
    }
    
    const tanggal = document.getElementById('tanggal').value;
    if (!tanggal || tanggal.trim() === '') {
        UI.showAlert('⚠️ Tanggal transaksi harus diisi!', 'danger');
        return false;
    }
    
    const jumlah = document.getElementById('jumlah').value;
    if (!jumlah || jumlah <= 0) {
        UI.showAlert('⚠️ Jumlah tidak valid!', 'danger');
        return false;
    }
    
    const pic = document.getElementById('pic').value;
    if (!pic || pic.trim() === '') {
        UI.showAlert('⚠️ PIC harus diisi!', 'danger');
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
        const gudangValue = gudangBtn.dataset.warehouse;
        
        const jenis = document.querySelector('.type-btn.active').dataset.type;
        const barangNama = tempSelectedItem ? tempSelectedItem.nama : '-';
        const barangId = tempSelectedItem ? tempSelectedItem.id : '-';
        const tanggal = document.getElementById('tanggal').value;
        const jumlah = document.getElementById('jumlah').value;
        const satuan = tempSelectedItem ? tempSelectedItem.satuan : 'Unit';
        const pic = document.getElementById('pic').value;
        const petugas = document.getElementById('user').value;
        const keterangan = document.getElementById('keterangan').value;
        
        const gudangApi = gudangValue === 'Kalipucang' ? 'A' : 'B';
        
        const transactionData = {
            lokasiGudang: gudangApi,
            jenis: jenis,
            tanggal: tanggal,
            idBarang: barangId,
            namaBarang: barangNama,
            jumlah: jumlah,
            satuan: satuan,
            pic: pic,
            user: petugas,
            keterangan: keterangan
        };
        
        console.log('Transaction data:', transactionData);
        
        UI.showLoading();
        
        const result = await API.post('submitTransaksi', transactionData);
        
        console.log('✅ Transaction submitted successfully:', result);
        
        UI.hideLoading();
        
        const jenisText = jenis === 'Masuk' ? 'masuk' : 'keluar';
        UI.showAlert(`✅ Transaksi ${jenisText} berhasil! ${barangNama} (${jumlah} ${satuan})`, 'success', 2000);
        
        resetForm();
        
    } catch (error) {
        console.error('❌ Error submitting transaction:', error);
        UI.hideLoading();
        UI.showAlert('❌ Gagal menyimpan transaksi: ' + error.message, 'danger');
    }
}

async function submitTransaction() {
    await submitTransactionDirect();
}

// ============================================
// SEARCH - PERBAIKAN: TAMPILKAN SEMUA TERMASUK STOK 0
// ============================================

function searchBarang(query) {
    console.log('🔎 Searching for:', query);
    
    const queryLower = query.toLowerCase().trim();
    
    // ✅ Cari di SEMUA dataMaster (termasuk barang stok 0)
    const scoredResults = dataMaster
        .map(item => {
            const idLower = item.id.toLowerCase();
            const namaLower = item.nama.toLowerCase();
            let score = 0;
            
            if (idLower === queryLower || namaLower === queryLower) {
                score = 1000;
            }
            else if (idLower.startsWith(queryLower) || namaLower.startsWith(queryLower)) {
                score = 500;
            }
            else if (idLower.includes(queryLower) || namaLower.includes(queryLower)) {
                score = 100;
            }
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
        if (results.length === 1 || scoredResults[0].score === 1000) {
            selectItem(results[0]);
        } else {
            showSearchResults(results, query);
        }
    } else {
        hideItemResult();
        hideSearchResults();
        
        // Barang tidak ditemukan, tawarkan untuk tambah barang baru
        UI.showAlert('❌ Barang tidak ditemukan. Membuka form tambah barang...', 'warning', 2000);
        
        setTimeout(() => {
            openAddItemModal(query);
        }, 500);
    }
}

function fuzzyMatch(query, target) {
    const cleanQuery = query.replace(/[\s-_]/g, '');
    const cleanTarget = target.replace(/[\s-_]/g, '');
    
    let queryIndex = 0;
    for (let i = 0; i < cleanTarget.length && queryIndex < cleanQuery.length; i++) {
        if (cleanTarget[i] === cleanQuery[queryIndex]) {
            queryIndex++;
        }
    }
    
    return queryIndex === cleanQuery.length;
}

function showSearchResults(results, query) {
    console.log('📋 Showing search results dropdown');
    
    const searchInput = document.getElementById('manualIdInput');
    const inputRect = searchInput.getBoundingClientRect();
    
    let dropdown = document.getElementById('searchResultsDropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'searchResultsDropdown';
        dropdown.className = 'search-results-dropdown';
        document.body.appendChild(dropdown);
    }
    
    dropdown.style.position = 'fixed';
    dropdown.style.top = (inputRect.bottom + 8) + 'px';
    dropdown.style.left = inputRect.left + 'px';
    dropdown.style.width = inputRect.width + 'px';
    
    const maxResults = 5;
    const displayResults = results.slice(0, maxResults);
    
    let html = '';
    displayResults.forEach((item, index) => {
        const stokA = Number(item.stokA) || 0;
        const stokB = Number(item.stokB) || 0;
        const hasStock = stokA > 0 || stokB > 0;
        const stockClass = hasStock ? '' : 'zero-stock-search';
        
        const highlightedName = highlightMatch(item.nama, query);
        const highlightedId = highlightMatch(item.id, query);
        
        html += `
            <div class="search-result-item ${stockClass}" onclick="window.selectItemFromDropdown(${index})" data-index="${index}">
                <div class="result-name">${highlightedName}</div>
                <div class="result-details">
                    <span class="result-id">ID: ${highlightedId}</span>
                    <span class="result-stock">Stok A: ${item.stokA} | B: ${item.stokB}</span>
                </div>
                ${!hasStock ? '<div class="result-zero-stock">Stok 0</div>' : ''}
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
    
    window.searchResultsCache = displayResults;
    
    const updatePosition = () => {
        const newRect = searchInput.getBoundingClientRect();
        dropdown.style.top = (newRect.bottom + 8) + 'px';
        dropdown.style.left = newRect.left + 'px';
        dropdown.style.width = newRect.width + 'px';
    };
    
    window.removeEventListener('scroll', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    window.removeEventListener('resize', updatePosition);
    window.addEventListener('resize', updatePosition);
}

function highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

window.selectItemFromDropdown = function(index) {
    if (window.searchResultsCache && window.searchResultsCache[index]) {
        selectItem(window.searchResultsCache[index]);
        hideSearchResults();
    }
};

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
    
    updateGudangColors();
}

function updateStockDisplay() {
    if (!tempSelectedItem) return;
    
    const activeWarehouse = document.querySelector('.warehouse-btn.active');
    const gudang = activeWarehouse ? activeWarehouse.dataset.warehouse : 'Kalipucang';
    
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
    loadAllBarang(); // ✅ PERBAIKAN: Gunakan loadAllBarang
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

function getGudangDisplayNameFromValue(gudangValue) {
    return gudangValue === 'Kalipucang' ? 'Gudang Kalipucang' : 'Gudang Troso';
}

function getGudangApiCode(gudangValue) {
    return gudangValue === 'Kalipucang' ? 'A' : 'B';
}

function getGudangValueFromApiCode(apiCode) {
    return apiCode === 'A' ? 'Kalipucang' : 'Troso';
}

function getGudangDisplayNameFromApiCode(apiCode) {
    return apiCode === 'A' ? 'Gudang Kalipucang' : 'Gudang Troso';
}

// ============================================
// GUDANG COLOR HELPER
// ============================================

function updateGudangColors() {
    const activeWarehouse = document.querySelector('.warehouse-btn.active');
    if (!activeWarehouse) return;
    
    const gudang = activeWarehouse.dataset.warehouse;
    const gudangClass = gudang === 'Kalipucang' ? 'gudang-a' : 'gudang-b';
    
    console.log('🎨 Updating colors for:', gudang);
    
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
    
    updateGudangIndicator(gudang);
}

function updateGudangIndicator(gudang) {
    // Disabled - indicator removed from UI
    return;
}

// ============================================
// MOBILE RESPONSIVE FUNCTIONS
// ============================================

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

window.addEventListener('resize', updateWarehouseButtonsForMobile);
document.addEventListener('DOMContentLoaded', updateWarehouseButtonsForMobile);

// ============================================
// DEBUG FUNCTIONS
// ============================================

// Fungsi untuk debugging
function debugDataMaster() {
    console.log('=== DEBUG DATA MASTER ===');
    console.log(`Total items: ${dataMaster.length}`);
    
    // Group by kategori
    const byKategori = {};
    dataMaster.forEach(item => {
        const kat = item.kategori || 'Unknown';
        if (!byKategori[kat]) byKategori[kat] = [];
        byKategori[kat].push(item.id);
    });
    
    Object.keys(byKategori).forEach(kat => {
        console.log(`Kategori ${kat}: ${byKategori[kat].length} items`);
        console.log(`  IDs: ${byKategori[kat].slice(0, 5).join(', ')}${byKategori[kat].length > 5 ? '...' : ''}`);
    });
    
    // Cek ELK khusus
    const elkItems = dataMaster.filter(item => item.id.startsWith('ELK-'));
    console.log(`\nELK items: ${elkItems.length}`);
    if (elkItems.length > 0) {
        console.log('ELK IDs:', elkItems.map(item => item.id));
    }
    
    console.log('========================');
}

// ============================================
// GLOBAL FUNCTIONS
// ============================================

window.updateGudangColors = updateGudangColors;
window.updateGudangIndicator = updateGudangIndicator;

window.getActiveGudang = function() {
    const activeBtn = document.querySelector('.warehouse-btn.active');
    return activeBtn ? activeBtn.dataset.warehouse : 'Kalipucang';
};

window.getActiveGudangDisplayName = function() {
    const activeGudang = getActiveGudang();
    return getGudangDisplayNameFromValue(activeGudang);
};

// ============================================
// AUTO-RUN FUNCTIONS
// ============================================

if (document.getElementById('transaksiForm')) {
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
    if (!('ontouchstart' in window)) return;
    
    console.log('📱 Setting up mobile keyboard handler');
    
    const inputs = document.querySelectorAll('input, textarea, select');
    let activeInput = null;
    let keyboardHeight = 0;
    
    function checkKeyboard() {
        const viewportHeight = window.innerHeight;
        const documentHeight = document.documentElement.clientHeight;
        
        if (documentHeight > viewportHeight) {
            keyboardHeight = documentHeight - viewportHeight;
            document.body.classList.add('keyboard-open');
            
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
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            activeInput = this;
            document.body.classList.add('input-focused');
            setTimeout(checkKeyboard, 300);
        });
        
        input.addEventListener('blur', function() {
            activeInput = null;
            document.body.classList.remove('input-focused');
            setTimeout(checkKeyboard, 500);
        });
    });
    
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(checkKeyboard, 100);
    });
    
    setTimeout(checkKeyboard, 1000);
}

if (document.getElementById('transaksiForm')) {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(setupMobileKeyboardHandler, 500);
    });
}

// ============================================
// MANUAL DEBUG COMMANDS
// ============================================

// Untuk debug di console browser
window.debugApp = {
    reloadData: async function() {
        console.log('🔄 Manual reload data...');
        await loadAllBarang();
        console.log('✅ Data reloaded');
    },
    
    checkELK: function() {
        const elkItems = dataMaster.filter(item => item.id.startsWith('ELK-'));
        console.log(`ELK items: ${elkItems.length}`);
        console.log('ELK IDs:', elkItems.map(item => item.id));
        return elkItems;
    },
    
    findID: function(id) {
        const item = dataMaster.find(item => item.id === id);
        console.log(`Searching for ID: ${id}`);
        console.log('Found:', item);
        return item;
    },
    
    clearCache: function() {
        if (typeof API !== 'undefined' && API.clearCache) {
            API.clearCache();
            console.log('✅ Cache cleared');
        } else {
            console.log('❌ API.clearCache not available');
        }
    }
};