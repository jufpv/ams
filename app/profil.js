import { requireAuth, updateProfile, logout, getStoredUser } from "./auth.js";

const page = document.querySelector(".page-profile");
const form = document.getElementById("profileForm");
const errorEl = document.getElementById("profileError");
const successEl = document.getElementById("profileSuccess");
const saveBtn = document.getElementById("profileSave");
const toast = document.getElementById("toast");

let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function showError(message) {
  successEl.hidden = true;
  errorEl.hidden = false;
  errorEl.textContent = message;
}

function showSuccess(message) {
  errorEl.hidden = true;
  successEl.hidden = false;
  successEl.textContent = message;
}

function clearMessages() {
  errorEl.hidden = true;
  successEl.hidden = true;
  errorEl.textContent = "";
  successEl.textContent = "";
}

function fillForm(user) {
  form.prenom.value = user.prenom || "";
  form.nom.value = user.nom || "";
  form.email.value = user.email || "";
  form.password.value = "";

  document.getElementById("profileRole").textContent = user.role || "—";
  document.getElementById("profileRuche").textContent = user.ruche?.nom || "—";

  const meta = document.getElementById("profileMeta");
  const displayName = [user.prenom, user.nom].filter(Boolean).join(" ");
  meta.textContent = displayName
    ? `${displayName} · ${user.role || "Abeille"}`
    : "Gérez vos informations personnelles";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessages();

  const payload = {
    prenom: form.prenom.value.trim(),
    nom: form.nom.value.trim(),
    email: form.email.value.trim(),
  };

  const password = form.password.value;
  if (password) payload.password = password;

  if (!payload.email) {
    showError("L'email est obligatoire.");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Enregistrement…";

  try {
    const { user } = await updateProfile(payload);
    fillForm(user);
    showSuccess("Profil mis à jour.");
    showToast("Modifications enregistrées");
  } catch (err) {
    showError(err.message || "Impossible d'enregistrer le profil.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Enregistrer";
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  logout();
});

(async () => {
  const user = (await requireAuth()) || getStoredUser();
  if (!user) return;
  fillForm(user);
  if (page) page.hidden = false;
})();
