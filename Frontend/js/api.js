// frontend/js/api.js

const BASE_URL = 'http://localhost:5000/api';

function getHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function request(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getHeaders(),
        ...(options.headers || {}),
      },
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
      }
      return {
        success: false,
        status: response.status,
        message: body.message || body.error || `Request failed (${response.status})`,
      };
    }

    return {
      success: true,
      data: body.data || body,
      meta: body.meta || null,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Network Error / Server unreachable",
    };
  }
}

export const API = {
  // ---------------- AUTH ----------------
  async register(userData) {
    const res = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    if (res.success && res.data?.token) {
      localStorage.setItem("token", res.data.token);
    }
    return res;
  },

  async login(credentials) {
    const res = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    const token = res.data?.token || res.data?.accessToken;
    if (res.success && token) {
      localStorage.setItem("token", token);
    }
    return res;
  },

  logout() {
    localStorage.removeItem("token");
  },

  async getProfile() {
    return request("/auth/me");
  },

  // ---------------- NOTES ----------------
  async createNote(noteData) {
    return request("/notes", {
      method: "POST",
      body: JSON.stringify(noteData),
    });
  },

  /**
   * Supports both signature styles:
   * 1. API.listNotes(currentPage, NOTES_PER_PAGE)
   * 2. API.listNotes({ page: 2, limit: 10, userId: '...' })
   */
  async listNotes(pageOrOptions = 1, limitArg = 10) {
    let page = 1;
    let limit = 10;
    let userId;

    if (typeof pageOrOptions === 'object' && pageOrOptions !== null) {
      page = pageOrOptions.page || 1;
      limit = pageOrOptions.limit || 10;
      userId = pageOrOptions.userId;
    } else {
      page = pageOrOptions || 1;
      limit = limitArg || 10;
    }

    const queryObj = { page, limit };
    if (userId) queryObj.userId = userId;

    const qs = new URLSearchParams(queryObj);
    return request(`/notes?${qs}`);
  },

  async getNote(id) {
    return request(`/notes/${id}`);
  },

  async updateNote(id, noteData) {
    return request(`/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(noteData),
    });
  },

  async deleteNote(id) {
    return request(`/notes/${id}`, { method: "DELETE" });
  },

  // ---------------- POSTS ----------------
  async listPosts(pageOrOptions = 1, limitArg = 10) {
    let page = 1;
    let limit = 10;

    if (typeof pageOrOptions === 'object' && pageOrOptions !== null) {
      page = pageOrOptions.page || 1;
      limit = pageOrOptions.limit || 10;
    } else {
      page = pageOrOptions || 1;
      limit = limitArg || 10;
    }

    const qs = new URLSearchParams({ page, limit });
    return request(`/posts?${qs}`);
  },

  async getPostsForUser(userId, pageOrOptions = 1, limitArg = 10) {
    let page = 1;
    let limit = 10;

    if (typeof pageOrOptions === 'object' && pageOrOptions !== null) {
      page = pageOrOptions.page || 1;
      limit = pageOrOptions.limit || 10;
    } else {
      page = pageOrOptions || 1;
      limit = limitArg || 10;
    }

    const qs = new URLSearchParams({ page, limit });
    return request(`/posts/user/${userId}?${qs}`);
  },

  async createPost(postData) {
    return request("/posts", {
      method: "POST",
      body: JSON.stringify(postData),
    });
  },

  async deletePost(id) {
    return request(`/posts/${id}`, { method: "DELETE" });
  },

  // ---------------- USERS (admin) ----------------
  async groupUsersByInterest(options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const interest = options.interest;

    const qs = new URLSearchParams({
      page,
      limit,
      ...(interest && { interest }),
    });
    return request(`/users/grouped-by-interest?${qs}`);
  },

  async listUsers(pageOrOptions = 1, limitArg = 10) {
    let page = 1;
    let limit = 10;

    if (typeof pageOrOptions === 'object' && pageOrOptions !== null) {
      page = pageOrOptions.page || 1;
      limit = pageOrOptions.limit || 10;
    } else {
      page = pageOrOptions || 1;
      limit = limitArg || 10;
    }

    const qs = new URLSearchParams({ page, limit });
    return request(`/users?${qs}`);
  },

  async getUser(id) {
    return request(`/users/${id}`);
  },

  async createUser(userData) {
    return request("/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  async updateUser(id, userData) {
    return request(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(userData),
    });
  },

  async deleteUser(id) {
    return request(`/users/${id}`, { method: "DELETE" });
  },
};