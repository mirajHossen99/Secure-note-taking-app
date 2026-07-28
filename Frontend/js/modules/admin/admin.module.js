import { API } from "../../api.js";

// Internal State Management for Admin Panel
let state = {
  usersPage: 1,
  usersLimit: 5,
  groupsPage: 1,
  groupsLimit: 5,
  groupInterestSearch: "",
  editingUserId: null,
};

// Target DOM Elements
const usersList = document.getElementById("users-list");
const usersPagination = document.getElementById("users-pagination");
const groupedUsersList = document.getElementById("grouped-users-list");
const groupsPaginationContainer = document.getElementById(
  "groups-pagination-container",
);

const groupSearchInput = document.getElementById("group-search-input");
const groupSearchBtn = document.getElementById("group-search-btn");

const userModal = document.getElementById("user-modal");
const userModalTitle = document.getElementById("user-modal-title");
const userForm = document.getElementById("user-form");
const openCreateUserBtn = document.getElementById("open-create-user-btn");
const closeUserModalBtn = document.getElementById("close-user-modal");
const closeUserModalX = document.getElementById("close-user-modal-x");

// Form Input Elements
const userNameInput = document.getElementById("user-name-input");
const userEmailInput = document.getElementById("user-email-input");
const userPasswordInput = document.getElementById("user-password-input");
const userRoleSelect = document.getElementById("user-role-select");
const userInterestsInput = document.getElementById("user-interests-input");

/**
 * Initialize Admin Module Event Listeners
 */
export function initAdminModule() {
  // Modal Trigger Handlers
  openCreateUserBtn?.addEventListener("click", () => openUserModal());
  closeUserModalBtn?.addEventListener("click", closeUserModal);
  closeUserModalX?.addEventListener("click", closeUserModal);

  // User Create / Update Form Submit Handler
  userForm?.addEventListener("submit", handleUserFormSubmit);

  // Grouped Interest Search Handlers
  groupSearchBtn?.addEventListener("click", () => {
    state.groupInterestSearch = groupSearchInput?.value?.trim() || "";
    state.groupsPage = 1; // Reset to page 1 on new search
    renderGroupedUsers();
  });

  groupSearchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      state.groupInterestSearch = groupSearchInput.value.trim();
      state.groupsPage = 1;
      renderGroupedUsers();
    }
  });

  // Table Action Event Delegation (Edit/Delete)
  usersList?.addEventListener("click", handleUserActions);
}

/**
 * Render Main Admin Panel Views
 */
export async function renderAdminPanel() {
  await Promise.all([renderUsers(), renderGroupedUsers()]);
}

/**
 * 1. FETCH & RENDER ALL USERS TABLE
 */
export async function renderUsers() {
  if (!usersList) return;

  usersList.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400 text-xs">Loading users...</td></tr>`;

  const res = await API.listUsers({
    page: state.usersPage,
    limit: state.usersLimit,
  });

  if (!res.success) {
    usersList.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-red-400 text-xs">${res.message}</td></tr>`;
    return;
  }

  const users = Array.isArray(res.data) ? res.data : res.data?.users || [];
  const meta = res.meta || res.data?.meta || {};

  if (users.length === 0) {
    usersList.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400 text-xs">No users found.</td></tr>`;
    if (usersPagination) usersPagination.innerHTML = "";
    return;
  }

  usersList.innerHTML = users
    .map((user, index) => {
      const interestsArray = Array.isArray(user.interests)
        ? user.interests
        : typeof user.interests === "string" && user.interests.length > 0
          ? user.interests.split(",").map((s) => s.trim())
          : [];

      const interestsBadges =
        interestsArray.length > 0
          ? interestsArray
              .map(
                (interest) =>
                  `<span class="inline-block bg-slate-800 text-emerald-400 border border-slate-700 text-[10px] px-2 py-0.5 rounded-md font-mono mr-1 mb-1">${interest}</span>`,
              )
              .join("")
          : `<span class="text-slate-500 text-xs italic">None</span>`;

      const formattedDate = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "N/A";

      const rowNum = (state.usersPage - 1) * state.usersLimit + index + 1;

      return `
        <tr class="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors text-xs text-slate-300">
          <td class="py-3 px-4 font-mono text-slate-500">${rowNum}</td>
          <td class="py-3 px-4 font-medium text-white">${user.name || "N/A"}</td>
          <td class="py-3 px-4 text-slate-400">${user.email}</td>
          <td class="py-3 px-4 text-slate-400 font-mono">${formattedDate}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
              user.role === "admin"
                ? "bg-purple-950/60 text-purple-400 border border-purple-800/50"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }">
              ${user.role}
            </span>
          </td>
          <td class="py-3 px-4 max-w-xs">${interestsBadges}</td>
          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end gap-2">
              <button data-action="edit" data-id="${user._id || user.id}" class="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors">
                Edit
              </button>
              <button data-action="delete" data-id="${user._id || user.id}" class="px-2.5 py-1 text-xs bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded-lg transition-colors">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  renderUsersPaginationControls(meta);
}

/**
 * 2. FETCH & RENDER GROUPED BY INTEREST TABLE
 */
export async function renderGroupedUsers() {
  if (!groupedUsersList) return;

  groupedUsersList.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400 text-xs">Loading interest groups...</td></tr>`;

  const res = await API.groupUsersByInterest({
    page: state.groupsPage,
    limit: state.groupsLimit,
    interest: state.groupInterestSearch,
  });

  if (!res.success) {
    groupedUsersList.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-red-400 text-xs">${res.message}</td></tr>`;
    return;
  }

  const groups = Array.isArray(res.data) ? res.data : res.data?.groups || [];
  const meta = res.meta || res.data?.meta || {};

  if (groups.length === 0) {
    groupedUsersList.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400 text-xs">No groups found matching your search.</td></tr>`;
    if (groupsPaginationContainer) groupsPaginationContainer.innerHTML = "";
    return;
  }

  groupedUsersList.innerHTML = groups
    .map((group, index) => {
      const rowNum = (state.groupsPage - 1) * state.groupsLimit + index + 1;
      const userCount = group.count || group.users?.length || 0;

      const userPills = Array.isArray(group.users)
        ? group.users
            .map(
              (u) =>
                `<span class="inline-flex items-center gap-1 bg-slate-800/90 text-slate-300 border border-slate-700 text-[11px] px-2 py-1 rounded-lg mr-1.5 mb-1.5">
                  <span class="font-medium text-white">${u.name || "User"}</span>
                  <span class="text-slate-500 font-mono text-[10px]">(${u.email})</span>
                </span>`,
            )
            .join("")
        : `<span class="text-slate-500 text-xs">No users</span>`;

      return `
        <tr class="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors text-xs text-slate-300">
          <td class="py-3.5 px-4 font-mono text-slate-500">${rowNum}</td>
          <td class="py-3.5 px-4">
            <span class="inline-block bg-emerald-950/60 text-emerald-400 font-mono font-semibold border border-emerald-800/50 px-2.5 py-1 rounded-lg text-xs">
              ${group._id || group.interest || "Uncategorized"}
            </span>
          </td>
          <td class="py-3.5 px-4 font-mono font-semibold text-white">${userCount}</td>
          <td class="py-3.5 px-4 max-w-md">${userPills}</td>
          <td class="py-3.5 px-4 text-right">
            <button data-interest="${group._id || group.interest}" class="filter-interest-btn px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors">
              Filter
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  renderGroupsPaginationControls(meta);
}

/**
 * Pagination Controls Generator for All Users Table
 */
function renderUsersPaginationControls(meta) {
  if (!usersPagination) return;

  const totalPages = meta.totalPages || 1;
  const currentPage = meta.page || state.usersPage;

  usersPagination.innerHTML = `
    <div class="flex items-center justify-between w-full pt-2">
      <span class="text-xs text-slate-400 font-mono">Page ${currentPage} of ${totalPages}</span>
      <div class="flex gap-2">
        <button id="users-prev-btn" ${currentPage <= 1 ? "disabled" : ""} 
          class="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-xs px-3.5 py-1.5 rounded-lg border border-slate-700 transition-colors">
          Previous
        </button>
        <button id="users-next-btn" ${currentPage >= totalPages ? "disabled" : ""} 
          class="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-xs px-3.5 py-1.5 rounded-lg border border-slate-700 transition-colors">
          Next
        </button>
      </div>
    </div>
  `;

  document.getElementById("users-prev-btn")?.addEventListener("click", () => {
    if (state.usersPage > 1) {
      state.usersPage--;
      renderUsers();
    }
  });

  document.getElementById("users-next-btn")?.addEventListener("click", () => {
    if (state.usersPage < totalPages) {
      state.usersPage++;
      renderUsers();
    }
  });
}

/**
 * Pagination Controls Generator for Grouped Interest Table
 */
function renderGroupsPaginationControls(meta) {
  if (!groupsPaginationContainer) return;

  const totalPages = meta.totalPages || 1;
  const currentPage = meta.page || state.groupsPage;

  groupsPaginationContainer.innerHTML = `
    <div class="flex items-center justify-between w-full pt-2">
      <span class="text-xs text-slate-400 font-mono">Page ${currentPage} of ${totalPages}</span>
      <div class="flex gap-2">
        <button id="groups-prev-btn" ${currentPage <= 1 ? "disabled" : ""} 
          class="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-xs px-3.5 py-1.5 rounded-lg border border-slate-700 transition-colors">
          Previous
        </button>
        <button id="groups-next-btn" ${currentPage >= totalPages ? "disabled" : ""} 
          class="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-xs px-3.5 py-1.5 rounded-lg border border-slate-700 transition-colors">
          Next
        </button>
      </div>
    </div>
  `;

  document.getElementById("groups-prev-btn")?.addEventListener("click", () => {
    if (state.groupsPage > 1) {
      state.groupsPage--;
      renderGroupedUsers();
    }
  });

  document.getElementById("groups-next-btn")?.addEventListener("click", () => {
    if (state.groupsPage < totalPages) {
      state.groupsPage++;
      renderGroupedUsers();
    }
  });
}

/**
 * Action Handlers (Edit & Delete User)
 */
async function handleUserActions(e) {
  const target = e.target.closest("button");
  if (!target) return;

  const action = target.getAttribute("data-action");
  const userId = target.getAttribute("data-id");

  if (action === "delete" && userId) {
    if (confirm("Are you sure you want to delete this user?")) {
      const res = await API.deleteUser(userId);
      if (res.success) {
        renderAdminPanel();
      } else {
        alert(res.message || "Failed to delete user");
      }
    }
  } else if (action === "edit" && userId) {
    const res = await API.getUser(userId);
    if (res.success && res.data) {
      const user = res.data.user || res.data;
      openUserModal(user);
    } else {
      alert(res.message || "Failed to fetch user details");
    }
  }
}

/**
 * Form Submission Handler (Create or Update)
 */
async function handleUserFormSubmit(e) {
  e.preventDefault();

  const rawInterests = userInterestsInput?.value || "";
  const interestsArray = rawInterests
    ? rawInterests
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const payload = {
    name: userNameInput?.value?.trim(),
    email: userEmailInput?.value?.trim(),
    role: userRoleSelect?.value || "user",
    interests: interestsArray,
  };

  if (userPasswordInput?.value) {
    payload.password = userPasswordInput.value;
  }

  let res;
  if (state.editingUserId) {
    res = await API.updateUser(state.editingUserId, payload);
  } else {
    res = await API.createUser(payload);
  }

  if (res.success) {
    closeUserModal();
    renderAdminPanel();
  } else {
    alert(res.message || "Operation failed");
  }
}

/**
 * Modal Visibility Controllers
 */
function openUserModal(user = null) {
  if (!userModal) return;

  if (user) {
    state.editingUserId = user._id || user.id;
    if (userModalTitle) userModalTitle.innerText = "Update User";

    if (userNameInput) userNameInput.value = user.name || "";
    if (userEmailInput) userEmailInput.value = user.email || "";
    if (userRoleSelect) userRoleSelect.value = user.role || "user";
    if (userPasswordInput) userPasswordInput.value = ""; // Leave password blank on edit
    if (userInterestsInput) {
      userInterestsInput.value = Array.isArray(user.interests)
        ? user.interests.join(", ")
        : user.interests || "";
    }
  } else {
    state.editingUserId = null;
    if (userModalTitle) userModalTitle.innerText = "Create User";
    userForm?.reset();
  }

  userModal.classList.remove("hidden");
}

function closeUserModal() {
  if (!userModal) return;
  userModal.classList.add("hidden");
  state.editingUserId = null;
  userForm?.reset();
}
