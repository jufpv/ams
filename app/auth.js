const TOKEN_KEY = "ams_token";
const USER_KEY = "ams_user";

export const API_BASE =
  window.AMS_API_BASE ||
  (window.location.port === "3001" ? "/api" : "http://127.0.0.1:3001/api");

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
  const headers = {
    "Content-Type": "application/json",
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
