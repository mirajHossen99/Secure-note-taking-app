import { API } from "../../api.js";
import { escapeHTML } from "../../utils/dom.js";

let profileFormEl,
  profileNameEl,
  profileEmailEl,
  profileRoleEl,
  profileInterestsEl,
  profilePasswordEl,
  profileSubmitBtn;

export function initProfileModule() {
  profileFormEl = document.getElementById("profile-form");
  profileNameEl = document.getElementById("profile-name");
  profileEmailEl = document.getElementById("profile-email");
  profileRoleEl = document.getElementById("profile-role-badge");
  profileInterestsEl = document.getElementById("profile-interests");
  profilePasswordEl = document.getElementById("profile-password");
  profileSubmitBtn = profileFormEl?.querySelector('button[type="submit"]');

  if (profileFormEl) {
    profileFormEl.addEventListener("submit", handleProfileUpdate);
  }
}

export function renderProfile(currentUser = null) {
  let user = currentUser;

  if (!user) {
    try {
      user = JSON.parse(localStorage.getItem("user") || "{}");
    } catch (err) {
      user = {};
    }
  }

  if (!user || (!user.id && !user._id)) {
    if (profileNameEl) profileNameEl.value = "";
    if (profileEmailEl) profileEmailEl.value = "";
    return;
  }

  const name = user.name || user.username || "";
  const email = user.email || "";
  const role = user.role || "user";
  const interests = Array.isArray(user.interests)
    ? user.interests.join(", ")
    : user.interests || "";

  if (profileNameEl) profileNameEl.value = name;
  if (profileEmailEl) profileEmailEl.value = email;
  if (profileRoleEl) profileRoleEl.innerText = role.toUpperCase();
  if (profileInterestsEl) profileInterestsEl.value = interests;
  if (profilePasswordEl) profilePasswordEl.value = "";
}

async function handleProfileUpdate(e) {
  e.preventDefault();

  const updatedName = profileNameEl.value.trim();
  const updatedInterests = profileInterestsEl.value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const updatedPassword = profilePasswordEl.value;

  const payload = {
    name: updatedName,
    interests: updatedInterests,
  };

  if (updatedPassword) {
    payload.password = updatedPassword;
  }

  // Button disable for UI safety during pending network request
  if (profileSubmitBtn) {
    profileSubmitBtn.disabled = true;
    profileSubmitBtn.innerText = "Updating...";
  }

  try {
    const res = await API.updateProfile(payload);

    if (res.success) {
      // res.data contains updated user payload from API/localStorage
      const updatedUser = res.data || {
        ...JSON.parse(localStorage.getItem("user") || "{}"),
        ...payload,
      };

      // Topbar/Header user name state dynamically Update (If element exists)
      const headerUserName = document.getElementById("user-name");
      if (headerUserName && updatedUser.name) {
        headerUserName.innerText = updatedUser.name;
      }

      alert("Profile updated successfully!");
      renderProfile(updatedUser);
    } else {
      alert(res.message || "Failed to update profile.");
    }
  } catch (error) {
    console.error("Failed to update profile:", error);
    alert("An error occurred while updating profile.");
  } finally {
    if (profileSubmitBtn) {
      profileSubmitBtn.disabled = false;
      profileSubmitBtn.innerText = "Update Profile";
    }
  }
}
