import { API } from './api.js';
import { initNotesModule, renderNotes } from './modules/notes/notes.module.js';
import { initPostsModule, renderPosts } from './modules/posts/posts.module.js';
import { initAdminModule, renderAdminPanel } from './modules/admin/admin.module.js';

let currentUser = JSON.parse(localStorage.getItem('user')) || null;

// DOM Session Elements
const userSession = document.getElementById('user-session');
const userNameEl = document.getElementById('user-name');
const userRoleEl = document.getElementById('user-role');
const logoutBtn = document.getElementById('logout-btn');

const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginContainer = document.getElementById('login-container');
const registerContainer = document.getElementById('register-container');
const viewNotes = document.getElementById('view-notes');
const viewPosts = document.getElementById('view-posts');
const viewAdmin = document.getElementById('view-admin');

const navTabs = document.getElementById('nav-tabs');
const tabBtnAdmin = document.getElementById('tab-btn-admin');
const showRegisterBtn = document.getElementById('show-register-btn');
const showLoginBtn = document.getElementById('show-login-btn');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

async function initApp() {
  // Module-wise Subscriptions
  initNotesModule();
  initPostsModule();
  initAdminModule();

  // Admin Panel Internal Tab Switching (Users vs Groups)
  setupAdminInternalTabs();

  const token = localStorage.getItem('token');
  
  if (token) {
    try {
      let res = { success: true, data: currentUser };
      if (typeof API.getProfile === 'function') {
        res = await API.getProfile();
      }
      
      if (res?.success || res?.user || res?.data) {
        currentUser = res.data?.user || res.user || res.data || currentUser;
        localStorage.setItem('user', JSON.stringify(currentUser));
        updateUIState(true);
        loadDashboardData();
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error('App init verification failed:', err);
      handleLogout();
    }
  } else {
    updateUIState(false);
  }
}

function updateUIState(isLoggedIn) {
  if (isLoggedIn && currentUser) {
    authSection?.classList.add('hidden');
    dashboardSection?.classList.remove('hidden');
    userSession?.classList.remove('hidden');
    navTabs?.classList.remove('hidden');

    if (userNameEl) userNameEl.innerText = currentUser.name || currentUser.email || 'User';
    if (userRoleEl) userRoleEl.innerText = currentUser.role || 'user';

    if (currentUser.role === 'admin') {
      tabBtnAdmin?.classList.remove('hidden');
    } else {
      tabBtnAdmin?.classList.add('hidden');
      if (viewAdmin && !viewAdmin.classList.contains('hidden')) {
        switchTab('view-notes');
      }
    }
  } else {
    authSection?.classList.remove('hidden');
    if (loginContainer) loginContainer.classList.remove('hidden');
    if (registerContainer) registerContainer.classList.add('hidden');
    dashboardSection?.classList.add('hidden');
    userSession?.classList.add('hidden');
    navTabs?.classList.add('hidden');
  }
}

function handleLogout() {
  if (typeof API.logout === 'function') API.logout();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  updateUIState(false);
}

function switchTab(targetViewId) {
  const views = [viewNotes, viewPosts, viewAdmin];
  views.forEach(view => {
    if (view) {
      if (view.id === targetViewId) view.classList.remove('hidden');
      else view.classList.add('hidden');
    }
  });

  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    if (btn.getAttribute('data-target') === targetViewId) {
      btn.classList.add('bg-emerald-600', 'text-white');
      btn.classList.remove('text-slate-400');
    } else {
      btn.classList.remove('bg-emerald-600', 'text-white');
      btn.classList.add('text-slate-400');
    }
  });

  if (targetViewId === 'view-notes') renderNotes();
  else if (targetViewId === 'view-posts') renderPosts(undefined, currentUser);
  else if (targetViewId === 'view-admin' && currentUser?.role === 'admin') renderAdminPanel();
}

// Admin Sub-tabs switching handler (All Users vs Grouped)
function setupAdminInternalTabs() {
  const tabUsersBtn = document.getElementById('tab-users-btn');
  const tabGroupsBtn = document.getElementById('tab-groups-btn');
  const usersViewSection = document.getElementById('users-view-section');
  const groupsViewSection = document.getElementById('groups-view-section');

  tabUsersBtn?.addEventListener('click', () => {
    tabUsersBtn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white transition-colors';
    tabGroupsBtn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors';
    usersViewSection?.classList.remove('hidden');
    groupsViewSection?.classList.add('hidden');
  });

  tabGroupsBtn?.addEventListener('click', () => {
    tabGroupsBtn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white transition-colors';
    tabUsersBtn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors';
    groupsViewSection?.classList.remove('hidden');
    usersViewSection?.classList.add('hidden');
  });
}

function loadDashboardData() {
  renderNotes();
  renderPosts(undefined, currentUser);
  if (currentUser?.role === 'admin') {
    renderAdminPanel();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  showRegisterBtn?.addEventListener('click', () => {
    loginContainer?.classList.add('hidden');
    registerContainer?.classList.remove('hidden');
  });

  showLoginBtn?.addEventListener('click', () => {
    registerContainer?.classList.add('hidden');
    loginContainer?.classList.remove('hidden');
  });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const credentials = {
      email: document.getElementById('login-email')?.value,
      password: document.getElementById('login-password')?.value
    };

    try {
      const res = await API.login(credentials);
      const token = res?.token || res?.data?.token;

      if (res?.success || token) {
        if (token) localStorage.setItem('token', token);
        const profileRes = (typeof API.getProfile === 'function') ? await API.getProfile() : null;
        currentUser = profileRes?.data?.user || profileRes?.data || res.user || res.data?.user || { email: credentials.email, role: 'user' };
        localStorage.setItem('user', JSON.stringify(currentUser));
        updateUIState(true);
        loadDashboardData();
        loginForm.reset();
      } else {
        alert(res?.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert(err.response?.data?.message || err.message || 'An error occurred during login');
    }
  });

  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userData = {
      name: (document.getElementById('reg-name') || document.getElementById('register-name'))?.value,
      email: (document.getElementById('reg-email') || document.getElementById('register-email'))?.value,
      password: (document.getElementById('reg-password') || document.getElementById('register-password'))?.value,
      role: document.getElementById('reg-role')?.value || 'user'
    };

    try {
      const res = await API.register(userData);
      if (res?.success || res?.token) {
        alert('Registration successful! Please login.');
        registerForm.reset();
        registerContainer?.classList.add('hidden');
        loginContainer?.classList.remove('hidden');
      } else {
        alert(res?.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      alert(err.response?.data?.message || err.message || 'An error occurred during registration');
    }
  });

  logoutBtn?.addEventListener('click', handleLogout);

  navTabs?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-target]');
    if (btn) switchTab(btn.getAttribute('data-target'));
  });

  initApp();
});