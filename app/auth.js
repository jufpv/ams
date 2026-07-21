const TOKEN_KEY = "ams_token";
const USER_KEY = "ams_user";

export const API_BASE =
  window.AMS_API_BASE ||
  (window.location.protocol === "file:"
    ? "http://127.0.0.1:3102/api"
    : "/api");

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function setSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function api(path, options = {}) {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const error = new Error(payload?.message || "Erreur réseau");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function login(email, password) {
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setSession(data);
  return data;
}

export async function fetchMe() {
  return api("/auth/me");
}

export async function updateProfile(payload) {
  const data = await api("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  setSession(data);
  return data;
}

export async function fetchOutils() {
  return api("/outils");
}

export async function fetchMembres({ q = "" } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const query = params.toString();
  return api(`/membres${query ? `?${query}` : ""}`);
}

export async function createOutil(payload) {
  return api("/outils", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateOutil(id, payload) {
  return api(`/outils/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteOutil(id) {
  return api(`/outils/${id}`, {
    method: "DELETE",
  });
}

export async function fetchOutil(idOrCode) {
  return api(`/outils/${encodeURIComponent(idOrCode)}`);
}

export async function fetchEntrees(idOrCode, { q = "" } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const query = params.toString();
  return api(
    `/outils/${encodeURIComponent(idOrCode)}/entrees${query ? `?${query}` : ""}`
  );
}

export async function fetchEntree(idOrCode, entreeId) {
  return api(
    `/outils/${encodeURIComponent(idOrCode)}/entrees/${encodeURIComponent(entreeId)}`
  );
}

export async function createEntree(idOrCode, payload) {
  return api(`/outils/${encodeURIComponent(idOrCode)}/entrees`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEntree(idOrCode, entreeId, payload) {
  return api(
    `/outils/${encodeURIComponent(idOrCode)}/entrees/${encodeURIComponent(entreeId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteEntree(idOrCode, entreeId) {
  return api(
    `/outils/${encodeURIComponent(idOrCode)}/entrees/${encodeURIComponent(entreeId)}`,
    {
      method: "DELETE",
    }
  );
}

export async function uploadPieceJointe(idOrCode, entreeId, file) {
  const body = new FormData();
  body.append("fichier", file);
  return api(
    `/outils/${encodeURIComponent(idOrCode)}/entrees/${encodeURIComponent(entreeId)}/pieces-jointes`,
    {
      method: "POST",
      body,
    }
  );
}

export async function deletePieceJointe(idOrCode, entreeId, pieceId) {
  return api(
    `/outils/${encodeURIComponent(idOrCode)}/entrees/${encodeURIComponent(entreeId)}/pieces-jointes/${encodeURIComponent(pieceId)}`,
    {
      method: "DELETE",
    }
  );
}

export function pieceJointeFilePath(idOrCode, entreeId, pieceId) {
  return `${API_BASE}/outils/${encodeURIComponent(idOrCode)}/entrees/${encodeURIComponent(entreeId)}/pieces-jointes/${encodeURIComponent(pieceId)}/fichier`;
}

export async function fetchPieceJointeBlob(idOrCode, entreeId, pieceId) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(pieceJointeFilePath(idOrCode, entreeId, pieceId), {
    headers,
  });
  if (!response.ok) {
    throw new Error("Impossible de télécharger la pièce jointe.");
  }
  return response.blob();
}

export async function requireAuth({ redirectTo = "./login.html" } = {}) {
  const token = getToken();
  if (!token) {
    window.location.replace(redirectTo);
    return null;
  }

  try {
    const { user } = await fetchMe();
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    clearSession();
    window.location.replace(redirectTo);
    return null;
  }
}

export function logout({ redirectTo = "./login.html" } = {}) {
  clearSession();
  window.location.replace(redirectTo);
}
