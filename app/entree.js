import {
  requireAuth,
  getStoredUser,
  fetchOutil,
  fetchEntree,
  fetchEntrees,
  createEntree,
  updateEntree,
  deleteEntree,
  uploadPieceJointe,
  deletePieceJointe,
  fetchPieceJointeBlob,
} from "./auth.js";

const page = document.querySelector(".page-entree");
const backLink = document.getElementById("backLink");
const cancelLink = document.getElementById("entreeCancel");
const outilLabel = document.getElementById("outilLabel");
const pageTitle = document.getElementById("pageTitle");
const viewPanel = document.getElementById("entreeView");
const viewDesignation = document.getElementById("viewDesignation");
const viewNotes = document.getElementById("viewNotes");
const viewPieces = document.getElementById("viewPieces");
const viewError = document.getElementById("viewError");
const viewActions = document.getElementById("viewActions");
const viewEdit = document.getElementById("viewEdit");
const viewDelete = document.getElementById("viewDelete");
const form = document.getElementById("entreeForm");
const designationInput = document.getElementById("entreeDesignation");
const notesInput = document.getElementById("entreeNotes");
const formPieces = document.getElementById("formPieces");
const filesInput = document.getElementById("entreeFiles");
const entreeError = document.getElementById("entreeError");
const submitBtn = document.getElementById("entreeSubmit");
const toast = document.getElementById("toast");

const params = new URLSearchParams(window.location.search);
const outilCode = params.get("code");
const entreeId = params.get("id");
const isCreate = !entreeId;
const isEdit = Boolean(entreeId) && params.get("edit") === "1";
const isView = Boolean(entreeId) && !isEdit;

const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".svg", ".pdf"]);

let toastTimer;
let currentPieces = [];
let pendingFiles = [];
let blobUrls = [];

function listUrl() {
  return `./outil.html?code=${encodeURIComponent(outilCode || "")}`;
}

function editUrl() {
  return `./entree.html?code=${encodeURIComponent(outilCode)}&id=${encodeURIComponent(entreeId)}&edit=1`;
}

function viewUrl(id = entreeId) {
  return `./entree.html?code=${encodeURIComponent(outilCode)}&id=${encodeURIComponent(id)}`;
}

function showPage() {
  if (page) page.hidden = false;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function showFormError(message) {
  entreeError.textContent = message;
  entreeError.hidden = false;
}

function clearFormError() {
  entreeError.hidden = true;
  entreeError.textContent = "";
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
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (/^mailto:/i.test(value) || /^tel:/i.test(value)) return value;
  return `https://${value}`;
}

function notesFromEntree(entree) {
  const contenu = String(entree?.contenu || "").trim();
  const lien = String(entree?.lien || "").trim();
  if (contenu && lien && contenu !== lien) {
    return `${contenu}\n${lien}`;
  }
  return contenu || lien || "";
}

function renderNotesHtml(text) {
  const value = String(text || "").trim();
  if (!value) return "—";

  const urlPattern =
    /(https?:\/\/[^\s<]+|mailto:[^\s<]+|tel:[^\s<]+|(?:www\.)[^\s<]+)/gi;

  let html = "";
  let lastIndex = 0;
  let match;
  while ((match = urlPattern.exec(value)) !== null) {
    html += escapeHtml(value.slice(lastIndex, match.index));
    const raw = match[0];
    html += `<a href="${escapeHtml(linkHref(raw))}" target="_blank" rel="noopener noreferrer">${escapeHtml(raw)}</a>`;
    lastIndex = match.index + raw.length;
  }
  html += escapeHtml(value.slice(lastIndex));
  return html;
}

function fileExt(name) {
  const match = String(name || "").toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

function formatSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

function canEditEntree(entree, user) {
  if (!entree || !user) return false;
  if (entree.can_edit === true) return true;
  if (user.role === "Reine") return true;
  if (entree.created_by == null) return false;
  return Number(entree.created_by) === Number(user.id);
}

function applyOutil(data) {
  outilLabel.textContent = data.designation;
  backLink.href = listUrl();
  if (cancelLink) {
    cancelLink.href = isEdit ? viewUrl() : listUrl();
  }
}

function revokeBlobUrls() {
  for (const url of blobUrls) URL.revokeObjectURL(url);
  blobUrls = [];
}

async function openPiece(piece) {
  try {
    const blob = await fetchPieceJointeBlob(outilCode, piece.entree_id || entreeId, piece.id);
    const url = URL.createObjectURL(blob);
    blobUrls.push(url);
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (err) {
    showToast(err.message || "Ouverture impossible");
  }
}

function renderPiecesList(container, pieces, { canManage = false, emptyText = "Aucune pièce jointe." } = {}) {
  if (!container) return;

  if (!pieces.length && !pendingFiles.length) {
    container.innerHTML = `<p class="pieces-empty">${escapeHtml(emptyText)}</p>`;
    return;
  }

  const savedHtml = pieces
    .map(
      (piece) => `
      <div class="piece-item" data-piece-id="${piece.id}">
        <div class="piece-meta">
          <button class="piece-link" type="button" data-open-piece="${piece.id}">
            ${escapeHtml(piece.nom)}
          </button>
          <span class="piece-size">${escapeHtml(formatSize(piece.taille))}</span>
        </div>
        ${
          canManage
            ? `<button class="btn-piece-delete" type="button" data-delete-piece="${piece.id}">Retirer</button>`
            : ""
        }
      </div>`
    )
    .join("");

  const pendingHtml = pendingFiles
    .map(
      (file, index) => `
      <div class="piece-item piece-item-pending" data-pending-index="${index}">
        <div class="piece-meta">
          <span class="piece-pending-name">${escapeHtml(file.name)}</span>
          <span class="piece-size">${escapeHtml(formatSize(file.size))} · en attente</span>
        </div>
        <button class="btn-piece-delete" type="button" data-remove-pending="${index}">Retirer</button>
      </div>`
    )
    .join("");

  container.innerHTML = savedHtml + pendingHtml;

  container.querySelectorAll("[data-open-piece]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const piece = pieces.find((p) => Number(p.id) === Number(btn.dataset.openPiece));
      if (piece) openPiece(piece);
    });
  });

  container.querySelectorAll("[data-delete-piece]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.deletePiece);
      if (!window.confirm("Retirer cette pièce jointe ?")) return;
      btn.disabled = true;
      try {
        await deletePieceJointe(outilCode, entreeId, id);
        currentPieces = currentPieces.filter((p) => Number(p.id) !== id);
        renderFormPieces();
        showToast("Pièce jointe retirée");
      } catch (err) {
        showFormError(err.message || "Suppression impossible.");
        btn.disabled = false;
      }
    });
  });

  container.querySelectorAll("[data-remove-pending]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.removePending);
      pendingFiles = pendingFiles.filter((_, i) => i !== index);
      renderFormPieces();
    });
  });
}

function renderViewPieces(pieces) {
  renderPiecesList(viewPieces, pieces, {
    canManage: false,
    emptyText: "Aucune pièce jointe.",
  });
}

function renderFormPieces() {
  renderPiecesList(formPieces, currentPieces, {
    canManage: !isCreate,
    emptyText: "Aucun fichier pour l’instant.",
  });
}

function renderViewContent(entree) {
  const notes = notesFromEntree(entree);
  viewNotes.innerHTML = renderNotesHtml(notes);
  currentPieces = entree.pieces_jointes || [];
  renderViewPieces(currentPieces);
}

function hidePanels() {
  viewPanel.hidden = true;
  viewActions.hidden = true;
  form.hidden = true;
}

function fillForm(entree = null) {
  designationInput.value = entree?.designation || "";
  notesInput.value = entree ? notesFromEntree(entree) : "";
  currentPieces = entree?.pieces_jointes || [];
  pendingFiles = [];
  if (filesInput) filesInput.value = "";
  renderFormPieces();
}

function validatePendingFiles(files) {
  const accepted = [];
  for (const file of files) {
    const ext = fileExt(file.name);
    if (!ALLOWED_EXT.has(ext)) {
      throw new Error(`« ${file.name} » : formats acceptés PNG, JPG, SVG, PDF.`);
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`« ${file.name} » dépasse 10 Mo.`);
    }
    accepted.push(file);
  }
  return accepted;
}

async function uploadPending(targetEntreeId) {
  for (const file of pendingFiles) {
    await uploadPieceJointe(outilCode, targetEntreeId, file);
  }
  pendingFiles = [];
}

async function loadEntreeDetails() {
  try {
    return await fetchEntree(outilCode, entreeId);
  } catch {
    const { outil, data } = await fetchEntrees(outilCode);
    const entree = (data || []).find(
      (row) => Number(row.id) === Number(entreeId)
    );
    if (!entree) {
      const err = new Error("Entrée introuvable.");
      err.status = 404;
      throw err;
    }
    return { outil, data: entree };
  }
}

(async () => {
  if (!outilCode) {
    window.location.replace("./index.html");
    return;
  }

  backLink.href = listUrl();
  showPage();

  const user = (await requireAuth()) || getStoredUser();
  if (!user) return;

  hidePanels();

  filesInput?.addEventListener("change", () => {
    clearFormError();
    try {
      const selected = validatePendingFiles([...filesInput.files]);
      pendingFiles = [...pendingFiles, ...selected];
      filesInput.value = "";
      renderFormPieces();
    } catch (err) {
      showFormError(err.message);
      filesInput.value = "";
    }
  });

  try {
    if (isCreate) {
      pageTitle.textContent = "Ajouter une entrée";
      submitBtn.textContent = "Ajouter";
      form.hidden = false;
      fillForm();
      const { data: outilData } = await fetchOutil(outilCode);
      applyOutil(outilData);
      document.title = `Ajouter — ${outilData.designation}`;
      designationInput.focus();
    } else {
      const { outil: outilData, data: entree } = await loadEntreeDetails();
      applyOutil(outilData);
      const allowed = canEditEntree(entree, user);

      if (isView) {
        pageTitle.textContent = entree.designation || "Entrée";
        document.title = `${entree.designation} — ${outilData.designation}`;
        viewDesignation.textContent = entree.designation || "—";
        renderViewContent(entree);
        viewPanel.hidden = false;
        if (allowed) {
          viewActions.hidden = false;
          viewEdit.href = editUrl();
        }
      } else {
        if (!allowed) {
          window.location.replace(viewUrl());
          return;
        }
        pageTitle.textContent = "Modifier l'entrée";
        submitBtn.textContent = "Enregistrer";
        form.hidden = false;
        fillForm(entree);
        document.title = `Modifier — ${outilData.designation}`;
        designationInput.focus();
      }
    }
  } catch (err) {
    hidePanels();
    pageTitle.textContent = "Entrée introuvable";
    viewError.textContent = err.message || "Impossible de charger cette entrée.";
    viewError.hidden = false;
    viewPanel.hidden = false;
    viewDesignation.textContent = "—";
    viewNotes.textContent = "—";
    viewPieces.innerHTML = "";
    showToast(err.message || "Chargement impossible");
  }

  viewDelete.addEventListener("click", async () => {
    if (!window.confirm("Supprimer cette entrée ?")) return;
    viewDelete.disabled = true;
    try {
      await deleteEntree(outilCode, entreeId);
      window.location.replace(listUrl());
    } catch (err) {
      viewError.textContent = err.message || "Suppression impossible.";
      viewError.hidden = false;
      viewDelete.disabled = false;
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFormError();

    const designation = designationInput.value.trim();
    const contenu = notesInput.value.trim();

    if (!designation) {
      showFormError("La désignation est obligatoire.");
      designationInput.focus();
      return;
    }

    submitBtn.disabled = true;
    const previous = submitBtn.textContent;
    submitBtn.textContent = isEdit ? "Enregistrement…" : "Ajout…";

    const payload = {
      designation,
      type: "note",
      contenu,
      lien: "",
    };

    try {
      if (isEdit) {
        await updateEntree(outilCode, entreeId, payload);
        if (pendingFiles.length) {
          await uploadPending(entreeId);
        }
        window.location.replace(viewUrl());
      } else {
        const { data } = await createEntree(outilCode, payload);
        if (pendingFiles.length) {
          await uploadPending(data.id);
        }
        window.location.replace(viewUrl(data.id));
      }
    } catch (err) {
      showFormError(err.message || "Enregistrement impossible.");
      submitBtn.disabled = false;
      submitBtn.textContent = previous;
    }
  });

  window.addEventListener("beforeunload", revokeBlobUrls);
})();
