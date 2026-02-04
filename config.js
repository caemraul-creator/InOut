// ============================================
// CONFIG.JS - Fixed Version with Better Debugging
// ============================================

const CONFIG = {
    // GANTI INI dengan URL Google Apps Script Anda
    API_URL: 'https://script.google.com/macros/s/AKfycbxIoMyvQ6E0c20UA4z1qVYi3Y63XYY3vgNUoFD20vHbJJwiLCfjVuUlO_DhFljptvX0/exec',
    
    AUTO_DETECT: {
        minChars: 2,
        debounceTime: 300,
        maxResults: 5
    },
    
    SCANNER: {
        facingMode: 'environment',
        qrboxSize: 250
    }
};

// API - Direct ke Google Apps Script dengan logging lebih detail
const API = {
    async get(action, params = {}) {
        try {
            const url = new URL(CONFIG.API_URL);
            url.searchParams.append('action', action);
            
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });
            
            console.log('📤 API GET Request:', action);
            console.log('📍 URL:', url.toString());
            console.log('📦 Params:', params);
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                redirect: 'follow'
            });
            
            console.log('📥 Response Status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('✅ Response Data:', data);
            
            if (!data.success) {
                throw new Error(data.error || 'API failed');
            }
            
            return data.data;
            
        } catch (error) {
            console.error('❌ API GET Error:', error);
            console.error('Error details:', error.message);
            throw error;
        }
    },
    
    async post(action, data = {}) {
        try {
            const url = new URL(CONFIG.API_URL);
            url.searchParams.append('action', action);
            
            // Convert all data to URL parameters
            Object.keys(data).forEach(key => {
                const value = data[key];
                url.searchParams.append(key, String(value));
            });
            
            console.log('📤 API POST Request:', action);
            console.log('📍 URL:', url.toString());
            console.log('📦 Data:', data);
            
            const response = await fetch(url.toString(), {
                method: 'GET', // Google Apps Script menggunakan GET untuk semua request
                redirect: 'follow'
            });
            
            console.log('📥 Response Status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Get response text first for debugging
            const responseText = await response.text();
            console.log('📄 Raw Response:', responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ JSON Parse Error:', parseError);
                console.error('Response was:', responseText);
                throw new Error('Invalid JSON response from server');
            }
            
            console.log('✅ Parsed Response:', result);
            
            if (!result.success) {
                throw new Error(result.error || 'API failed');
            }
            
            return result.data || result;
            
        } catch (error) {
            console.error('❌ API POST Error:', error);
            console.error('Error details:', error.message);
            throw error;
        }
    }
};

// UI Helper
const UI = {
    showLoading(id = 'loader') {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'flex';
            console.log('⏳ Loading shown');
        }
    },
    
    hideLoading(id = 'loader') {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            console.log('✅ Loading hidden');
        }
    },
    
    showAlert(msg, type = 'info', duration = 5000) {
        console.log(`🔔 Alert [${type}]:`, msg);
        
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
        
        // Map alert types to colors
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
            animation: slideIn 0.3s ease;
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
                if (el) el.remove();
            }, duration);
        }
    }
};