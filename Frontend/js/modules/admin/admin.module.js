import { API } from "../../api.js";
import { escapeHTML } from "../../utils/dom.js";

let usersList, groupedUsersList, paginationContainer;

// State Management
let currentPage = 1;
let groupsCurrentPage = 1; // Grouped by interest এর আলাদা পেজ স্টেট
const limit = 5;
let editingUserId = null; // Track user being edited for PATCH request

export function initAdminModule() {
  usersList = document.getElementById("users-list");
  groupedUsersList = document.getElementById("grouped-users-list");
  paginationContainer = document.getElementById("users-pagination");

  setupAdminEventListeners();
}

function setupAdminEventListeners() {
  // 1. All Users Table Event Delegation (Delete & Edit)
  usersList?.addEventListener("click", async (e) => {
    // A. Delete User Listener
    const deleteBtn = e.target.closest(".delete-user-btn");
    if (deleteBtn) {
      const id = deleteBtn.getAttribute("data-id");
      if (confirm("Are you sure you want to delete this user?")) {
        try {
          deleteBtn.disabled = true;
          await API.deleteUser(id);
          await renderAdminPanel(currentPage);
        } catch (error) {
          console.error("Failed to delete user:", error);
          alert(error.response?.data?.message || "Failed to delete user.");
        }
      }
      return;
    }

    // B. Edit User Listener (Opens Modal pre-filled)
    const editBtn = e.target.closest(".edit-user-btn");
    if (editBtn) {
      const userDataRaw = editBtn.getAttribute("data-user");
      if (userDataRaw) {
        try {
          const user = JSON.parse(decodeURIComponent(userDataRaw));
          openModalForEdit(user);
        } catch (err) {
          console.error("Error parsing user data for edit:", err);
        }
      }
    }
  });

  // 2. User Form Submission (Handles both Create & Update via PATCH)
  const userForm = document.getElementById("user-form");
  userForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const userData = {
      name: document.getElementById("user-name-input")?.value,
      email: document.getElementById("user-email-input")?.value,
      role: document.getElementById("user-role-select")?.value || "user",
      interests: document.getElementById("user-interests-input")?.value
        ? document
            .getElementById("user-interests-input")
            .value.split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    };

    const passwordInput = document.getElementById("user-password-input")?.value;
    if (passwordInput) {
      userData.password = passwordInput;
    }

    try {
      let res;
      if (editingUserId) {
        // Update mode (PATCH request via API.updateUser)
        res = await API.updateUser(editingUserId, userData);
      } else {
        // Create mode
        res = await (API.createUser
          ? API.createUser(userData)
          : API.register(userData));
      }

      if (res?.success || res?._id || res?.id || res?.data) {
        alert(
          editingUserId
            ? "User updated successfully!"
            : "User created successfully!",
        );
        closeModal();
        await renderAdminPanel(currentPage);
      } else {
        alert(res?.message || "Action failed");
      }
    } catch (err) {
      console.error("User submit error:", err);
      alert(
        err.response?.data?.message ||
          err.message ||
          "Error processing request",
      );
    }
  });

  // 3. Modal Control Listeners
  const openModalBtn = document.getElementById("open-create-user-btn");
  const closeModalBtn = document.getElementById("close-user-modal");

  openModalBtn?.addEventListener("click", () => {
    openModalForCreate();
  });

  closeModalBtn?.addEventListener("click", () => {
    closeModal();
  });

  // 4. Grouped by Interest Search & Filter Listeners
  const groupSearchBtn = document.getElementById("group-search-btn");
  const groupSearchInput = document.getElementById("group-search-input");

  groupSearchBtn?.addEventListener("click", () => {
    groupsCurrentPage = 1;
    renderGroupedUsers(groupsCurrentPage, groupSearchInput?.value || "");
  });

  groupSearchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      groupsCurrentPage = 1;
      renderGroupedUsers(groupsCurrentPage, groupSearchInput?.value || "");
    }
  });
}

// Modal Helpers
function openModalForCreate() {
  editingUserId = null;
  const userForm = document.getElementById("user-form");
  userForm?.reset();

  const modalTitle = document.getElementById("user-modal-title");
  if (modalTitle) modalTitle.innerText = "Create New User";

  const passwordInput = document.getElementById("user-password-input");
  if (passwordInput) passwordInput.required = true;

  document.getElementById("user-modal")?.classList.remove("hidden");
}

function openModalForEdit(user) {
  editingUserId = user._id || user.id;

  const modalTitle = document.getElementById("user-modal-title");
  if (modalTitle) modalTitle.innerText = "Edit User";

  // Fill Inputs
  if (document.getElementById("user-name-input"))
    document.getElementById("user-name-input").value = user.name || "";
  if (document.getElementById("user-email-input"))
    document.getElementById("user-email-input").value = user.email || "";
  if (document.getElementById("user-role-select"))
    document.getElementById("user-role-select").value = user.role || "user";

  let interestsText = "";
  if (Array.isArray(user.interests)) {
    interestsText = user.interests.join(", ");
  } else if (typeof user.interests === "string") {
    interestsText = user.interests;
  }
  if (document.getElementById("user-interests-input"))
    document.getElementById("user-interests-input").value = interestsText;

  // Password is optional during update
  const passwordInput = document.getElementById("user-password-input");
  if (passwordInput) {
    passwordInput.value = "";
    passwordInput.required = false;
  }

  document.getElementById("user-modal")?.classList.remove("hidden");
}

function closeModal() {
  editingUserId = null;
  document.getElementById("user-form")?.reset();
  document.getElementById("user-modal")?.classList.add("hidden");
}

// Main Render Function
export async function renderAdminPanel(page = 1) {
  currentPage = page;
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  if (currentUser?.role !== "admin") return;

  // A. Render All Users Table
  if (usersList && typeof API.listUsers === "function") {
    try {
      usersList.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-xs text-slate-400">Loading users...</td></tr>`;

      const usersRes = await API.listUsers(currentPage, limit);

      const usersData = usersRes.data || usersRes;
      const users = Array.isArray(usersData.users)
        ? usersData.users
        : Array.isArray(usersData)
          ? usersData
          : [];

      const meta = usersData.meta || {};
      const currentResPage = meta.page || currentPage;
      const totalPages =
        meta.totalPages ||
        Math.ceil((meta.total || users.length) / (meta.limit || limit)) ||
        1;
      const totalUsers = meta.total ?? users.length;
      const currentLimit = meta.limit || limit;

      if (users.length === 0) {
        usersList.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-xs text-slate-400">No users found.</td></tr>`;
      } else {
        usersList.innerHTML = users
          .map((user, index) => {
            const serialNumber =
              (currentResPage - 1) * currentLimit + (index + 1);

            const createdDate = user.createdAt
              ? new Date(user.createdAt).toLocaleDateString("en-US", {
                  month: "2-digit",
                  day: "2-digit",
                  year: "numeric",
                })
              : "N/A";

            const interestsArray = Array.isArray(user.interests)
              ? user.interests
              : typeof user.interests === "string" && user.interests
                ? user.interests.split(",").map((s) => s.trim())
                : [];

            const interestsHTML =
              interestsArray.length > 0
                ? interestsArray
                    .map(
                      (item) => `
              <span class="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                ${escapeHTML(item)}
              </span>
            `,
                    )
                    .join(" ")
                : `<span class="text-slate-500 font-mono text-[11px]">-</span>`;

            const encodedUser = encodeURIComponent(JSON.stringify(user));
            const avatarUrl =
              user.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "User")}&background=0D9488&color=fff`;

            return `
          <tr class="border-b border-slate-700/50 text-xs text-slate-300 hover:bg-slate-800/40 transition-colors">
            <td class="py-3.5 px-4 font-mono font-medium text-slate-400">${serialNumber}</td>
            <td class="py-3.5 px-4">
              <div class="flex items-center gap-3">
                <img src="${avatarUrl}" alt="${escapeHTML(user.name || "")}" class="w-8 h-8 rounded-full object-cover border border-slate-700" />
                <span class="font-semibold text-white">${escapeHTML(user.name || "N/A")}</span>
              </div>
            </td>
            <td class="py-3.5 px-4 text-slate-300 font-mono">${escapeHTML(user.email || "N/A")}</td>
            <td class="py-3.5 px-4 text-slate-400 font-mono">${createdDate}</td>
            <td class="py-3.5 px-4">
              <span class="px-2 py-0.5 text-[10px] uppercase font-bold rounded font-mono ${user.role === "admin" ? "bg-amber-950/80 text-amber-400 border border-amber-800/50" : "bg-slate-800 text-slate-300 border border-slate-700"}">
                ${escapeHTML(user.role || "user")}
              </span>
            </td>
            <td class="py-3.5 px-4">
              <div class="flex flex-wrap gap-1.5 items-center max-w-[200px]">
                ${interestsHTML}
              </div>
            </td>
            <td class="py-3.5 px-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <button 
                  data-user="${encodedUser}" 
                  class="edit-user-btn p-1.5 text-sky-400 hover:text-sky-300 hover:bg-slate-700/50 rounded-lg transition-colors"
                  title="Edit User"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                </button>
                <button 
                  data-id="${user._id || user.id}" 
                  class="delete-user-btn p-1.5 text-rose-500 hover:text-rose-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                  title="Delete User"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        `;
          })
          .join("");
      }

      renderPaginationControls(
        totalPages,
        totalUsers,
        currentResPage,
        meta.hasNextPage,
        meta.hasPrevPage,
      );
    } catch (error) {
      console.error("Failed to fetch users:", error);
      usersList.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-xs text-rose-400">Error loading users data.</td></tr>`;
    }
  }

  // B. Render Grouped Users by Interest Table with Input Search
  await renderGroupedUsers(groupsCurrentPage);
}

// Separate function to render Grouped Users with Search Query and Pagination
async function renderGroupedUsers(page = 1, interestQuery = "") {
  groupsCurrentPage = page;
  if (!groupedUsersList) return;


  let groupsWrapper = document.getElementById("groups-wrapper-container");
  if (!groupsWrapper) {
    const parentSection = document.getElementById("groups-view-section");
    if (parentSection) {
      parentSection.innerHTML = `
        <div class="space-y-4" id="groups-wrapper-container">
          <!-- Search Input Bar -->
          <div class="flex gap-2 items-center bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <input 
              type="text" 
              id="group-search-input" 
              value="${escapeHTML(interestQuery)}"
              placeholder="Filter interests (e.g. node.js, mongodb)..." 
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <button 
              id="group-search-btn" 
              class="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Search
            </button>
          </div>

          <!-- Table Container -->
          <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-800/30">
                  <th class="py-3 px-4">#</th>
                  <th class="py-3 px-4">Interest Topic</th>
                  <th class="py-3 px-4">Total Users</th>
                  <th class="py-3 px-4">Users List (Name / Email)</th>
                  <th class="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody id="grouped-users-list">
                <!-- Rows injected here -->
              </tbody>
            </table>
          </div>

          <!-- Groups Pagination -->
          <div id="groups-pagination-container"></div>
        </div>
      `;
      groupedUsersList = document.getElementById("grouped-users-list");
      
      // Re-bind listeners for newly injected elements
      document.getElementById("group-search-btn")?.addEventListener("click", () => {
        const query = document.getElementById("group-search-input")?.value || "";
        renderGroupedUsers(1, query);
      });
      document.getElementById("group-search-input")?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          const query = document.getElementById("group-search-input")?.value || "";
          renderGroupedUsers(1, query);
        }
      });
    }
  }

  try {
    groupedUsersList.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-xs text-slate-400">Loading grouped data...</td></tr>`;

    // API Call with interest query and page parameters
    const groupedRes = typeof API.groupUsersByInterest === "function" 
      ? await API.groupUsersByInterest(groupsCurrentPage, limit, interestQuery) 
      : { groups: [], meta: {} };

    const responseData = groupedRes.data || groupedRes;
    const groupsArray = Array.isArray(responseData.groups) 
      ? responseData.groups 
      : Array.isArray(responseData) 
        ? responseData 
        : [];

    const meta = responseData.meta || {};
    const totalPages = meta.totalPages || Math.ceil((meta.total || groupsArray.length) / (meta.limit || limit)) || 1;
    const totalGroups = meta.total ?? groupsArray.length;
    const activeResPage = meta.page || groupsCurrentPage;

    if (groupsArray.length === 0) {
      groupedUsersList.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-xs text-slate-400">No interest groups found.</td></tr>`;
      document.getElementById("groups-pagination-container").innerHTML = "";
      return;
    }

    groupedUsersList.innerHTML = groupsArray
      .map((g, index) => {
        const serialNum = (activeResPage - 1) * limit + (index + 1);
        const topic = g.interest || g._id || "General";
        const count = g.count || (Array.isArray(g.users) ? g.users.length : 0);
        const usersInGroup = Array.isArray(g.users) ? g.users : [];

        // Render associated users badges/names
        const usersHTML = usersInGroup.length > 0
          ? usersInGroup.map(u => `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700" title="${escapeHTML(u.email || '')}">
                <span class="font-semibold text-white">${escapeHTML(u.name || 'User')}</span>
              </span>
            `).join(" ")
          : `<span class="text-slate-500 font-mono text-[11px]">-</span>`;

        const topicAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(topic)}&background=0284C7&color=fff&bold=true`;

        return `
          <tr class="border-b border-slate-700/50 text-xs text-slate-300 hover:bg-slate-800/40 transition-colors">
            <td class="py-3.5 px-4 font-mono font-medium text-slate-400">${serialNum}</td>
            <td class="py-3.5 px-4">
              <div class="flex items-center gap-3">
                <img src="${topicAvatar}" alt="${escapeHTML(String(topic))}" class="w-8 h-8 rounded-full object-cover border border-slate-700" />
                <span class="font-semibold text-white capitalize">${escapeHTML(String(topic))}</span>
              </div>
            </td>
            <td class="py-3.5 px-4 font-mono text-emerald-400 font-semibold">${count} User(s)</td>
            <td class="py-3.5 px-4">
              <div class="flex flex-wrap gap-1 items-center max-w-[350px]">
                ${usersHTML}
              </div>
            </td>
            <td class="py-3.5 px-4 text-right">
              <span class="px-2.5 py-1 text-[10px] uppercase font-bold rounded-md font-mono bg-sky-950/80 text-sky-300 border border-sky-700/50">
                Active Group
              </span>
            </td>
          </tr>
        `;
      })
      .join("");

    // Render Group Pagination Controls
    renderGroupsPaginationControls(totalPages, totalGroups, activeResPage, meta.hasNextPage, meta.hasPrevPage, interestQuery);

  } catch (error) {
    console.error("Failed to fetch grouped users:", error);
    groupedUsersList.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-xs text-rose-400">Error loading group data.</td></tr>`;
  }
}

// Groups Pagination Controls Renderer
function renderGroupsPaginationControls(totalPages, totalGroups = 0, activePage = 1, hasNext = null, hasPrev = null, currentQuery = "") {
  const container = document.getElementById("groups-pagination-container");
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  const isFirst = hasPrev !== null ? !hasPrev : activePage === 1;
  const isLast = hasNext !== null ? !hasNext : activePage === totalPages;

  container.innerHTML = `
    <div class="flex items-center justify-between w-full pt-3 border-t border-slate-800">
      <div class="text-xs text-slate-400 font-mono">
        Page <span class="text-emerald-400 font-bold">${activePage}</span> of <span class="text-white font-bold">${totalPages}</span>
        ${totalGroups ? `<span class="ml-1 text-slate-500">(${totalGroups} total groups)</span>` : ""}
      </div>
      <div class="flex items-center gap-2">
        <button 
          id="groups-prev-btn" 
          ${isFirst ? "disabled" : ""} 
          class="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
            isFirst 
              ? "bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed" 
              : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer"
          }"
        >
          Previous
        </button>
        <button 
          id="groups-next-btn" 
          ${isLast ? "disabled" : ""} 
          class="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
            isLast 
              ? "bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed" 
              : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer"
          }"
        >
          Next
        </button>
      </div>
    </div>
  `;

  document.getElementById("groups-prev-btn")?.addEventListener("click", () => {
    if (!isFirst) renderGroupedUsers(activePage - 1, currentQuery);
  });

  document.getElementById("groups-next-btn")?.addEventListener("click", () => {
    if (!isLast) renderGroupedUsers(activePage + 1, currentQuery);
  });
}

// Render Dynamic Pagination Controls using Meta Info (For All Users Table)
function renderPaginationControls(
  totalPages,
  totalUsers = 0,
  activePage = 1,
  hasNext = null,
  hasPrev = null,
) {
  if (!paginationContainer) return;

  if (totalPages <= 1) {
    paginationContainer.innerHTML = "";
    return;
  }

  const isFirstPage = hasPrev !== null ? !hasPrev : activePage === 1;
  const isLastPage = hasNext !== null ? !hasNext : activePage === totalPages;

  paginationContainer.innerHTML = `
    <div class="flex items-center justify-between w-full pt-3 border-t border-slate-800">
      <div class="text-xs text-slate-400 font-mono">
        Showing Page <span class="text-emerald-400 font-bold">${activePage}</span> of <span class="text-white font-bold">${totalPages}</span>
        ${totalUsers ? `<span class="ml-1 text-slate-500">(${totalUsers} total users)</span>` : ""}
      </div>
      <div class="flex items-center gap-2">
        <button 
          id="users-prev-page-btn" 
          ${isFirstPage ? "disabled" : ""} 
          class="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
            isFirstPage
              ? "bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed"
              : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer"
          }"
        >
          Previous
        </button>
        <button 
          id="users-next-page-btn" 
          ${isLastPage ? "disabled" : ""} 
          class="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
            isLastPage
              ? "bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed"
              : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer"
          }"
        >
          Next
        </button>
      </div>
    </div>
  `;

  const prevBtn = document.getElementById("users-prev-page-btn");
  const nextBtn = document.getElementById("users-next-page-btn");

  if (prevBtn && !isFirstPage) {
    prevBtn.addEventListener("click", () => {
      renderAdminPanel(activePage - 1);
    });
  }

  if (nextBtn && !isLastPage) {
    nextBtn.addEventListener("click", () => {
      renderAdminPanel(activePage + 1);
    });
  }
}