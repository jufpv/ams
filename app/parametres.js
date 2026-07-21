import {
  requireAuth,
  getStoredUser,
  fetchOutils,
  createOutil,
  updateOutil,
  deleteOutil,
} from "./auth.js";

const page = document.querySelector(".page-settings");
const listEl = document.getElementById("outilsList");
const form = document.getElementById("outilsForm");
const errorEl = document.getElementById("outilsError");
const successEl = document.getElementById("outilsSuccess");
const saveBtn = document.getElementById("outilsSave");
const addBtn = document.getElementById("addOutilBtn");
const toast = document.getElementById("toast");

let toastTimer;
let outils = [];
let currentUser = null;
let canManageOutils = false;

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function bindCardEvents() {
  listEl.querySelectorAll("[data-toggle-outil]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".outil-card");
      if (!card) return;
      const open = card.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  listEl.querySelectorAll('input[name^="designation-"]').forEach((input) => {
    input.addEventListener("input", () => {
      const card = input.closest(".outil-card");
      const title = card?.querySelector(".outil-card-title");
      if (title) title.textContent = input.value.trim() || "Sans titre";
    });
  });

  listEl.querySelectorAll('input[name^="icone-"]').forEach((input) => {
    input.addEventListener("input", () => {
      const card = input.closest(".outil-card");
      const img = card?.querySelector(".outil-preview img");
      if (img && input.value.trim()) img.src = input.value.trim();
    });
  });

  listEl.querySelectorAll("[data-delete-outil]").forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (!canManageOutils) return;

      const id = Number(btn.dataset.deleteOutil);
      const outil = outils.find((item) => item.id === id);
      if (!outil) return;

      const ok = window.confirm(
        `Supprimer l'outil « ${outil.designation} » ?`
      );
      if (!ok) return;

      clearMessages();
      btn.disabled = true;

      try {
        await deleteOutil(id);
        outils = outils.filter((item) => item.id !== id);
        renderOutils();
        showSuccess("Outil supprimé.");
        showToast("Outil supprimé");
      } catch (err) {
        showError(err.message || "Impossible de supprimer l'outil.");
        btn.disabled = false;
      }
    });
  });
}

function renderOutils({ openId = null } = {}) {
  addBtn.hidden = false;
  addBtn.disabled = !canManageOutils;
  addBtn.title = canManageOutils ? "" : "Réservé au rôle Reine";
  saveBtn.disabled = !canManageOutils;
  saveBtn.title = canManageOutils ? "" : "Réservé au rôle Reine";
  form.classList.toggle("is-readonly", !canManageOutils);

  if (!outils.length) {
    listEl.innerHTML =
      '<p class="outils-empty">Aucun outil configuré pour cet espace.</p>';
    return;
  }

  const locked = !canManageOutils ? "readonly" : "";

  listEl.innerHTML = outils
    .map((outil) => {
      const isOpen = openId != null && Number(openId) === Number(outil.id);
      return `
      <article class="outil-card${isOpen ? " is-open" : ""}" data-id="${outil.id}">
        <div class="outil-card-head">
          <button class="outil-card-toggle" type="button" data-toggle-outil aria-expanded="${isOpen ? "true" : "false"}">
            <span class="outil-preview" aria-hidden="true">
              <img src="${escapeHtml(outil.icone || "icons/adherents.svg")}" alt="" width="28" height="28" />
            </span>
            <strong class="outil-card-title">${escapeHtml(outil.designation)}</strong>
            <span class="outil-chevron" aria-hidden="true"></span>
          </button>
          <button
            class="btn-delete-outil"
            type="button"
            data-delete-outil="${outil.id}"
            aria-label="Supprimer ${escapeHtml(outil.designation)}"
            ${canManageOutils ? "" : "disabled"}
            title="${canManageOutils ? "" : "Réservé au rôle Reine"}"
          >
            Supprimer
          </button>
        </div>

        <div class="outil-fields">
          <label class="field">
            <span>Désignation</span>
            <input type="text" name="designation-${outil.id}" value="${escapeHtml(outil.designation)}" ${locked} required />
          </label>
          <label class="field">
            <span>Description</span>
            <input type="text" name="description-${outil.id}" value="${escapeHtml(outil.description)}" ${locked} />
          </label>
          <label class="field field-full">
            <span>Lien icône</span>
            <input type="text" name="icone-${outil.id}" value="${escapeHtml(outil.icone)}" placeholder="icons/exemple.svg" ${locked} />
          </label>
        </div>
      </article>`;
    })
    .join("");

  bindCardEvents();
}

addBtn.addEventListener("click", async () => {
  if (!canManageOutils) return;

  clearMessages();
  addBtn.disabled = true;

  try {
    const { data } = await createOutil({
      designation: "Nouvel outil",
      description: "",
      icone: "icons/adherents.svg",
    });
    outils = [...outils, data];
    renderOutils({ openId: data.id });
    showSuccess("Outil ajouté.");
    showToast("Outil ajouté");

    const card = listEl.querySelector(`[data-id="${data.id}"]`);
    card?.querySelector(`input[name="designation-${data.id}"]`)?.focus();
  } catch (err) {
    showError(err.message || "Impossible d'ajouter un outil.");
  } finally {
    addBtn.disabled = false;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessages();

  if (!canManageOutils) {
    showError("Seul le rôle Reine peut modifier les outils.");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Enregistrement…";

  try {
    const updated = [];
    for (const outil of outils) {
      const designation = form[`designation-${outil.id}`].value.trim();
      const description = form[`description-${outil.id}`].value.trim();
      const icone = form[`icone-${outil.id}`].value.trim();

      if (!designation) {
        throw new Error(`La désignation est obligatoire pour « ${outil.code} ».`);
      }

      const { data } = await updateOutil(outil.id, {
        designation,
        description,
        icone,
        ordre: outil.ordre,
      });
      updated.push(data);
    }

    outils = updated;
    renderOutils();
    showSuccess("Outils enregistrés.");
    showToast("Configuration mise à jour");
  } catch (err) {
    showError(err.message || "Impossible d'enregistrer les outils.");
  } finally {
    saveBtn.textContent = "Enregistrer les outils";
    saveBtn.disabled = !canManageOutils;
  }
});

(async () => {
  currentUser = (await requireAuth()) || getStoredUser();
  if (!currentUser) return;

  canManageOutils = currentUser.role === "Reine";

  try {
    const { data } = await fetchOutils();
    outils = data || [];
    renderOutils();
    if (page) page.hidden = false;
  } catch (err) {
    if (page) page.hidden = false;
    showError(err.message || "Impossible de charger les outils.");
  }
})();
