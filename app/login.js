import { getToken, login, fetchMe } from "./auth.js";

const form = document.getElementById("loginForm");
const errorEl = document.getElementById("loginError");
const submitBtn = document.getElementById("loginSubmit");

async function redirectIfAuthenticated() {
  if (!getToken()) return;
  try {
    await fetchMe();
    window.location.replace("./index.html");
  } catch {
    // session invalide : rester sur la page de login
  }
}

function showError(message) {
  errorEl.hidden = false;
  errorEl.textContent = message;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email || !password) {
    showError("Veuillez renseigner votre email et votre mot de passe.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Connexion…";

  try {
    await login(email, password);
    window.location.replace("./index.html");
  } catch (err) {
    showError(err.message || "Connexion impossible.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Se connecter";
  }
});

redirectIfAuthenticated();
