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
  resetMailUnavailable: ["E-postsending er ikke konfigurert. Kontakt nettstedets administrator.", "Email delivery is not configured. Contact the site administrator.", "Отправка писем не настроена. Обратись к администратору сайта."],
  resetOrigin: ["Forespørselen ble avvist. Åpne nettstedets hovedadresse og prøv igjen.", "The request was rejected. Open the site's main address and try again.", "Запрос отклонён. Открой основной адрес сайта и попробуй ещё раз."],
  forgot: ["Glemt passord?", "Forgot password?", "Забыли пароль?"],
  send: ["Send lenke", "Send reset link", "Отправить ссылку"],
  newPassword: ["Nytt passord", "New password", "Новый пароль"],
  confirm: ["Gjenta passordet", "Confirm password", "Повтори пароль"],
  save: ["Lagre nytt passord", "Save new password", "Сохранить новый пароль"],
  hint: ["Minst 9 tegn, maks 72 byte.", "At least 9 characters, up to 72 bytes.", "Минимум 9 символов, максимум 72 байта."],
  resetSent: ["Hvis kontoen finnes, sender vi en lenke. Sjekk også søppelpost.", "If the account exists, we will send a reset link. Check your spam folder too.", "Если аккаунт существует, мы отправим ссылку. Проверь также папку «Спам»."],
  resetDone: ["Passordet er endret. Logg inn med det nye passordet.", "Password changed. Sign in with your new password.", "Пароль изменён. Войди с новым паролем."],
  resetInvalid: ["Lenken er ugyldig eller utløpt. Be om en ny.", "This link is invalid or expired. Request a new one.", "Ссылка недействительна или устарела. Запроси новую."],
  resetLimited: ["For mange forsøk. Prøv igjen om 15 minutter.", "Too many attempts. Try again in 15 minutes.", "Слишком много попыток. Попробуй через 15 минут."],
  resetUnavailable: ["Kunne ikke fullføre. Prøv igjen senere.", "Unable to complete the request. Try again later.", "Не удалось выполнить запрос. Попробуй позже."],
  resetEmail: ["Skriv inn en gyldig e-postadresse.", "Enter a valid email address.", "Введи корректный email."],
  resetPassword: ["Bruk minst 9 tegn og maks 72 byte.", "Use at least 9 characters and no more than 72 bytes.", "Пароль должен содержать минимум 9 символов и не более 72 байт."],
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
    resetNotice(response.ok ? result.message : response.status === 403 ? "resetOrigin" : result.error, response.ok);
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
  "Passordet må ha minst 9 tegn og maks 72 byte.": ["Use at least 9 characters and no more than 72 UTF-8 bytes.", "Пароль должен содержать минимум 9 символов и не более 72 байт UTF-8."],
  "Passordet må ha minst 12 tegn og maks 72 byte.": ["Use at least 12 characters and no more than 72 UTF-8 bytes.", "Пароль должен содержать минимум 12 символов и не более 72 байт UTF-8."],
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

const passwordCopy = {
  ru: {show:"Показать пароль",hide:"Скрыть пароль",label:"Примерная надёжность",levels:["Очень слабый","Слабый","Средний","Хороший","Надёжный"],empty:"Минимум 9 символов. Оценка и советы необязательны.",long:"Совет: попробуй длинную фразу из нескольких несвязанных слов.",unique:"Совет: не используй имя, email, повторы или последовательности вроде 12345.",good:"Используй этот пароль только для этого аккаунта.",unavailable:"Оценка временно недоступна. Минимум 9 символов.",bytes:"Пароль превышает 72 байта UTF-8. Сократи его."},
  en: {show:"Show password",hide:"Hide password",label:"Estimated strength",levels:["Very weak","Weak","Fair","Good","Strong"],empty:"At least 9 characters. The score and suggestions are optional.",long:"Tip: try a longer phrase with several unrelated words.",unique:"Tip: avoid your name, email, repetition and sequences such as 12345.",good:"Use this password only for this account.",unavailable:"Strength estimate unavailable. At least 9 characters.",bytes:"Password exceeds 72 UTF-8 bytes. Shorten it."},
  no: {show:"Vis passord",hide:"Skjul passord",label:"Anslått styrke",levels:["Svært svakt","Svakt","Middels","Godt","Sterkt"],empty:"Minst 9 tegn. Vurderingen og rådene er valgfrie.",long:"Tips: prøv en lengre frase med flere urelaterte ord.",unique:"Tips: unngå navn, e-post, gjentakelser og sekvenser som 12345.",good:"Bruk dette passordet bare for denne kontoen.",unavailable:"Styrkevurdering er utilgjengelig. Minst 9 tegn.",bytes:"Passordet overstiger 72 UTF-8 byte. Gjør det kortere."}
};
const passwordControls = [];
for (const id of ["loginPassword", "registerPassword", "newPassword", "confirmPassword"]) {
  const input = document.getElementById(id);
  const wrapper = document.createElement("div");
  wrapper.className = "password-field";
  input.before(wrapper);
  wrapper.append(input);
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "password-visibility";
  toggle.setAttribute("aria-controls", id);
  wrapper.append(toggle);
  let meter, caption, tip;
  if (id === "registerPassword" || id === "newPassword") {
    const feedback = document.createElement("div");
    feedback.className = "password-feedback";
    feedback.id = id + "Feedback";
    meter = document.createElement("meter");
    meter.min = 0; meter.max = 4; meter.low = 2; meter.high = 3; meter.optimum = 4;
    caption = document.createElement("p");
    tip = document.createElement("p");
    feedback.append(meter, caption, tip);
    wrapper.after(feedback);
    input.setAttribute("aria-describedby", feedback.id);
  }
  const render = () => {
    const text = passwordCopy[getLanguage()] || passwordCopy.en;
    const visible = input.type === "text";
    toggle.title = visible ? text.hide : text.show;
    toggle.setAttribute("aria-label", toggle.title);
    toggle.setAttribute("aria-pressed", String(visible));
    toggle.classList.toggle("is-visible", visible);
    if (!meter) return;
    const value = input.value;
    const tooLong = new TextEncoder().encode(value).length > 72;
    input.setCustomValidity(tooLong ? text.bytes : "");
    meter.setAttribute("aria-label", text.label);
    if (!value || typeof window.zxcvbn !== "function") {
      meter.hidden = true;
      caption.textContent = "";
      tip.textContent = tooLong ? text.bytes : value ? text.unavailable : text.empty;
      return;
    }
    const personal = ["registerName","registerEmail","loginEmail"].map(key => document.getElementById(key)?.value || "").filter(Boolean);
    const result = window.zxcvbn(value, personal);
    meter.hidden = false;
    meter.value = result.score;
    meter.setAttribute("aria-valuetext", text.levels[result.score]);
    caption.textContent = text.label + ": " + text.levels[result.score];
    tip.textContent = tooLong ? text.bytes : result.score >= 3 ? text.good : value.length < 16 ? text.long : text.unique;
  };
  toggle.addEventListener("click", () => {
    const start = input.selectionStart, end = input.selectionEnd;
    input.type = input.type === "password" ? "text" : "password";
    render();
    input.focus({preventScroll:true});
    if (start !== null) input.setSelectionRange(start, end);
  });
  input.addEventListener("input", render);
  input.form?.addEventListener("reset", () => setTimeout(() => {
    input.type = "password"; render();
  }, 0));
  passwordControls.push(render);
  render();
}
const refreshPasswordControls = () => passwordControls.forEach(render => render());
document.addEventListener("languagechange", refreshPasswordControls);
window.addEventListener("load", refreshPasswordControls);
for (const id of ["registerName", "registerEmail"]) document.getElementById(id).addEventListener("input", refreshPasswordControls);

showVerificationMessageFromUrl();
initCurrencySelector();
initLanguageSelector();
applyTranslations();
initOAuthProviders();
redirectIfLoggedIn();




