// ============================================
// CONFIG.JS - OPTIMIZED FOR SPEED
// ============================================

const CONFIG = {
    // GANTI INI dengan URL Google Apps Script Anda
    API_URL: 'https://script.google.com/macros/s/AKfycbxHRZN-J4SVpRO2MAh319N07mx9_n9bOTF7tgYLLC0ZvAXgLWF2ZPcJy5o2MUbHCXFt/exec',
    
    AUTO_DETECT: {
        minChars: 2,
        debounceTime: 150, // Dipercepat dari 300ms ke 150ms
        maxResults: 5
    },
    
    SCANNER: {
        facingMode: 'environment',
        qrboxSize: 250
    },
    
    // Pengaturan loading yang lebih cepat
    LOADING: {
        minDisplayTime: 200, // Minimal 200ms (dari 500ms)
        fadeSpeed: 150 // Fade animation 150ms (dari 300ms)
    }
};

// API - Optimized dengan timeout dan caching
const API = {
    cache: new Map(), // Simple cache
    
    async get(action, params = {}) {
        try {
            // Check cache untuk operasi read-only
            const cacheKey = action + JSON.stringify(params);
            if (action.includes('get') && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < 30000) { // Cache 30 detik
                    console.log('⚡ Using cached data for:', action);
                    return cached.data;
                }
            }
            
            const url = new URL(CONFIG.API_URL);
            url.searchParams.append('action', action);
            
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });
            
            console.log('📤 API GET:', action);
            
            // Tambahkan timeout untuk request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 detik timeout
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                redirect: 'follow',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'API failed');
            }
            
            // Cache hasil untuk operasi read
            if (action.includes('get')) {
                this.cache.set(cacheKey, {
                    data: data.data,
                    timestamp: Date.now()
                });
            }
            
            return data.data;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - periksa koneksi internet');
            }
            console.error('❌ API Error:', error.message);
            throw error;
        }
    },
    
    async post(action, data = {}) {
        try {
            const url = new URL(CONFIG.API_URL);
            url.searchParams.append('action', action);
            
            Object.keys(data).forEach(key => {
                const value = data[key];
                url.searchParams.append(key, String(value));
            });
            
            console.log('📤 API POST:', action);
            
            // Timeout untuk POST juga
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 detik untuk write
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                redirect: 'follow',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const responseText = await response.text();
            const result = JSON.parse(responseText);
            
            if (!result.success) {
                throw new Error(result.error || 'API failed');
            }
            
            // Clear cache setelah write operation
            this.cache.clear();
            
            return result.data || result;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - periksa koneksi internet');
            }
            console.error('❌ API Error:', error.message);
            throw error;
        }
    },
    
    // Clear cache manual
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache cleared');
    }
};

// UI Helper - OPTIMIZED
const UI = {
    loadingStartTime: null,
    
    showLoading(id = 'loader') {
        const el = document.getElementById(id);
        if (el) {
            this.loadingStartTime = Date.now();
            el.style.display = 'flex';
            // Langsung opacity 1 tanpa delay
            requestAnimationFrame(() => {
                el.style.opacity = '1';
            });
        }
    },
    
    async hideLoading(id = 'loader') {
        const el = document.getElementById(id);
        if (el) {
            // Pastikan loading minimal tampil 200ms (agar tidak flicker)
            const elapsed = Date.now() - (this.loadingStartTime || 0);
            const minTime = CONFIG.LOADING.minDisplayTime;
            
            if (elapsed < minTime) {
                await new Promise(resolve => setTimeout(resolve, minTime - elapsed));
            }
            
            // Fade out cepat
            el.style.transition = `opacity ${CONFIG.LOADING.fadeSpeed}ms ease`;
            el.style.opacity = '0';
            
            setTimeout(() => {
                el.style.display = 'none';
            }, CONFIG.LOADING.fadeSpeed);
        }
    },
    
    showAlert(msg, type = 'info', duration = 3000) { // Durasi diperpendek ke 3 detik
        let container = document.getElementById('alert-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'alert-container';
            container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;max-width:400px;';
            document.body.appendChild(container);
        }
        
        const alertId = 'alert-' + Date.now();
        const alertDiv = document.createElement('div');
        alertDiv.id = alertId;
        
        const colors = {
            success: '#06D6A0',
            danger: '#EF476F',
            warning: '#F7B801',
            info: '#4facfe'
        };
        
        const color = colors[type] || colors.info;
        
        alertDiv.style.cssText = `
            background: rgba(0, 0, 0, 0.9);
            border-left: 4px solid ${color};
            color: white;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.2s ease;
        `;
        
        alertDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span>${msg}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; padding: 0;">
                    ×
                </button>
            </div>
        `;
        
        container.appendChild(alertDiv);
        
        if (duration > 0) {
            setTimeout(() => {
                const el = document.getElementById(alertId);
                if (el) {
                    el.style.transition = 'opacity 0.2s ease';
                    el.style.opacity = '0';
                    setTimeout(() => el.remove(), 200);
                }
            }, duration);
        }
    }
};