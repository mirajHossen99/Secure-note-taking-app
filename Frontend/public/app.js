const API_BASE_URL = 'http://localhost:5000/api';

const state = {
  token: localStorage.getItem('token') || null,
  user: null,
  notesPage: 1,
  postsPage: 1,
  usersPage: 1,
};

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const headers = { 
    'Content-Type': 'application/json', 
    ...(options.headers || {}) 
  };
  
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || data.error || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    throw err;
  }
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

async function refreshMe() {
  if (!state.token) return;
  try {
    const res = await api('/auth/me');
    state.user = res.user || res.data || res;
    if (!state.user || !state.user._id) {
      throw new Error('Invalid user payload');
    }
  } catch (err) {
    console.warn('Session expired or invalid token:', err.message);
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
  }
}

function renderAuthState() {
  const loggedIn = !!(state.token && state.user);

  if ($('authSection')) $('authSection').classList.toggle('hidden', loggedIn);
  if ($('appSection')) $('appSection').classList.toggle('hidden', !loggedIn);
  
  const isAdmin = loggedIn && (state.user?.role === 'admin');
  if ($('adminSection')) $('adminSection').classList.toggle('hidden', !isAdmin);

  if ($('whoami')) {
    $('whoami').textContent = loggedIn
      ? `Logged in as ${state.user.name || state.user.email} (${state.user.role || 'user'}) — id: ${state.user._id}`
      : '';
  }

  if ($('noteScope')) {
    $('noteScope').textContent = isAdmin ? '(all users — admin view)' : '(yours)';
  }
}

async function loadNotes(page = state.notesPage) {
  state.notesPage = page;
  try {
    const data = await api(`/notes?page=${page}&limit=10`);
    const notes = data.notes || data.data || [];
    const meta = data.meta || { page: page, totalPages: 1 };
    const myId = state.user?._id;

    if ($('notesList')) {
      $('notesList').innerHTML = notes.length
        ? notes.map((n) => {
            const ownerId = n.owner?._id || n.owner || n.userId;
            const canEdit = String(ownerId) === String(myId) || state.user?.role === 'admin';
            return `
              <div class="row" data-id="${n._id}">
                <strong>${escapeHtml(n.title)}</strong>
                ${n.owner?.name ? `<span class="muted"> — ${escapeHtml(n.owner.name)}</span>` : ''}
                <div>${escapeHtml(n.content || '')}</div>
                ${canEdit 
                  ? '<button type="button" class="editNoteBtn">Edit</button><button type="button" class="deleteNoteBtn">Delete</button>' 
                  : '<span class="muted">(view only)</span>'}
              </div>`;
          }).join('')
        : '<p class="muted">No notes yet.</p>';
    }

    if ($('notesPager')) {
      $('notesPager').innerHTML = `Page ${meta.page} / ${meta.totalPages || 1}
        <button type="button" id="notesPrev" ${meta.page <= 1 ? 'disabled' : ''}>Prev</button>
        <button type="button" id="notesNext" ${meta.page >= (meta.totalPages || 1) ? 'disabled' : ''}>Next</button>`;

      $('notesPrev')?.addEventListener('click', () => loadNotes(meta.page - 1));
      $('notesNext')?.addEventListener('click', () => loadNotes(meta.page + 1));
    }

    document.querySelectorAll('.deleteNoteBtn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('.row').dataset.id;
        try {
          await api(`/notes/${id}`, { method: 'DELETE' });
          await loadNotes(state.notesPage);
        } catch (err) {
          alert(err.message);
        }
      });
    });

    document.querySelectorAll('.editNoteBtn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const row = e.target.closest('.row');
        const newTitle = prompt('New title:');
        if (newTitle === null || !newTitle.trim()) return;
        try {
          await api(`/notes/${row.dataset.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ title: newTitle.trim() }),
          });
          await loadNotes(state.notesPage);
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    if ($('notesList')) $('notesList').innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
}

async function loadPosts(page = state.postsPage) {
  state.postsPage = page;
  try {
    const data = await api(`/posts?page=${page}&limit=10`);
    const posts = data.posts || data.data || [];
    const meta = data.meta || { page: page, totalPages: 1 };

    if ($('postsList')) {
      $('postsList').innerHTML = posts.length
        ? posts.map((p) => `
            <div class="row">
              <strong>${escapeHtml(p.title)}</strong>
              <span class="muted"> — ${escapeHtml(p.author?.name || 'unknown')}</span>
              <div>${escapeHtml(p.content || '')}</div>
            </div>`).join('')
        : '<p class="muted">No posts yet.</p>';
    }

    if ($('postsPager')) {
      $('postsPager').innerHTML = `Page ${meta.page} / ${meta.totalPages || 1}
        <button type="button" id="postsPrev" ${meta.page <= 1 ? 'disabled' : ''}>Prev</button>
        <button type="button" id="postsNext" ${meta.page >= (meta.totalPages || 1) ? 'disabled' : ''}>Next</button>`;

      $('postsPrev')?.addEventListener('click', () => loadPosts(meta.page - 1));
      $('postsNext')?.addEventListener('click', () => loadPosts(meta.page + 1));
    }
  } catch (err) {
    if ($('postsList')) $('postsList').innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
}

async function loadUsers(page = state.usersPage) {
  if (state.user?.role !== 'admin') return;
  state.usersPage = page;
  try {
    const data = await api(`/users?page=${page}&limit=10`);
    const users = data.users || data.data || [];
    const meta = data.meta || { page: page, totalPages: 1 };

    if ($('usersList')) {
      $('usersList').innerHTML = users.length
        ? users.map((u) => `
            <div class="row" data-id="${u._id}">
              <strong>${escapeHtml(u.name)}</strong> (${escapeHtml(u.role)}) — ${escapeHtml(u.email)}
              <div class="muted">interests: ${(u.interests || []).map(escapeHtml).join(', ') || 'none'} | id: ${u._id}</div>
              <button type="button" class="promoteBtn">${u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}</button>
              <button type="button" class="deleteUserBtn">Delete</button>
            </div>`).join('')
        : '<p class="muted">No users found.</p>';
    }

    if ($('usersPager')) {
      $('usersPager').innerHTML = `Page ${meta.page} / ${meta.totalPages || 1}
        <button type="button" id="usersPrev" ${meta.page <= 1 ? 'disabled' : ''}>Prev</button>
        <button type="button" id="usersNext" ${meta.page >= (meta.totalPages || 1) ? 'disabled' : ''}>Next</button>`;

      $('usersPrev')?.addEventListener('click', () => loadUsers(meta.page - 1));
      $('usersNext')?.addEventListener('click', () => loadUsers(meta.page + 1));
    }

    document.querySelectorAll('.promoteBtn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('.row').dataset.id;
        const currentlyAdmin = e.target.textContent.includes('Demote');
        try {
          await api(`/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ role: currentlyAdmin ? 'user' : 'admin' }),
          });
          await loadUsers(state.usersPage);
        } catch (err) {
          alert(err.message);
        }
      });
    });

    document.querySelectorAll('.deleteUserBtn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('.row').dataset.id;
        if (!confirm('Delete this user?')) return;
        try {
          await api(`/users/${id}`, { method: 'DELETE' });
          await loadUsers(state.usersPage);
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    if ($('usersList')) $('usersList').innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
}

function initEventListeners() {
  $('loginBtn')?.addEventListener('click', async () => {
    if ($('loginError')) $('loginError').textContent = '';
    try {
      const res = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: $('loginEmail').value,
          password: $('loginPassword').value,
        }),
      });

      const token = res.token || res.accessToken;
      const user = res.user || res.data;

      if (!token) throw new Error('Token missing from server response');

      state.token = token;
      state.user = user;
      localStorage.setItem('token', token);
      await boot();
    } catch (err) {
      if ($('loginError')) $('loginError').textContent = err.message;
    }
  });

  $('regBtn')?.addEventListener('click', async () => {
    if ($('regError')) $('regError').textContent = '';
    try {
      const interests = $('regInterests').value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: $('regName').value,
          email: $('regEmail').value,
          password: $('regPassword').value,
          interests,
        }),
      });

      const token = res.token || res.accessToken;
      const user = res.user || res.data;

      if (!token) throw new Error('Registration succeeded, but token was not returned.');

      state.token = token;
      state.user = user;
      localStorage.setItem('token', token);
      await boot();
    } catch (err) {
      if ($('regError')) $('regError').textContent = err.message;
    }
  });

  $('logoutBtn')?.addEventListener('click', () => {
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    renderAuthState();
  });

  $('createNoteBtn')?.addEventListener('click', async () => {
    const title = $('noteTitle').value.trim();
    if (!title) return;
    try {
      await api('/notes', {
        method: 'POST',
        body: JSON.stringify({ title, content: $('noteContent').value }),
      });
      $('noteTitle').value = '';
      $('noteContent').value = '';
      await loadNotes(1);
    } catch (err) {
      alert(err.message);
    }
  });

  $('createPostBtn')?.addEventListener('click', async () => {
    const title = $('postTitle').value.trim();
    if (!title) return;
    try {
      await api('/posts', {
        method: 'POST',
        body: JSON.stringify({ title, content: $('postContent').value }),
      });
      $('postTitle').value = '';
      $('postContent').value = '';
      await loadPosts(1);
    } catch (err) {
      alert(err.message);
    }
  });

  $('lookupBtn')?.addEventListener('click', async () => {
    const userId = $('lookupUserId').value.trim() || state.user?._id;
    if (!userId) return;
    try {
      const res = await api(`/posts/user/${userId}`);
      const user = res.user || res;
      $('lookupResult').innerHTML = `
        <strong>${escapeHtml(user.name)}</strong> (${escapeHtml(user.email)})
        <ul>${(user.posts || []).map((p) => `<li>${escapeHtml(p.title)}</li>`).join('') || '<li class="muted">No posts</li>'}</ul>`;
    } catch (err) {
      $('lookupResult').innerHTML = `<span class="error">${escapeHtml(err.message)}</span>`;
    }
  });

  $('createUserBtn')?.addEventListener('click', async () => {
    if ($('createUserError')) $('createUserError').textContent = '';
    try {
      const interests = $('newUserInterests').value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await api('/users', {
        method: 'POST',
        body: JSON.stringify({
          name: $('newUserName').value,
          email: $('newUserEmail').value,
          password: $('newUserPassword').value,
          interests,
          role: $('newUserAdmin').checked ? 'admin' : 'user',
        }),
      });
      $('newUserName').value = '';
      $('newUserEmail').value = '';
      $('newUserPassword').value = '';
      $('newUserInterests').value = '';
      $('newUserAdmin').checked = false;
      await loadUsers(1);
    } catch (err) {
      if ($('createUserError')) $('createUserError').textContent = err.message;
    }
  });

  $('groupBtn')?.addEventListener('click', async () => {
    const interest = $('interestFilter').value.trim();
    const qs = interest ? `?interest=${encodeURIComponent(interest)}` : '';
    try {
      const res = await api(`/users/grouped-by-interest${qs}`);
      const groups = res.groups || res.data || [];
      $('groupsList').innerHTML = groups.length
        ? groups.map((g) => `
            <div class="row">
              <strong>${escapeHtml(g.interest)}</strong> (${g.count})
              <ul>${g.users.map((u) => `<li>${escapeHtml(u.name)} — ${escapeHtml(u.email)}</li>`).join('')}</ul>
            </div>`).join('')
        : '<p class="muted">No groups found.</p>';
    } catch (err) {
      $('groupsList').innerHTML = `<span class="error">${escapeHtml(err.message)}</span>`;
    }
  });
}

async function boot() {
  await refreshMe();
  renderAuthState();
  if (state.token && state.user) {
    if ($('lookupUserId')) $('lookupUserId').value = state.user._id || '';
    await loadNotes(1);
    await loadPosts(1);
    if (state.user.role === 'admin') await loadUsers(1);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  boot();
});