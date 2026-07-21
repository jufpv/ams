import {
  requireAuth,
  getStoredUser,
  fetchEntrees,
  logout,
} from "./auth.js";

const page = document.querySelector(".page-outil");
const titleEl = document.getElementById("outilTitle");
const bodyEl = document.getElementById("entreesBody");
const emptyEl = document.getElementById("entreesEmpty");
const searchInput = document.getElementById("searchInput");
const drawer = document.getElementById("drawer");
const notifDrawer = document.getElementById("notifDrawer");
const toast = document.getElementById("toast");

const params = new URLSearchParams(window.location.search);
const outilCode = params.get("code");

let toastTimer;
let searchTimer;
let allEntrees = [];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function linkHref(lien) {
  const value = String(lien || "").trim();
  if (!value) return "#";
  if (/^https?:\/\//i.test(value)) return value;
  if (/^mailto:/i.test(value) || /^tel:/i.test(value)) return value;
  return `https://${value}`;
}

function linkLabel(lien) {
  const value = String(lien || "").trim();
  if (!value) return "—";
  try {
    const url = new URL(linkHref(value));
    const host = url.hostname.replace(/^www\./, "");
    if (host.includes("whatsapp")) return "WhatsApp";
    if (host.includes("drive.google") || host.includes("docs.google")) {
      return "Google Drive";
    }
    if (host.includes("dropbox")) return "Dropbox";
    if (host.includes("outlook") || host.includes("office")) return "Agenda Outlook";
    if (value.length > 42) return `${value.slice(0, 39)}…`;
    return value;
  } catch {
    return value;
  }
}

function renderEntrees(entrees) {
  if (!entrees.length) {
    bodyEl.innerHTML = "";
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;
  bodyEl.innerHTML = entrees
    .map(
      (entree) => `
      <div class="entrees-row" role="row">
        <div class="entrees-cell designation" role="cell">${escapeHtml(entree.designation)}</div>
        <div class="entrees-cell lien" role="cell">
          <a href="${escapeHtml(linkHref(entree.lien))}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(linkLabel(entree.lien))}
          </a>
        </div>
      </div>`
    )
    .join("");
}

function filterLocal(q) {
  const query = q.trim().toLowerCase();
  if (!query) return allEntrees;
  return allEntrees.filter(
    (entree) =>
      entree.designation.toLowerCase().includes(query) ||
      entree.lien.toLowerCase().includes(query)
  );
}

async function loadEntrees(q = "") {
  const { outil, data } = await fetchEntrees(outilCode, { q });
  titleEl.textContent = outil.designation;
  document.title = `${outil.designation} — Espace mouvement citoyen`;
  allEntrees = data || [];
  renderEntrees(allEntrees);
}

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

function bindChrome() {
  document.getElementById("menuBtn")?.addEventListener("click", openDrawer);
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
  document.getElementById("profileBtn")?.addEventListener("click", () => {
    window.location.href = "./profil.html";
  });
  document.getElementById("notifBtn")?.addEventListener("click", openNotifDrawer);
  document.getElementById("logoutLink")?.addEventListener("click", (event) => {
    event.preventDefault();
    logout();
  });

  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      renderEntrees(filterLocal(searchInput.value));
    }, 120);
  });
}

(async () => {
  if (!outilCode) {
    window.location.replace("./index.html");
    return;
  }

  const user = (await requireAuth()) || getStoredUser();
  if (!user) return;

  bindChrome();

  try {
    await loadEntrees();
    if (page) page.hidden = false;
  } catch (err) {
    if (page) page.hidden = false;
    titleEl.textContent = "Outil introuvable";
    emptyEl.hidden = false;
    emptyEl.textContent = err.message || "Impossible de charger cet outil.";
    showToast(err.message || "Chargement impossible");
  }
})();
