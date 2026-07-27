import { API } from '../../api.js';
import { escapeHTML } from '../../utils/dom.js';

let currentPostsPage = 1;
let totalPostsPages = 1;
const POSTS_PER_PAGE = 10;

// Filter State ('all' | 'my')
let activeFilter = 'all';

let postForm, postTitleInput, postContentInput, postsList;
let postsPrevBtn, postsNextBtn, postsPageInfoEl;
let filterAllBtn, filterMyBtn;

export function initPostsModule() {
  postForm = document.getElementById('post-form');
  postTitleInput = document.getElementById('post-title');
  postContentInput = document.getElementById('post-content');
  postsList = document.getElementById('posts-list');

  postsPrevBtn = document.getElementById('posts-prev-btn');
  postsNextBtn = document.getElementById('posts-next-btn');
  postsPageInfoEl = document.getElementById('posts-page-info');

  filterAllBtn = document.getElementById('filter-all-posts-btn');
  filterMyBtn = document.getElementById('filter-my-posts-btn');

  setupEventListeners();
}

function setupEventListeners() {
  // Filter Toggle Click Handlers
  filterAllBtn?.addEventListener('click', () => switchPostFilter('all'));
  filterMyBtn?.addEventListener('click', () => switchPostFilter('my'));

  postsPrevBtn?.addEventListener('click', () => {
    if (currentPostsPage > 1 && !postsPrevBtn.disabled) {
      currentPostsPage--;
      renderPosts(currentPostsPage);
    }
  });

  postsNextBtn?.addEventListener('click', () => {
    if (currentPostsPage < totalPostsPages && !postsNextBtn.disabled) {
      currentPostsPage++;
      renderPosts(currentPostsPage);
    }
  });

  // Create Post
  postForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const postData = { 
      title: postTitleInput?.value.trim(),
      content: postContentInput?.value.trim() 
    };

    if (!postData.title || !postData.content) {
      alert('Both title and content are required');
      return;
    }

    const res = await API.createPost(postData);
    if (res.success || res._id || res.id || res.data) {
      postForm.reset();
      currentPostsPage = 1;
      renderPosts(1);
    } else {
      alert(res.message || 'Failed to create post');
    }
  });

  // Delete Post Delegation
  postsList?.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.delete-post-btn');
    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this post?')) {
        const res = await API.deletePost(id);
        if (res && !res.success && res.message) {
          alert(res.message);
        }
        renderPosts(currentPostsPage);
      }
    }
  });
}

// Switch between "All Posts" and "My Posts"
function switchPostFilter(filterType) {
  if (activeFilter === filterType) return;
  
  activeFilter = filterType;
  currentPostsPage = 1;

  // Update UI styles for filter buttons
  if (filterAllBtn && filterMyBtn) {
    if (activeFilter === 'all') {
      filterAllBtn.className = 'post-filter-btn px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white transition-colors';
      filterMyBtn.className = 'post-filter-btn px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors';
    } else {
      filterMyBtn.className = 'post-filter-btn px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white transition-colors';
      filterAllBtn.className = 'post-filter-btn px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors';
    }
  }

  renderPosts(1);
}

export async function renderPosts(targetPage, currentUser) {
  if (!postsList) return;

  if (targetPage !== undefined && targetPage !== null) {
    currentPostsPage = Number(targetPage);
  }

  // Fallback chaining logic for logged in user object
  const activeUser = currentUser || JSON.parse(localStorage.getItem('user') || '{}');
  const userId = activeUser._id || activeUser.id;

  postsList.innerHTML = `<div class="text-center text-slate-400 py-6 text-sm">Loading posts...</div>`;

  try {
    let res;

    // Filter Logic Fix
    if (activeFilter === 'my') {
      if (!userId) {
        postsList.innerHTML = `<p class="text-slate-400 text-sm col-span-full py-4 text-center">Please log in to view your posts.</p>`;
        return;
      }
      // Explicitly calling getPostsForUser
      res = await API.getPostsForUser(userId, currentPostsPage, POSTS_PER_PAGE);
    } else {
      // GET /api/posts
      res = await API.listPosts(currentPostsPage, POSTS_PER_PAGE);
    }

    if (!res.success && res.message) {
      postsList.innerHTML = `<p class="text-red-400 text-sm col-span-full py-4 text-center">${escapeHTML(res.message)}</p>`;
      return;
    }

    // Standardizing backend response payload
    const responseData = res.data || res;
    const posts = responseData.posts || (Array.isArray(responseData) ? responseData : []);
    const meta = responseData.meta || {};

    const totalCount = meta.total || responseData.total || posts.length;
    totalPostsPages = Number(meta.totalPages || responseData.totalPages) || Math.ceil(totalCount / POSTS_PER_PAGE) || 1;

    if (posts.length === 0) {
      const emptyMsg = activeFilter === 'my' 
        ? "You haven't created any posts yet." 
        : `No posts available on page ${currentPostsPage}.`;
        
      postsList.innerHTML = `<p class="text-slate-500 text-sm col-span-full py-4 text-center">${emptyMsg}</p>`;
      updatePostsPaginationUI({ page: currentPostsPage, totalPages: totalPostsPages, hasNextPage: false, hasPrevPage: currentPostsPage > 1 });
      return;
    }

    postsList.innerHTML = posts.map(post => {
      const postId = post._id || post.id;
      
      // Extract author accurately whether string or populated object
      const author = typeof post.author === 'object' ? post.author : {};
      const authorId = author._id || author.id || (typeof post.author === 'string' ? post.author : post.userId);
      const authorName = author.name || (authorId === userId ? (activeUser.name || 'You') : 'User');
      
      const canDelete = activeUser.role === 'admin' || (userId && userId === authorId);

      return `
        <div class="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl flex justify-between items-start mb-3 hover:border-slate-600 transition-colors">
          <div class="flex-1 pr-4">
            <h4 class="font-bold text-white text-sm mb-1">${escapeHTML(post.title || 'Untitled Post')}</h4>
            <p class="text-slate-300 text-xs mb-2 leading-relaxed">${escapeHTML(post.content)}</p>
            <div class="text-[10px] text-slate-500 flex gap-3">
              <span>By: <strong class="text-slate-400">${escapeHTML(authorName)}</strong></span>
              <span>${post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}</span>
            </div>
          </div>
          ${canDelete ? `
            <button data-id="${postId}" class="delete-post-btn text-slate-500 hover:text-red-400 text-xs font-semibold transition-colors">Delete</button>
          ` : ''}
        </div>
      `;
    }).join('');

    updatePostsPaginationUI({
      page: currentPostsPage,
      totalPages: totalPostsPages,
      hasPrevPage: meta.hasPrevPage ?? (currentPostsPage > 1),
      hasNextPage: meta.hasNextPage ?? (currentPostsPage < totalPostsPages)
    });

  } catch (err) {
    console.error('Render posts error:', err);
    postsList.innerHTML = `<p class="text-red-400 text-sm py-4 text-center">Failed to load posts.</p>`;
  }
}

function updatePostsPaginationUI(meta = {}) {
  const page = meta.page || currentPostsPage;
  const total = meta.totalPages || totalPostsPages || 1;
  const hasPrev = meta.hasPrevPage ?? (page > 1);
  const hasNext = meta.hasNextPage ?? (page < total);

  if (postsPageInfoEl) postsPageInfoEl.innerText = `Page ${page} of ${total}`;

  if (postsPrevBtn) {
    postsPrevBtn.disabled = !hasPrev;
    postsPrevBtn.classList.toggle('opacity-50', !hasPrev);
    postsPrevBtn.classList.toggle('cursor-not-allowed', !hasPrev);
  }

  if (postsNextBtn) {
    postsNextBtn.disabled = !hasNext;
    postsNextBtn.classList.toggle('opacity-50', !hasNext);
    postsNextBtn.classList.toggle('cursor-not-allowed', !hasNext);
  }
}