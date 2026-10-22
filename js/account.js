import {
  getAuthProviders,
  getCurrentUser,
  loginUser,
  registerUser,
  resendVerification,
  updateAuthNav
} from "./auth.js?v=reliability-1";
import { initCurrencySelector } from "./currency.js?v=account-oauth-1";
import { applyTranslations, initLanguageSelector, getLanguage, t } from "./i18n.js?v=author-1";

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const resendForm = document.getElementById("resendForm");
const authMessage = document.getElementById("authMessage");
const googleAuthButton = document.getElementById("googleAuthButton");
const oauthSetupHint = document.getElementById("oauthSetupHint");
const resetParams = new URLSearchParams(location.hash.slice(1));
let resetToken = resetParams.get("reset") || "";
const resetMode = resetParams.has("reset");
if (resetMode) {
  history.replaceState(null, "", location.pathname + location.search);
  if (["no", "en", "ru"].includes(resetParams.get("lang"))) {
    localStorage.setItem("tripplannerLanguage", resetParams.get("lang"));
  }
}
const resetCopy = {
  forgot: ["Glemt passord?", "Forgot password?", "Забыли пароль?"],
  send: ["Send lenke", "Send reset link", "Отправить ссылку"],
  newPassword: ["Nytt passord", "New password", "Новый пароль"],
  confirm: ["Gjenta passordet", "Confirm password", "Повтори пароль"],
  save: ["Lagre nytt passord", "Save new password", "Сохранить новый пароль"],
  hint: ["Minst 12 tegn, maks 72 byte.", "At least 12 characters, up to 72 bytes.", "Минимум 12 символов, максимум 72 байта."],
  resetSent: ["Hvis kontoen finnes, sender vi en lenke. Sjekk også søppelpost.", "If the account exists, we will send a reset link. Check your spam folder too.", "Если аккаунт существует, мы отправим ссылку. Проверь также папку «Спам»."],
  resetDone: ["Passordet er endret. Logg inn med det nye passordet.", "Password changed. Sign in with your new password.", "Пароль изменён. Войди с новым паролем."],
  resetInvalid: ["Lenken er ugyldig eller utløpt. Be om en ny.", "This link is invalid or expired. Request a new one.", "Ссылка недействительна или устарела. Запроси новую."],
  resetLimited: ["For mange forsøk. Prøv igjen om 15 minutter.", "Too many attempts. Try again in 15 minutes.", "Слишком много попыток. Попробуй через 15 минут."],
  resetUnavailable: ["Kunne ikke fullføre. Prøv igjen senere.", "Unable to complete the request. Try again later.", "Не удалось выполнить запрос. Попробуй позже."],
  resetEmail: ["Skriv inn en gyldig e-postadresse.", "Enter a valid email address.", "Введи корректный email."],
  resetPassword: ["Bruk minst 12 tegn og maks 72 byte.", "Use at least 12 characters and no more than 72 bytes.", "Пароль должен содержать минимум 12 символов и не более 72 байт."],
  mismatch: ["Passordene er ikke like.", "Passwords do not match.", "Пароли не совпадают."]
};
let resetMessageKey = "";
function resetText(key) {
  return (resetCopy[key] || resetCopy.resetUnavailable)[{ no: 0, en: 1, ru: 2 }[getLanguage()] ?? 0];
}
function renderResetText() {
  document.querySelectorAll("[data-reset-text]").forEach((element) => {
    element.textContent = resetText(element.dataset.resetText);
  });
  document.getElementById("resetMessage").textContent = resetMessageKey ? resetText(resetMessageKey) : "";
}
function resetNotice(key, success = false) {
  resetMessageKey = key;
  document.getElementById("resetMessage").classList.toggle("error", !success);
  document.getElementById("resetMessage").classList.toggle("success", success);
  renderResetText();
}
const passwordHelp = document.getElementById("passwordHelp");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const resetPasswordForm = document.getElementById("resetPasswordForm");
// Explicit display also handles older global form styles that override [hidden].
function resetFormVisible(visible) {
  resetPasswordForm.hidden = !visible;
  resetPasswordForm.style.display = visible ? "" : "none";
  forgotPasswordForm.hidden = visible;
  forgotPasswordForm.style.display = visible ? "none" : "";
}
resetFormVisible(resetMode);
passwordHelp.open = resetMode;
passwordHelp.addEventListener("toggle", () => {
  if (passwordHelp.open && !resetToken && !document.getElementById("resetEmail").value) {
    document.getElementById("resetEmail").value = document.getElementById("loginEmail").value;
  }
});
async function submitReset(form, endpoint, body) {
  const button = form.querySelector("button");
  button.disabled = true;
  try {
    const response = await fetch(endpoint, { method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    resetNotice(response.ok ? result.message : result.error, response.ok);
    if (response.ok && endpoint === "/api/reset-password") {
      resetToken = "";
      resetPasswordForm.reset();
      resetFormVisible(false);
    } else if (result.error === "resetInvalid") {
      resetToken = "";
      resetPasswordForm.reset();
      resetFormVisible(false);
    }
  } catch { resetNotice("resetUnavailable"); }
  finally { button.disabled = false; }
}
forgotPasswordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitReset(forgotPasswordForm, "/api/forgot-password", {
    email: document.getElementById("resetEmail").value, language: getLanguage()
  });
});
resetPasswordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = document.getElementById("newPassword").value;
  if (password !== document.getElementById("confirmPassword").value) return resetNotice("mismatch");
  if (new TextEncoder().encode(password).length > 72) return resetNotice("resetPassword");
  submitReset(resetPasswordForm, "/api/reset-password", { token: resetToken, password });
});
document.addEventListener("languagechange", renderResetText);
renderResetText();
if (resetMode) requestAnimationFrame(() => passwordHelp.scrollIntoView({ block: "center" }));

const accountResponses = {
  "Feil e-post eller passord.": ["Incorrect email or password.", "Неверный email или пароль."],
  "Bekreft e-posten din før du logger inn.": ["Verify your email before signing in.", "Подтверди email перед входом."],
  "For mange forsøk. Prøv igjen om 15 minutter.": ["Too many attempts. Try again in 15 minutes.", "Слишком много попыток. Попробуй через 15 минут."],
  "Skriv inn en gyldig e-postadresse.": ["Enter a valid email address.", "Введи корректный email."],
  "Skriv inn e-postadressen din.": ["Enter your email address.", "Введи свой email."],
  "Passordet må ha minst 4 tegn.": ["The password must contain at least 4 characters.", "Пароль должен содержать минимум 4 символа."],
  "Det finnes allerede en bruker med denne e-posten.": ["An account with this email already exists.", "Аккаунт с этим email уже существует."],
  "Fant ingen bruker med denne e-posten.": ["No account was found with this email.", "Аккаунт с таким email не найден."],
  "Denne e-posten er allerede bekreftet.": ["This email is already verified.", "Этот email уже подтверждён."],
  "E-postoppsett mangler på serveren.": ["Email delivery is unavailable. Please try later.", "Отправка писем сейчас недоступна. Попробуй позже."],
  "Kunne ikke starte en trygg session.": ["Could not start a secure session. Please try again.", "Не удалось начать безопасную сессию. Попробуй ещё раз."],
  "Kunne ikke lagre innloggingen. Prøv igjen senere.": ["Could not save your session. Please try later.", "Не удалось сохранить вход. Попробуй позже."],
  "Kontoen ble opprettet. Sjekk e-posten din og trykk på bekreftelseslenken.": ["Account created. Check your email for the verification link.", "Аккаунт создан. Перейди по ссылке подтверждения в письме."],
  "En ny bekreftelseslenke ble sendt.": ["A new verification link has been sent.", "Новая ссылка подтверждения отправлена."],
  "Noe gikk galt.": ["Something went wrong. Please try again.", "Произошла ошибка. Попробуй ещё раз."]
};
let currentAccountMessage = "";

function renderAccountMessage() {
  const language = getLanguage();
  const translated = accountResponses[currentAccountMessage];
  authMessage.textContent = translated && language !== "no"
    ? translated[language === "ru" ? 1 : 0] : currentAccountMessage;
}

function showMessage(message, type = "error") {
  currentAccountMessage = message;
  renderAccountMessage();
  authMessage.classList.add("auth-message", "account-message");
  authMessage.classList.toggle("error", type === "error");
  authMessage.classList.toggle("success", type === "success");
}
document.addEventListener("languagechange", renderAccountMessage);

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

  if (user && !resetMode) {
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




