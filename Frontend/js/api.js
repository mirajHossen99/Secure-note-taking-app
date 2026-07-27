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

  async listNotes({ page = 1, limit = 10, userId } = {}) {
    const qs = new URLSearchParams({ page, limit, ...(userId && { userId }) });
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
  async listPosts({ page = 1, limit = 10 } = {}) {
    const qs = new URLSearchParams({ page, limit });
    return request(`/posts?${qs}`);
  },

  async getPostsForUser(userId, { page = 1, limit = 10 } = {}) {
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
  async groupUsersByInterest({ interest, page = 1, limit = 10 } = {}) {
    const qs = new URLSearchParams({
      page,
      limit,
      ...(interest && { interest }),
    });
    return request(`/users/grouped-by-interest?${qs}`);
  },

  async listUsers({ page = 1, limit = 10 } = {}) {
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