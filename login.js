// ============================================
// LOGIN.JS - Authentication System (Spreadsheet)
// ============================================

const AUTH = {
    // User roles
    ROLES: {
        ADMIN: 'admin_gudang',
        MANAGER: 'manager',
        PETUGAS: 'petugas'
    },
    
    // Current user session
    currentUser: null,
    
    // Check if user is logged in
    isLoggedIn() {
        const token = localStorage.getItem('auth_token');
        const user = localStorage.getItem('auth_user');
        return token !== null && user !== null;
    },
    
    // Get current user
    getUser() {
        const userData = localStorage.getItem('auth_user');
        return userData ? JSON.parse(userData) : null;
    },
    
    // Login function - Connect to Spreadsheet API
    async login(username, password) {
        console.log('🔐 Attempting login for:', username);
        
        try {
            UI.showLoading();
            
            // Call API to validate user
            const response = await API.post('login', {
                username: username,
                password: password
            });
            
            if (response.success && response.user) {
                // Create session
                const token = btoa(`${username}:${Date.now()}`);
                localStorage.setItem('auth_token', token);
                localStorage.setItem('auth_user', JSON.stringify(response.user));
                localStorage.setItem('auth_role', response.user.role);
                localStorage.setItem('auth_gudang', response.user.gudang || 'A');
                localStorage.setItem('auth_name', response.user.name);
                
                this.currentUser = response.user;
                
                console.log(`✅ User ${username} logged in as ${response.user.role}`);
                
                UI.hideLoading();
                return {
                    success: true,
                    user: response.user
                };
            } else {
                UI.hideLoading();
                return {
                    success: false,
                    error: response.error || 'Login gagal'
                };
            }
            
        } catch (error) {
            console.error('Login error:', error);
            UI.hideLoading();
            return {
                success: false,
                error: 'Gagal menghubungi server. Coba lagi nanti.'
            };
        }
    },
    
    // Logout function
    logout() {
        console.log('Logging out user');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_role');
        localStorage.removeItem('auth_gudang');
        localStorage.removeItem('auth_name');
        this.currentUser = null;
        
        // Redirect to login page
        window.location.href = 'login.html';
    },
    
    // Check permission
    hasPermission(requiredRole) {
        const userRole = localStorage.getItem('auth_role');
        
        // Role hierarchy
        const hierarchy = {
            'admin_gudang': 3,
            'manager': 2,
            'petugas': 1
        };
        
        return hierarchy[userRole] >= hierarchy[requiredRole];
    },
    
    // Get user's assigned warehouse
    getUserGudang() {
        return localStorage.getItem('auth_gudang') || 'A';
    },
    
    // Get warehouse restriction for this user
    // Returns: 'A' | 'B' | null (null = no restriction, can access all)
    getWarehouseRestriction() {
        const role = localStorage.getItem('auth_role');
        const gudang = localStorage.getItem('auth_gudang') || '';
        
        // Admin & Manager: no restriction
        if (role === 'admin_gudang' || role === 'manager') {
            return null;
        }
        
        // Petugas: restrict to their assigned warehouse
        if (gudang === 'A' || gudang === 'B') {
            return gudang;
        }
        
        // Default: no restriction
        return null;
    },
    
    // Get user's role
    getUserRole() {
        return localStorage.getItem('auth_role');
    },
    
    // Get user's name
    getUserName() {
        return localStorage.getItem('auth_name');
    },
    
    // Auto-fill form based on role
    autoFillForm() {
        if (!this.isLoggedIn()) {
            console.log('User not logged in, skipping auto-fill');
            return;
        }
        
        const user = this.getUser();
        const userRole = user.role;
        const userGudang = user.gudang || 'A';
        
        console.log('Auto-filling form for:', user.name, 'Role:', userRole, 'Gudang:', userGudang);
        
        // Auto-fill user field
        const userField = document.getElementById('user');
        if (userField) {
            userField.value = user.name;
            userField.readOnly = true;
            console.log('✅ User field filled:', user.name);
        }
        
        // Apply warehouse restriction on index page
        const restriction = this.getWarehouseRestriction();
        if (restriction !== null) {
            const warehouseName = restriction === 'A' ? 'Kalipucang' : 'Troso';
            const toggleContainer = document.querySelector('.warehouse-toggle');
            
            if (toggleContainer) {
                // Hide the button that doesn't belong to this user
                const allBtns = toggleContainer.querySelectorAll('.warehouse-btn');
                allBtns.forEach(btn => {
                    if (btn.dataset.warehouse !== warehouseName) {
                        btn.style.display = 'none';
                    } else {
                        // Make the allowed one active
                        btn.classList.add('active');
                        // Expand to full width since only one button
                        btn.style.gridColumn = '1 / -1';
                    }
                });
                console.log('✅ Warehouse restricted to:', warehouseName);
            }
        }
    },
    
    // Initialize auth system
    init() {
        console.log('Auth init called');
        
        // Check if user is logged in
        if (this.isLoggedIn()) {
            console.log('User is logged in');
            this.currentUser = this.getUser();
            
            // Check if trying to access login page while logged in
            if (window.location.pathname.includes('login.html')) {
                console.log('Redirecting to index (already logged in)');
                window.location.href = 'index.html';
            }
        } else {
            console.log('User is not logged in');
            // Redirect to login if not authenticated and not on login page
            if (!window.location.pathname.includes('login.html')) {
                console.log('Redirecting to login page');
                window.location.href = 'login.html';
            }
        }
    }
};