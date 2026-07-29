import { API } from "./api.js";
import { initNotesModule, renderNotes } from "./modules/notes/notes.module.js";
import { initPostsModule, renderPosts } from "./modules/posts/posts.module.js";
import {
  initAdminModule,
  renderAdminPanel,
} from "./modules/admin/admin.module.js";
import {
  initProfileModule,
  renderProfile,
} from "./modules/profile/profile.module.js";

let currentUser = JSON.parse(localStorage.getItem("user")) || null;

// DOM Session Elements
const userSession = document.getElementById("user-session");
const userNameEl = document.getElementById("user-name");
const userRoleEl = document.getElementById("user-role");
const logoutBtn = document.getElementById("logout-btn");

const authSection = document.getElementById("auth-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginContainer = document.getElementById("login-container");
const registerContainer = document.getElementById("register-container");
const viewNotes = document.getElementById("view-notes");
const viewPosts = document.getElementById("view-posts");
const viewAdmin = document.getElementById("view-admin");
const viewProfile = document.getElementById("view-profile");

const navTabs = document.getElementById("nav-tabs");
const tabBtnAdmin = document.getElementById("tab-btn-admin");
const showRegisterBtn = document.getElementById("show-register-btn");
const showLoginBtn = document.getElementById("show-login-btn");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

async function initApp() {
  // Module-wise Subscriptions
  if (typeof initNotesModule === "function") initNotesModule();
  if (typeof initPostsModule === "function") initPostsModule();
  if (typeof initAdminModule === "function") initAdminModule();
  if (typeof initProfileModule === "function") initProfileModule();

  // Admin Panel Internal Tab Switching (Users vs Groups)
  setupAdminInternalTabs();

  const token = localStorage.getItem("token");

  if (token) {
    try {
      const res = await API.getProfile();

      if (res && res.success) {
        currentUser = res.data?.user || res.data || currentUser;
        localStorage.setItem("user", JSON.stringify(currentUser));
        updateUIState(true);
        switchTab("view-notes");
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error("App init verification failed:", err);
      handleLogout();
    }
  } else {
    updateUIState(false);
  }
}

function updateUIState(isLoggedIn) {
  if (isLoggedIn && currentUser) {
    authSection?.classList.add("hidden");
    dashboardSection?.classList.remove("hidden");
    userSession?.classList.remove("hidden");
    navTabs?.classList.remove("hidden");

    if (userNameEl)
      userNameEl.innerText = currentUser.name || currentUser.email || "User";
    if (userRoleEl) userRoleEl.innerText = currentUser.role || "user";

    if (currentUser.role === "admin") {
      tabBtnAdmin?.classList.remove("hidden");
    } else {
      tabBtnAdmin?.classList.add("hidden");
      if (viewAdmin && !viewAdmin.classList.contains("hidden")) {
        switchTab("view-notes");
      }
    }
  } else {
    authSection?.classList.remove("hidden");
    if (loginContainer) loginContainer.classList.remove("hidden");
    if (registerContainer) registerContainer.classList.add("hidden");
    dashboardSection?.classList.add("hidden");
    userSession?.classList.add("hidden");
    navTabs?.classList.add("hidden");
  }
}

function handleLogout() {
  if (typeof API.logout === "function") {
    API.logout();
  } else {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  currentUser = null;
  updateUIState(false);
}

function switchTab(targetViewId) {
  const views = [viewNotes, viewPosts, viewAdmin, viewProfile];

  views.forEach((view) => {
    if (view) {
      if (view.id === targetViewId) {
        view.classList.remove("hidden");
      } else {
        view.classList.add("hidden");
      }
    }
  });

  document.querySelectorAll(".nav-tab-btn").forEach((btn) => {
    if (btn.getAttribute("data-target") === targetViewId) {
      btn.classList.add("bg-emerald-600", "text-white");
      btn.classList.remove("text-slate-400");
    } else {
      btn.classList.remove("bg-emerald-600", "text-white");
      btn.classList.add("text-slate-400");
    }
  });

  // Call relevant module render method on view switch
  if (targetViewId === "view-notes" && typeof renderNotes === "function") {
    renderNotes();
  } else if (
    targetViewId === "view-posts" &&
    typeof renderPosts === "function"
  ) {
    renderPosts(1, "all", currentUser);
  } else if (
    targetViewId === "view-profile" &&
    typeof renderProfile === "function"
  ) {
    renderProfile(currentUser);
  } else if (
    targetViewId === "view-admin" &&
    currentUser?.role === "admin" &&
    typeof renderAdminPanel === "function"
  ) {
    renderAdminPanel();
  }
}

// Admin Sub-tabs switching handler (All Users vs Grouped)
function setupAdminInternalTabs() {
  const tabUsersBtn = document.getElementById("tab-users-btn");
  const tabGroupsBtn = document.getElementById("tab-groups-btn");
  const usersViewSection = document.getElementById("users-view-section");
  const groupsViewSection = document.getElementById("groups-view-section");

  tabUsersBtn?.addEventListener("click", () => {
    tabUsersBtn.className =
      "px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white transition-colors";
    tabGroupsBtn.className =
      "px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors";
    usersViewSection?.classList.remove("hidden");
    groupsViewSection?.classList.add("hidden");
  });

  tabGroupsBtn?.addEventListener("click", () => {
    tabGroupsBtn.className =
      "px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white transition-colors";
    tabUsersBtn.className =
      "px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors";
    groupsViewSection?.classList.remove("hidden");
    usersViewSection?.classList.add("hidden");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  showRegisterBtn?.addEventListener("click", () => {
    loginContainer?.classList.add("hidden");
    registerContainer?.classList.remove("hidden");
  });

  showLoginBtn?.addEventListener("click", () => {
    registerContainer?.classList.add("hidden");
    loginContainer?.classList.remove("hidden");
  });

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const credentials = {
      email: document.getElementById("login-email")?.value?.trim(),
      password: document.getElementById("login-password")?.value,
    };

    if (!credentials.email || !credentials.password) {
      alert("Please enter both email and password");
      return;
    }

    try {
      const res = await API.login(credentials);

      if (res && res.success) {
        // Fetch full updated user profile after token authentication
        const profileRes = await API.getProfile();
        currentUser = profileRes?.data?.user ||
          profileRes?.data ||
          res.data?.user || { email: credentials.email, role: "user" };

        localStorage.setItem("user", JSON.stringify(currentUser));
        updateUIState(true);

        // Directly switch to default view
        switchTab("view-notes");
        loginForm.reset();
      } else {
        alert(res?.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert(err.message || "An error occurred during login");
    }
  });

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Parse interests from input
    const rawInterests =
      (
        document.getElementById("reg-interests") ||
        document.getElementById("register-interests")
      )?.value || "";

    const interestsArray = rawInterests
      ? rawInterests
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    const userData = {
      name: (
        document.getElementById("reg-name") ||
        document.getElementById("register-name")
      )?.value?.trim(),
      email: (
        document.getElementById("reg-email") ||
        document.getElementById("register-email")
      )?.value?.trim(),
      password: (
        document.getElementById("reg-password") ||
        document.getElementById("register-password")
      )?.value,
      role: document.getElementById("reg-role")?.value || "user",
      interests: interestsArray,
    };

    if (!userData.email || !userData.password) {
      alert("Please fill out all required fields");
      return;
    }

    try {
      const res = await API.register(userData);

      if (res && res.success) {
        const loginRes = await API.login({
          email: userData.email,
          password: userData.password,
        });

        if (loginRes && loginRes.success) {
          const profileRes = await API.getProfile();
          currentUser = profileRes?.data?.user ||
            profileRes?.data ||
            loginRes.data?.user || {
              email: userData.email,
              role: userData.role,
              interests: interestsArray,
            };

          localStorage.setItem("user", JSON.stringify(currentUser));

          updateUIState(true);
          switchTab("view-notes");
          registerForm.reset();
        } else {
          alert("Registration successful! Please log in.");
          registerForm.reset();
          registerContainer?.classList.add("hidden");
          loginContainer?.classList.remove("hidden");
        }
      } else {
        alert(res?.message || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      alert(err.message || "An error occurred during registration");
    }
  });

  logoutBtn?.addEventListener("click", handleLogout);

  navTabs?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-target]");
    if (btn) {
      const target = btn.getAttribute("data-target");
      switchTab(target);
    }
  });

  // Profile update event trigger handling
  window.addEventListener("userProfileUpdated", (e) => {
    if (e.detail) {
      currentUser = e.detail;
      if (userNameEl) {
        userNameEl.innerText = currentUser.name || currentUser.email || "User";
      }
    }
  });

  initApp();
});
