import {
  getAuthProviders,
  getCurrentUser,
  loginUser,
  registerUser,
  resendVerification,
  updateAuthNav
} from "./auth.js?v=reliability-1";
import { initCurrencySelector } from "./currency.js?v=account-oauth-1";
import { applyTranslations, initLanguageSelector, t } from "./i18n.js?v=reliability-1";

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const resendForm = document.getElementById("resendForm");
const authMessage = document.getElementById("authMessage");
const googleAuthButton = document.getElementById("googleAuthButton");
const oauthSetupHint = document.getElementById("oauthSetupHint");

function showMessage(message, type = "error") {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

function showVerificationMessageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const verified = params.get("verified");
  const oauth = params.get("oauth");

  if (verified === "success") {
    showMessage(t("account.verified"), "success");
  } else if (verified === "expired") {
    showMessage(t("account.expired"), "error");
  } else if (verified === "invalid") {
    showMessage(t("account.invalid"), "error");
  } else if (verified === "missing") {
    showMessage(t("account.missing"), "error");
  }

  if (oauth === "google_unconfigured") {
    showMessage(t("account.googleSetup"), "error");
  } else if (oauth === "cancelled") {
    showMessage(t("account.oauthCancelled"), "error");
  } else if (oauth === "invalid") {
    showMessage(t("account.oauthInvalid"), "error");
  } else if (oauth === "timeout") {
    showMessage(t("account.oauthTimeout"), "error");
  } else if (oauth === "failed" || oauth === "session") {
    showMessage(t("account.oauthFailed"), "error");
  }

  if (verified || oauth) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

async function initOAuthProviders() {
  const providers = await getAuthProviders();
  const googleEnabled = Boolean(providers.google?.enabled);

  if (!googleAuthButton) {
    return;
  }

  googleAuthButton.classList.toggle("disabled", !googleEnabled);
  googleAuthButton.setAttribute("aria-disabled", String(!googleEnabled));
  oauthSetupHint.hidden = googleEnabled;

  googleAuthButton.addEventListener("click", (event) => {
    if (!googleEnabled) {
      event.preventDefault();
      showMessage(t("account.googleSetup"), "error");
    }
  });
}

async function redirectIfLoggedIn() {
  const user = await getCurrentUser();
  await updateAuthNav();

  if (user) {
    window.location.href = "profile.html";
  }
}

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("registerEmail").value;
  const result = await registerUser({
    name: document.getElementById("registerName").value,
    email,
    password: document.getElementById("registerPassword").value
  });

  if (result.error) {
    showMessage(result.error);
    return;
  }

  registerForm.reset();
  document.getElementById("resendEmail").value = email;
  showMessage(result.message || t("account.checkEmail"), "success");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const result = await loginUser({
    email,
    password: document.getElementById("loginPassword").value
  });

  if (result.error) {
    if (result.status === 403) {
      document.getElementById("resendEmail").value = email;
    }
    showMessage(result.error);
    return;
  }

  window.location.href = "profile.html";
});

resendForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const result = await resendVerification(document.getElementById("resendEmail").value);

  if (result.error) {
    showMessage(result.error);
    return;
  }

  showMessage(result.message || t("account.resendSent"), "success");
});

showVerificationMessageFromUrl();
initCurrencySelector();
initLanguageSelector();
applyTranslations();
initOAuthProviders();
redirectIfLoggedIn();




