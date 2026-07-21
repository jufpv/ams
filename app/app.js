import { requireAuth, logout, getStoredUser, fetchOutils } from "./auth.js";

const drawer = document.getElementById("drawer");
const menuBtn = document.getElementById("menuBtn");
const toast = document.getElementById("toast");
const page = document.querySelector(".page");
const navGrid = document.getElementById("navGrid");
const drawerTools = document.getElementById("drawerTools");

let toastTimer;

function openDrawer() {
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderOutils(outils) {
  if (!navGrid) return;

  navGrid.innerHTML = outils
    .map(
      (outil, index) => `
      <a class="nav-card" href="./outil.html?code=${encodeURIComponent(outil.code)}" data-module="${escapeHtml(outil.code)}" style="animation-delay: ${0.04 * (index + 1)}s">
        <span class="nav-icon" aria-hidden="true">
          <img src="${escapeHtml(outil.icone)}" alt="" width="30" height="30" />
        </span>
        <h2>${escapeHtml(outil.designation)}</h2>
        <p>${escapeHtml(outil.description)}</p>
      </a>`
    )
    .join("");

  if (drawerTools) {
    drawerTools.innerHTML = outils
      .map(
        (outil) =>
          `<li><a href="./outil.html?code=${encodeURIComponent(outil.code)}">${escapeHtml(outil.designation)}</a></li>`
      )
      .join("");
  }
}

function bindUi(user) {
  if (page) page.hidden = false;

  const displayName = [user.prenom, user.nom].filter(Boolean).join(" ") || user.email;
  const rucheName = user.ruche?.nom || "Votre ruche";
  const heroTitle = document.querySelector(".hero h1");
  if (heroTitle) {
    heroTitle.textContent = rucheName;
  }
  document.title = `${rucheName} — Espace mouvement citoyen`;

  const profileBtn = document.getElementById("profileBtn");
  if (profileBtn) {
    profileBtn.setAttribute("aria-label", `Mon profil (${displayName})`);
    profileBtn.title = `Mon profil — ${displayName}`;
  }

  menuBtn.addEventListener("click", openDrawer);

  drawer.querySelectorAll("[data-close-drawer]").forEach((el) => {
    el.addEventListener("click", closeDrawer);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.classList.contains("open")) {
      closeDrawer();
    }
  });

  document.getElementById("notifBtn")?.addEventListener("click", () => {
    showToast("Aucune nouvelle notification");
  });

  document.getElementById("profileBtn")?.addEventListener("click", () => {
    window.location.href = "./profil.html";
  });

  document.getElementById("settingsBtn")?.addEventListener("click", () => {
    window.location.href = "./parametres.html";
  });

  document.getElementById("profileLink")?.addEventListener("click", () => {
    window.location.href = "./profil.html";
  });

  document.getElementById("logoutLink")?.addEventListener("click", (event) => {
    event.preventDefault();
    logout();
  });
}

(async () => {
  if (page) page.hidden = true;
  const user = (await requireAuth()) || getStoredUser();
  if (!user) return;

  bindUi(user);

  try {
    const { data } = await fetchOutils();
    renderOutils(data || []);
  } catch (err) {
    showToast(err.message || "Impossible de charger les outils");
  }
})();
