/**
 * ASRP Authentication Helper
 * Client-side auth system using localStorage
 */

const Auth = {
  // Get all users
  getUsers() {
    return JSON.parse(localStorage.getItem('asrp-users') || '[]');
  },

  // Get current logged-in user
  getCurrentUser() {
    return JSON.parse(localStorage.getItem('asrp-current-user') || 'null');
  },

  // Check if logged in
  isLoggedIn() {
    return !!this.getCurrentUser();
  },

  // Check if setup is complete
  isSetupComplete() {
    return localStorage.getItem('asrp-setup-complete') === 'true';
  },

  // Register new user
  register(name, email, password) {
    if (!name || !email || !password) {
      return { success: false, error: 'All fields are required' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    const users = this.getUsers();
    
    // Check if email already exists
    if (users.find(u => u.email === email)) {
      return { success: false, error: 'Email already registered' };
    }

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password, // In production, hash this!
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('asrp-users', JSON.stringify(users));

    // Auto-login
    const userWithoutPassword = { ...newUser };
    delete userWithoutPassword.password;
    localStorage.setItem('asrp-current-user', JSON.stringify(userWithoutPassword));

    return { success: true };
  },

  // Login
  login(email, password, remember = false) {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    const users = this.getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Store session
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;
    localStorage.setItem('asrp-current-user', JSON.stringify(userWithoutPassword));

    if (remember) {
      localStorage.setItem('asrp-remember', 'true');
    }

    return { success: true };
  },

  // Logout
  logout() {
    localStorage.removeItem('asrp-current-user');
    localStorage.removeItem('asrp-remember');
    window.location.href = 'login.html';
  },

  // Require auth (redirect to login if not authenticated)
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
    }
  },

  // Require setup complete (redirect to setup if not complete)
  requireSetup() {
    if (!this.isSetupComplete()) {
      window.location.href = 'setup.html?message=Please complete setup first';
    }
  },

  // Update nav bar based on auth state
  updateNav() {
    const navLinks = document.querySelector('nav .links');
    if (!navLinks) return;

    const user = this.getCurrentUser();
    
    // Remove existing auth elements
    const existing = navLinks.querySelectorAll('.auth-element');
    existing.forEach(el => el.remove());

    if (user) {
      // User is logged in - show Dashboard + user menu
      const dashboardLink = document.createElement('a');
      dashboardLink.href = 'dashboard.html';
      dashboardLink.textContent = 'Dashboard';
      dashboardLink.className = 'auth-element';
      navLinks.insertBefore(dashboardLink, navLinks.children[2]);

      const userMenu = document.createElement('div');
      userMenu.className = 'auth-element user-menu';
      userMenu.style.cssText = 'display:flex;align-items:center;gap:0.5rem;color:var(--text);font-weight:500;';
      userMenu.innerHTML = `
        <span style="color:var(--text-secondary);">👤 ${user.name}</span>
        <button onclick="Auth.logout()" class="btn btn-outline btn-sm" style="padding:0.25rem 0.75rem;font-size:0.875rem;">Logout</button>
      `;
      const langDrop = navLinks.querySelector('.lang-dropdown');
      if (langDrop) navLinks.insertBefore(userMenu, langDrop);
      else navLinks.appendChild(userMenu);
    } else {
      // User not logged in - show Login button
      const loginLink = document.createElement('a');
      loginLink.href = 'login.html';
      loginLink.className = 'auth-element';
      loginLink.style.cssText = 'padding:6px 14px;background:rgba(74,140,106,0.15);color:#4a8c6a;border:1px solid #4a8c6a;border-radius:6px;font-size:13px;font-weight:500;text-decoration:none;white-space:nowrap;';
      loginLink.textContent = 'Login / Sign Up';
      const langDrop2 = navLinks.querySelector('.lang-dropdown');
      if (langDrop2) navLinks.insertBefore(loginLink, langDrop2);
      else navLinks.appendChild(loginLink);
    }
  }
};

// Update nav on page load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    Auth.updateNav();
  });
}
