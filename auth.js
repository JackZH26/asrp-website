// ASRP Auth Module — API-backed authentication
const API_BASE = '/api';

const Auth = {
  _user: null,
  _token: null,

  async register(name, email, password) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    this._user = data.user;
    if (data.token) localStorage.setItem('asrp-token', data.token);
    return data.user;
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    this._user = data.user;
    if (data.token) localStorage.setItem('asrp-token', data.token);
    return data.user;
  },

  async logout() {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    this._user = null;
    localStorage.removeItem('asrp-token');
    localStorage.removeItem('asrp-setup-complete');
    window.location.href = 'login.html';
  },

  async getUser() {
    if (this._user) return this._user;
    const token = localStorage.getItem('asrp-token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include', headers });
      if (!res.ok) return null;
      const data = await res.json();
      this._user = data.user;
      return data.user;
    } catch (e) { return null; }
  },

  async isLoggedIn() {
    return !!(await this.getUser());
  },

  isSetupComplete() {
    return localStorage.getItem('asrp-setup-complete') === 'true';
  },

  async markSetupComplete() {
    const token = localStorage.getItem('asrp-token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    await fetch(`${API_BASE}/auth/setup-complete`, { method: 'POST', credentials: 'include', headers }).catch(() => {});
    localStorage.setItem('asrp-setup-complete', 'true');
  },

  requireAuth() {
    this.getUser().then(user => {
      if (!user) window.location.href = 'login.html';
    });
  },

  requireSetup() {
    if (!this.isSetupComplete()) window.location.href = 'setup.html';
  },

  // Update nav bar based on auth state
  updateNav() {
    this.getUser().then(user => {
      const navLinks = document.querySelector('nav .links');
      if (!navLinks) return;

      // Remove existing auth elements
      navLinks.querySelectorAll('.auth-element').forEach(el => el.remove());

      const langDrop = navLinks.querySelector('.lang-dropdown');

      if (user) {
        const dashLink = document.createElement('a');
        dashLink.href = 'dashboard.html';
        dashLink.textContent = 'Dashboard';
        dashLink.className = 'auth-element';
        if (langDrop) navLinks.insertBefore(dashLink, langDrop);
        else navLinks.appendChild(dashLink);

        const userEl = document.createElement('div');
        userEl.className = 'auth-element';
        userEl.style.cssText = 'display:inline-flex;align-items:center;gap:6px;';
        userEl.innerHTML = `<span style="color:#5a6b5a;font-size:13px">${user.name}</span><button onclick="Auth.logout()" style="padding:4px 10px;background:none;border:1px solid #d4e4d4;border-radius:4px;color:#5a6b5a;font-size:12px;cursor:pointer">Logout</button>`;
        if (langDrop) navLinks.insertBefore(userEl, langDrop);
        else navLinks.appendChild(userEl);
      } else {
        const loginLink = document.createElement('a');
        loginLink.href = 'login.html';
        loginLink.className = 'auth-element';
        loginLink.textContent = 'Login / Sign Up';
        loginLink.style.cssText = 'padding:6px 14px;background:rgba(74,140,106,0.15);color:#4a8c6a;border:1px solid #4a8c6a;border-radius:6px;font-size:13px;font-weight:500;text-decoration:none;white-space:nowrap;';
        if (langDrop) navLinks.insertBefore(loginLink, langDrop);
        else navLinks.appendChild(loginLink);
      }
    });
  }
};

// Update nav on page load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => { Auth.updateNav(); });
}
