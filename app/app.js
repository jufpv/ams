import { requireAuth, logout, getStoredUser, fetchOutils } from "./auth.js";

const drawer = document.getElementById("drawer");
const notifDrawer = document.getElementById("notifDrawer");
const menuBtn = document.getElementById("menuBtn");
const toast = document.getElementById("toast");
const page = document.querySelector(".page");
const navGrid = document.getElementById("navGrid");
const drawerTools = document.getElementById("drawerTools");

let toastTimer;

function syncBodyScroll() {
  const anyOpen =
    drawer?.classList.contains("open") ||
    notifDrawer?.classList.contains("open");
  document.body.style.overflow = anyOpen ? "hidden" : "";
}

function openDrawer() {
  closeNotifDrawer();
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  syncBodyScroll();
}

function closeDrawer() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  syncBodyScroll();
}

function openNotifDrawer() {
  closeDrawer();
  notifDrawer.classList.add("open");
  notifDrawer.setAttribute("aria-hidden", "false");
  syncBodyScroll();
}

function closeNotifDrawer() {
  if (!notifDrawer) return;
  notifDrawer.classList.remove("open");
  notifDrawer.setAttribute("aria-hidden", "true");
  syncBodyScroll();
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

  notifDrawer?.querySelectorAll("[data-close-notif-drawer]").forEach((el) => {
    el.addEventListener("click", closeNotifDrawer);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (notifDrawer?.classList.contains("open")) {
      closeNotifDrawer();
      return;
    }
    if (drawer.classList.contains("open")) {
      closeDrawer();
    }
  });

  document.getElementById("notifBtn")?.addEventListener("click", openNotifDrawer);

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
