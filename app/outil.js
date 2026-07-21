import {
  requireAuth,
  getStoredUser,
  fetchOutil,
  fetchEntrees,
  fetchMembres,
} from "./auth.js";

const page = document.querySelector(".page-outil");
const titleEl = document.getElementById("outilTitle");
const bodyEl = document.getElementById("entreesBody");
const emptyEl = document.getElementById("entreesEmpty");
const searchInput = document.getElementById("searchInput");
const addEntreeBtn = document.getElementById("addEntreeBtn");
const listSection = document.getElementById("outilListSection");
const notifDrawer = document.getElementById("notifDrawer");
const toast = document.getElementById("toast");

const params = new URLSearchParams(window.location.search);
const outilCode = params.get("code");

let toastTimer;
let searchTimer;
let allItems = [];
let currentOutil = null;
let currentUser = null;
let mode = "liste_entrees";

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

function entreeViewUrl(entreeId) {
  return `./entree.html?code=${encodeURIComponent(outilCode)}&id=${encodeURIComponent(entreeId)}`;
}

function memberDisplayName(member) {
  const full = [member.prenom, member.nom].filter(Boolean).join(" ").trim();
  return full || member.email || "Membre";
}

function renderEntrees(entrees) {
  if (!entrees.length) {
    bodyEl.innerHTML = "";
    emptyEl.hidden = false;
    emptyEl.textContent = "Aucune entrée trouvée.";
    return;
  }

  emptyEl.hidden = true;
  bodyEl.innerHTML = entrees
    .map(
      (entree) => `
      <a class="entree-card" href="${escapeHtml(entreeViewUrl(entree.id))}">
        <strong class="entree-card-title">${escapeHtml(entree.designation)}</strong>
      </a>`
    )
    .join("");
}

function renderMembres(membres) {
  if (!membres.length) {
    bodyEl.innerHTML = "";
    emptyEl.hidden = false;
    emptyEl.textContent = "Aucun membre dans cet espace.";
    return;
  }

  emptyEl.hidden = true;
  bodyEl.innerHTML = membres
    .map(
      (member) => `
      <article class="entree-card membre-card">
        <strong class="entree-card-title">${escapeHtml(memberDisplayName(member))}</strong>
        <p class="membre-card-meta">${escapeHtml(member.email || "—")}</p>
        <p class="membre-card-role">${escapeHtml(member.role || "")}</p>
      </article>`
    )
    .join("");
}

function filterLocal(q) {
  const query = q.trim().toLowerCase();
  if (!query) return allItems;

  if (mode === "membres") {
    return allItems.filter((member) => {
      const haystack = [
        member.prenom,
        member.nom,
        member.email,
        member.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  return allItems.filter((entree) =>
    entree.designation.toLowerCase().includes(query)
  );
}

function renderItems(items) {
  if (mode === "membres") renderMembres(items);
  else renderEntrees(items);
}

function setAddButtonEnabled(enabled, { href = "#", label = "Ajouter une entrée" } = {}) {
  addEntreeBtn.hidden = false;
  addEntreeBtn.setAttribute("aria-label", label);
  if (enabled) {
    addEntreeBtn.href = href;
    addEntreeBtn.removeAttribute("aria-disabled");
    addEntreeBtn.classList.remove("is-disabled");
    addEntreeBtn.title = "";
    return;
  }

  addEntreeBtn.href = "#";
  addEntreeBtn.setAttribute("aria-disabled", "true");
  addEntreeBtn.classList.add("is-disabled");
  addEntreeBtn.title = "Réservé au rôle Reine";
}

function applyOutilChrome(outil) {
  currentOutil = outil;
  mode = outil.type === "membres" ? "membres" : "liste_entrees";
  titleEl.textContent = outil.designation;
  document.title = `${outil.designation} — Espace mouvement citoyen`;

  if (mode === "membres") {
    const canAdd = currentUser?.role === "Reine";
    setAddButtonEnabled(canAdd, {
      href: "#",
      label: "Ajouter un membre",
    });
    searchInput.placeholder = "Rechercher un membre…";
    if (listSection) {
      listSection.setAttribute("aria-label", "Liste des membres");
    }
  } else {
    setAddButtonEnabled(true, {
      href: `./entree.html?code=${encodeURIComponent(outilCode)}`,
      label: "Ajouter une entrée",
    });
    searchInput.placeholder = "Rechercher...";
    if (listSection) {
      listSection.setAttribute("aria-label", "Liste des entrées");
    }
  }
}

async function loadContent() {
  const { data: outil } = await fetchOutil(outilCode);
  applyOutilChrome(outil);

  if (mode === "membres") {
    const { data } = await fetchMembres();
    allItems = data || [];
  } else {
    const { data } = await fetchEntrees(outilCode);
    allItems = data || [];
  }

  renderItems(allItems);
}

function syncBodyScroll() {
  document.body.style.overflow = notifDrawer?.classList.contains("open")
    ? "hidden"
    : "";
}

function openNotifDrawer() {
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
  notifDrawer?.querySelectorAll("[data-close-notif-drawer]").forEach((el) => {
    el.addEventListener("click", closeNotifDrawer);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && notifDrawer?.classList.contains("open")) {
      closeNotifDrawer();
    }
  });
  document.getElementById("notifBtn")?.addEventListener("click", openNotifDrawer);

  addEntreeBtn?.addEventListener("click", (event) => {
    if (addEntreeBtn.getAttribute("aria-disabled") === "true") {
      event.preventDefault();
    }
  });

  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      renderItems(filterLocal(searchInput.value));
    }, 120);
  });
}

(async () => {
  if (!outilCode) {
    window.location.replace("./index.html");
    return;
  }

  currentUser = (await requireAuth()) || getStoredUser();
  if (!currentUser) return;

  bindChrome();

  try {
    await loadContent();
    if (page) page.hidden = false;
  } catch (err) {
    if (page) page.hidden = false;
    titleEl.textContent = "Outil introuvable";
    emptyEl.hidden = false;
    emptyEl.textContent = err.message || "Impossible de charger cet outil.";
    addEntreeBtn.hidden = true;
    showToast(err.message || "Chargement impossible");
  }
})();
