// frontend/js/app.js

import { API } from './api.js';

// --- STATE MANAGEMENT ---
let currentUser = null;
let editingNoteId = null;

// --- DOM ELEMENTS ---
// Navigation & Views
const userSession = document.getElementById('user-session');
const userNameEl = document.getElementById('user-name');
const userRoleEl = document.getElementById('user-role');
const logoutBtn = document.getElementById('logout-btn');

const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const adminSection = document.getElementById('admin-section');

// Forms
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const noteForm = document.getElementById('note-form');
const postForm = document.getElementById('post-form');

// Inputs & UI Buttons
const noteTitleInput = document.getElementById('note-title');
const noteContentInput = document.getElementById('note-content');
const noteTagsInput = document.getElementById('note-tags');
const noteSubmitBtn = document.getElementById('note-submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// Lists Containers
const notesList = document.getElementById('notes-list');
const postsList = document.getElementById('posts-list');
const usersList = document.getElementById('users-list');
const groupedUsersList = document.getElementById('grouped-users-list');

// --- INITIALIZATION & SESSION ---

async function initApp() {
  const token = localStorage.getItem('token');
  
  if (token) {
    const res = await API.getProfile();
    if (res.success) {
      // API response structure-er safety check
      currentUser = res.data?.user || res.data;
      updateUIState(true);
      loadDashboardData();
    } else {
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

    if (userNameEl) userNameEl.innerText = currentUser.name || currentUser.email || 'User';
    if (userRoleEl) userRoleEl.innerText = currentUser.role || 'user';

    // Show Admin Section if role is admin
    if (currentUser.role === 'admin') {
      adminSection?.classList.remove('hidden');
    } else {
      adminSection?.classList.add('hidden');
    }
  } else {
    authSection?.classList.remove('hidden');
    dashboardSection?.classList.add('hidden');
    adminSection?.classList.add('hidden');
    userSession?.classList.add('hidden');
  }
}

function handleLogout() {
  API.logout(); // Centralized logout call
  currentUser = null;
  updateUIState(false);
}

// --- DATA LOADERS ---

async function loadDashboardData() {
  renderNotes();
  renderPosts();
  if (currentUser?.role === 'admin') {
    renderUsers();
    renderGroupedUsers();
  }
}

// --- NOTES CONTROLLER ---

async function renderNotes() {
  if (!notesList) return;
  const res = await API.listNotes();

  if (!res.success) {
    notesList.innerHTML = `<p class="text-red-400 text-sm col-span-full">${escapeHTML(res.message)}</p>`;
    return;
  }

  // Handle array response safely
  const notes = Array.isArray(res.data) ? res.data : res.data?.notes || [];
  if (notes.length === 0) {
    notesList.innerHTML = `<p class="text-slate-500 text-sm col-span-full">No notes found. Create one above!</p>`;
    return;
  }

  notesList.innerHTML = notes.map(note => `
    <div class="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-600 transition-colors">
      <div>
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-bold text-white text-base">${escapeHTML(note.title)}</h3>
          <div class="flex gap-2">
            <button data-id="${note._id || note.id}" class="edit-note-btn text-slate-400 hover:text-emerald-400 text-xs font-semibold">Edit</button>
            <button data-id="${note._id || note.id}" class="delete-note-btn text-slate-500 hover:text-red-400 text-xs font-semibold">Delete</button>
          </div>
        </div>
        <p class="text-slate-300 text-sm mb-4 leading-relaxed">${escapeHTML(note.content)}</p>
      </div>
      <div>
        <div class="flex flex-wrap gap-1.5 mb-3">
          ${(note.tags || []).map(t => `<span class="bg-slate-900 border border-slate-700 text-emerald-400 text-[10px] px-2 py-0.5 rounded-md font-mono">${escapeHTML(t)}</span>`).join('')}
        </div>
        <div class="text-[11px] text-slate-500 border-t border-slate-700/40 pt-2 flex justify-between">
          <span>Author: <strong class="text-slate-400">${escapeHTML(note.author?.name || note.user?.name || 'You')}</strong></span>
          <span>${note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Recently'}</span>
        </div>
      </div>
    </div>
  `).join('');

  attachNoteEventListeners();
}

function attachNoteEventListeners() {
  document.querySelectorAll('.delete-note-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this note?')) {
        const res = await API.deleteNote(id);
        if (!res.success) alert(res.message);
        renderNotes();
      }
    });
  });

  document.querySelectorAll('.edit-note-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      const res = await API.getNote(id);
      if (res.success) {
        const note = res.data;
        editingNoteId = note._id || note.id;
        if (noteTitleInput) noteTitleInput.value = note.title || '';
        if (noteContentInput) noteContentInput.value = note.content || '';
        if (noteTagsInput) noteTagsInput.value = (note.tags || []).join(', ');
        
        if (noteSubmitBtn) noteSubmitBtn.innerText = 'Update Note';
        if (cancelEditBtn) cancelEditBtn.classList.remove('hidden');
      }
    });
  });
}

function resetNoteForm() {
  editingNoteId = null;
  if (noteForm) noteForm.reset();
  if (noteSubmitBtn) noteSubmitBtn.innerText = 'Save Note';
  if (cancelEditBtn) cancelEditBtn.classList.add('hidden');
}

// --- POSTS CONTROLLER ---

async function renderPosts() {
  if (!postsList) return;
  const res = await API.listPosts();

  if (!res.success) {
    postsList.innerHTML = `<p class="text-red-400 text-sm col-span-full">${escapeHTML(res.message)}</p>`;
    return;
  }

  const posts = Array.isArray(res.data) ? res.data : res.data?.posts || [];
  if (posts.length === 0) {
    postsList.innerHTML = `<p class="text-slate-500 text-sm col-span-full">No posts available.</p>`;
    return;
  }

  postsList.innerHTML = posts.map(post => {
    const postId = post._id || post.id;
    const authorId = post.user?._id || post.user?.id || post.userId;
    const canDelete = currentUser?.role === 'admin' || (currentUser && (currentUser._id === authorId || currentUser.id === authorId));

    return `
      <div class="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl flex justify-between items-start">
        <div>
          <p class="text-slate-200 text-sm">${escapeHTML(post.content || post.title)}</p>
          <span class="text-[11px] text-slate-500">By: ${escapeHTML(post.user?.name || 'User')}</span>
        </div>
        ${canDelete ? `
          <button data-id="${postId}" class="delete-post-btn text-slate-500 hover:text-red-400 text-xs font-semibold">Delete</button>
        ` : ''}
      </div>
    `;
  }).join('');

  document.querySelectorAll('.delete-post-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      await API.deletePost(id);
      renderPosts();
    });
  });
}

// --- ADMIN CONTROLLER ---

async function renderUsers() {
  if (!usersList) return;
  const res = await API.listUsers();
  if (!res.success) return;

  const users = Array.isArray(res.data) ? res.data : res.data?.users || [];

  usersList.innerHTML = users.map(user => `
    <tr class="border-b border-slate-700/50 text-xs text-slate-300">
      <td class="py-2 px-3">${escapeHTML(user.name)}</td>
      <td class="py-2 px-3">${escapeHTML(user.email)}</td>
      <td class="py-2 px-3 font-mono text-emerald-400">${user.role}</td>
      <td class="py-2 px-3 text-right">
        <button data-id="${user._id || user.id}" class="delete-user-btn text-red-400 hover:underline">Delete</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this user?')) {
        await API.deleteUser(id);
        renderUsers();
      }
    });
  });
}

async function renderGroupedUsers() {
  if (!groupedUsersList) return;
  const res = await API.groupUsersByInterest();
  if (!res.success) return;

  groupedUsersList.innerHTML = `<pre class="text-xs text-emerald-400 font-mono overflow-x-auto">${escapeHTML(JSON.stringify(res.data, null, 2))}</pre>`;
}

// --- EVENT LISTENERS ---

// Auth Handlers
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const credentials = {
    email: document.getElementById('login-email').value,
    password: document.getElementById('login-password').value
  };

  const res = await API.login(credentials);
  
  if (res.success) {
    // Fresh profile fetch logic (Token is already saved inside API.login)
    const profileRes = await API.getProfile();
    if (profileRes.success) {
      currentUser = profileRes.data?.user || profileRes.data;
      updateUIState(true);
      loadDashboardData();
      loginForm.reset();
    } else {
      alert('Failed to load profile details.');
    }
  } else {
    alert(res.message);
  }
});

registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userData = {
    name: document.getElementById('reg-name').value,
    email: document.getElementById('reg-email').value,
    password: document.getElementById('reg-password').value,
    role: document.getElementById('reg-role')?.value || 'user'
  };
  const res = await API.register(userData);
  alert(res.message || 'Registration successful!');
  if (res.success) registerForm.reset();
});

logoutBtn?.addEventListener('click', handleLogout);

// Note Form Handler (Create + Update)
noteForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const noteData = {
    title: noteTitleInput.value,
    content: noteContentInput.value,
    tags: noteTagsInput.value.split(',').map(t => t.trim()).filter(Boolean)
  };

  let res;
  if (editingNoteId) {
    res = await API.updateNote(editingNoteId, noteData);
  } else {
    res = await API.createNote(noteData);
  }

  if (res.success) {
    resetNoteForm();
    renderNotes();
  } else {
    alert(res.message);
  }
});

cancelEditBtn?.addEventListener('click', resetNoteForm);

// Post Form Handler
postForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const postData = {
    content: document.getElementById('post-content').value
  };
  const res = await API.createPost(postData);
  if (res.success) {
    postForm.reset();
    renderPosts();
  } else {
    alert(res.message);
  }
});

// --- HELPER UTILS ---
function escapeHTML(str = '') {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Start App
initApp();