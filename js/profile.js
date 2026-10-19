import {
  addVpnDevice,
  createCardVipPayment,
  createVippsVipPayment,
  deleteAvatar,
  deleteTicket,
  deleteTrip,
  getCurrentUser,
  getVpnProduct,
  createVpnCardPayment,
  createVpnVippsPayment,
  getSavedTrips,
  getSavedTickets,
  getVipProduct,
  getVpnAccount,
  logoutUser,
  removeVpnDevice,
  renameVpnDevice,
  saveAvatar,
  saveTicket,
  updateTripPublication,
  updateAuthNav
} from "./auth.js?v=ticket-wallet-1";
import { formatBudgetText, initCurrencySelector } from "./currency.js?v=currency-menu-1";
import { applyTranslations, initLanguageSelector, getLanguage, t } from "./i18n.js?v=author-1";
import { routeToPlannerDraft, storePlannerDraft } from "./planner-transfer.js";
import { escapeHtml } from "./html-utils.js?v=shared-ui-2";

const profileMessage = document.getElementById("profileMessage");
const profileTitle = document.getElementById("profileTitle");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const profileVipStatus = document.getElementById("profileVipStatus");
const vipBlock = document.querySelector(".vip-block");
const vipDescription = document.getElementById("vipDescription");
const vipConsent = document.getElementById("vipConsent");
const vipConsentText = document.getElementById("vipConsentText");
const buyVipCardBtn = document.getElementById("buyVipCardBtn");
const buyVipVippsBtn = document.getElementById("buyVipVippsBtn");
const savedTrips = document.getElementById("savedTrips");
const logoutBtn = document.getElementById("logoutBtn");
const avatarInput = document.getElementById("avatarInput");
const profileAvatar = document.getElementById("profileAvatar");
const avatarFallback = document.getElementById("avatarFallback");
const avatarDropzone = document.getElementById("avatarDropzone");
const removeAvatarBtn = document.getElementById("removeAvatarBtn");
const ticketUploadForm = document.getElementById("ticketUploadForm");
const ticketFiles = document.getElementById("ticketFiles");
const ticketTripLabel = document.getElementById("ticketTripLabel");
const ticketTravelDate = document.getElementById("ticketTravelDate");
const ticketUploadStatus = document.getElementById("ticketUploadStatus");
const savedTickets = document.getElementById("savedTickets");
const ticketFileLabel = ticketUploadForm.querySelector(".ticket-file-picker span");
const vpnDeviceForm = document.getElementById("vpnDeviceForm");
const vpnDeviceName = document.getElementById("vpnDeviceName");
const vpnDevicePlatform = document.getElementById("vpnDevicePlatform");
const vpnDeviceMessage = document.getElementById("vpnDeviceMessage");
const vpnDeviceList = document.getElementById("vpnDeviceList");
const vpnSubscriptionStatus = document.getElementById("vpnSubscriptionStatus");
const vpnDeviceLimit = document.getElementById("vpnDeviceLimit");
const vpnProductDescription = document.getElementById("vpnProductDescription");
const vpnPurchaseConsent = document.getElementById("vpnPurchaseConsent");
const buyVpnCardBtn = document.getElementById("buyVpnCardBtn");
const buyVpnVippsBtn = document.getElementById("buyVpnVippsBtn");
const vpnPurchaseMessage = document.getElementById("vpnPurchaseMessage");
let currentTrips = [];
let currentTickets = [];
let currentVipProduct = null;

if (location.protocol === "file:") {
  const current = document.querySelector('script[type="module"][src*="profile.js"]');
  if (current) current.src = `./js/profile.js?v=${Date.now()}`;
}

function showMessage(message, type = "success") {
  profileMessage.textContent = message;
  profileMessage.className = `auth-message ${type}`;
}

function clearMessage() {
  profileMessage.textContent = "";
  profileMessage.className = "auth-message";
}

function renderVpnOffer() {
  const labels = {
    ru: ['99 NOK / 30 дней', 'До 5 устройств. Разовая оплата, без автопродления.', 'Оплата пока недоступна', 'Ссылка для ручного подключения появится после настройки 3x-ui. VPN пока недоступен.'],
    en: ['99 NOK / 30 days', 'Up to 5 devices. One-time payment, no automatic renewal.', 'Payment not available yet', 'A manual connection link will appear after 3x-ui is configured. VPN is not available yet.'],
    no: ['99 NOK / 30 dager', 'Opptil 5 enheter. Engangsbetaling, ingen automatisk fornyelse.', 'Betaling er ikke tilgjengelig ennå', 'En lenke for manuell tilkobling blir tilgjengelig når 3x-ui er konfigurert. VPN er ikke tilgjengelig ennå.']
  };
  const text = labels[getLanguage()] || labels.en;
  ['vpnOfferPrice', 'vpnOfferNote', 'vpnBuy', 'vpnConnectionNote'].forEach((id, index) => {
    const element = document.getElementById(id);
    if (element) element.textContent = text[index];
  });
}

function vpnPlatformLabel(platform) {
  return {
    android: "Android",
    windows: "Windows",
    ios: "iPhone / iPad",
    macos: "macOS",
    linux: "Linux",
    other: "Другое"
  }[platform] || "Другое";
}

function renderVpnAccount(subscription, devices) {
  const active = subscription?.plan === "vpn" && subscription?.status === "active"
    && (!subscription.endsAt || new Date(subscription.endsAt).getTime() > Date.now());
  vpnSubscriptionStatus.textContent = active
    ? `VPN активен до ${formatVipDate(subscription.endsAt)}. Подключение появится после настройки сервера.`
    : "VPN не оплачен или срок подписки завершился.";
  vpnDeviceLimit.textContent = `${subscription?.plan === "free" ? "Бесплатно" : subscription?.plan || "VPN"} · ${devices.length}/${subscription?.deviceLimit || 0}`;

  if (!devices.length) {
    vpnDeviceList.innerHTML = "<p>Устройств пока нет. Добавь телефон или компьютер.</p>";
    return;
  }

  vpnDeviceList.innerHTML = devices.map((device) => `
    <article class="vpn-device-card">
      <div>
        <strong>${escapeHtml(device.name)}</strong>
        <p>${vpnPlatformLabel(device.platform)} · добавлено ${new Date(device.createdAt).toLocaleDateString()}</p>
      </div>
      <div class="vpn-device-actions">
        <button type="button" class="secondary-button rename-vpn-device" data-device-id="${device.id}" data-device-name="${escapeHtml(device.name)}">Переименовать</button>
        <button type="button" class="avatar-remove-button remove-vpn-device" data-device-id="${device.id}">Отключить</button>
      </div>
    </article>
  `).join("");
}

async function loadVpnProduct() {
  const result = await getVpnProduct();
  if (result.error || !result.product) {
    vpnProductDescription.textContent = result.error || "Не удалось загрузить тариф.";
    buyVpnCardBtn.disabled = true;
    buyVpnVippsBtn.disabled = true;
    return;
  }
  const product = result.product;
  vpnProductDescription.textContent = `${product.name} · ${product.priceNok} NOK · ${product.durationDays} дней · до ${product.deviceLimit} устройств`;
  buyVpnCardBtn.disabled = !result.providers?.stripe || !result.configured;
  buyVpnVippsBtn.disabled = !result.providers?.vipps || !result.configured;
  if (!result.configured) vpnPurchaseMessage.textContent = "Оплата включится после подключения серверной выдачи VPN-профилей.";
}

async function startVpnPayment(provider) {
  if (!vpnPurchaseConsent.checked) {
    vpnPurchaseMessage.textContent = "Сначала подтвердите условия и цену.";
    vpnPurchaseMessage.className = "auth-message error";
    return;
  }
  const button = provider === "card" ? buyVpnCardBtn : buyVpnVippsBtn;
  button.disabled = true;
  vpnPurchaseMessage.textContent = "Готовим страницу оплаты…";
  vpnPurchaseMessage.className = "auth-message";
  try {
    const result = provider === "card" ? await createVpnCardPayment() : await createVpnVippsPayment();
    if (result.error) {
      vpnPurchaseMessage.textContent = result.error;
      vpnPurchaseMessage.className = "auth-message error";
      return;
    }
    window.location.href = result.url;
  } catch {
    vpnPurchaseMessage.textContent = "Не удалось начать оплату VPN.";
    vpnPurchaseMessage.className = "auth-message error";
  } finally {
    button.disabled = false;
  }
}

async function loadVpnAccount() {
  const result = await getVpnAccount();
  if (result.error) {
    vpnDeviceMessage.textContent = result.error;
    vpnDeviceMessage.className = "auth-message error";
    return;
  }
  vpnDeviceMessage.textContent = "";
  vpnDeviceMessage.className = "auth-message";
  renderVpnAccount(result.subscription, result.devices || []);
}

function renderTrips(trips) {
  currentTrips = trips;

  if (!trips.length) {
    savedTrips.innerHTML = `<p>${t("profile.noRoutes")}</p>`;
    return;
  }

  let html = "";

  trips.forEach((trip, index) => {
    html += `
      <div class="stop-card route-card">
        <h3>${trip.title}</h3>
        <p><strong>${t("profile.days")}</strong> ${trip.days}</p>
        <p><strong>${t("profile.budget")}</strong> ${formatBudgetText(trip.budget)}</p>
        <p><strong>${t("profile.stops")}</strong> ${trip.stops.join(" → ")}</p>
        <p><strong>${t("profile.info")}</strong> ${trip.info}</p>
        <p><strong>${t("profile.publication")}</strong> ${trip.published ? t("profile.published") : t("profile.private")}</p>
        <div class="action-row compact-actions">
          <button type="button" class="load-saved-trip-btn" data-trip-index="${index}">${t("profile.openPlanner")}</button>
          <button type="button" class="publish-saved-trip-btn secondary-button" data-trip-id="${trip.id}" data-published="${trip.published ? "false" : "true"}">
            ${trip.published ? t("profile.unpublish") : t("profile.publish")}
          </button>
          <button type="button" class="delete-saved-trip-btn avatar-remove-button" data-trip-id="${trip.id}">${t("admin.delete")}</button>
        </div>
      </div>
    `;
  });

  savedTrips.innerHTML = html;
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTicketDate(value) {
  if (!value) return t("tickets.noDate");
  return new Intl.DateTimeFormat(getProfileLocale(), { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${value}T12:00:00`));
}

function getProfileLocale() {
  const language = document.documentElement.lang;
  return language === "ru" ? "ru-RU" : language === "en" ? "en-GB" : "nb-NO";
}

function renderTickets(tickets) {
  currentTickets = tickets;
  if (!tickets.length) {
    savedTickets.innerHTML = `<div class="ticket-wallet-empty"><strong>${t("tickets.emptyTitle")}</strong><p>${t("tickets.emptyText")}</p></div>`;
    return;
  }

  savedTickets.innerHTML = tickets.map((ticket) => `
    <article class="ticket-wallet-card">
      <div class="ticket-file-icon" aria-hidden="true">${ticket.mimeType === "application/pdf" ? "PDF" : "IMG"}</div>
      <div class="ticket-wallet-copy">
        <span>${escapeHtml(ticket.tripLabel || t("tickets.defaultLabel"))}</span>
        <strong>${escapeHtml(ticket.fileName)}</strong>
        <small>${formatTicketDate(ticket.travelDate)} · ${formatFileSize(ticket.fileSize)}</small>
      </div>
      <div class="ticket-wallet-actions">
        <a href="${ticket.downloadUrl}" download>${t("tickets.download")}</a>
        <button type="button" class="delete-ticket-btn" data-ticket-id="${ticket.id}" aria-label="${t("tickets.delete")}">${t("tickets.delete")}</button>
      </div>
    </article>
  `).join("");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

async function loadTickets() {
  const result = await getSavedTickets();
  if (result.error) {
    ticketUploadStatus.textContent = result.error;
    ticketUploadStatus.className = "auth-message error";
    return;
  }
  renderTickets(result.tickets);
}

async function uploadSelectedTickets(event) {
  event.preventDefault();
  const files = [...(ticketFiles.files || [])];
  if (!files.length) {
    ticketUploadStatus.textContent = t("tickets.chooseError");
    ticketUploadStatus.className = "auth-message error";
    return;
  }

  const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
  const invalid = files.find((file) => !allowedTypes.has(file.type) || file.size > 5 * 1024 * 1024);
  if (invalid) {
    ticketUploadStatus.textContent = t("tickets.fileError");
    ticketUploadStatus.className = "auth-message error";
    return;
  }

  const uploadButton = document.getElementById("uploadTicketsBtn");
  uploadButton.disabled = true;
  ticketUploadStatus.textContent = t("tickets.uploading", { count: files.length });
  ticketUploadStatus.className = "auth-message success";
  try {
    for (const file of files) {
      const result = await saveTicket({
        fileName: file.name,
        tripLabel: ticketTripLabel.value.trim(),
        travelDate: ticketTravelDate.value,
        dataUrl: await fileToDataUrl(file)
      });
      if (result.error) throw new Error(result.error);
    }
    ticketUploadStatus.textContent = t("tickets.uploaded", { count: files.length });
    ticketFiles.value = "";
    ticketFileLabel.textContent = t("tickets.chooseFiles");
    await loadTickets();
  } catch (error) {
    ticketUploadStatus.textContent = error.message || t("tickets.uploadError");
    ticketUploadStatus.className = "auth-message error";
  } finally {
    uploadButton.disabled = false;
  }
}

function renderLegalConsent() {
  const termsLink = `<a href="terms.html" target="_blank" rel="noopener">${t("profile.terms")}</a>`;
  const privacyLink = `<a href="privacy.html" target="_blank" rel="noopener">${t("profile.privacy")}</a>`;
  vipConsentText.innerHTML = t("profile.vipConsent", {
    terms: termsLink,
    privacy: privacyLink
  });
}

function renderVipProductDescription() {
  return;
}

function renderAvatar(user) {
  const initials = (user.name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";

  avatarFallback.textContent = initials;
  removeAvatarBtn.hidden = !user.avatarUrl;

  if (user.avatarUrl) {
    profileAvatar.src = user.avatarUrl;
    profileAvatar.hidden = false;
    avatarFallback.hidden = true;
    return;
  }

  profileAvatar.removeAttribute("src");
  profileAvatar.hidden = true;
  avatarFallback.hidden = false;
}

function formatVipDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("no-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function renderVip(user) {
  vipBlock.hidden = true;
  profileVipStatus.textContent = t("profile.supportOptional");
  return;
}

async function loadVipProduct() {
  const result = await getVipProduct();

  if (result.error) {
    vipDescription.textContent = t("profile.vipLoadError");
    return;
  }

  currentVipProduct = result.product;
  renderVipProductDescription();
  buyVipCardBtn.disabled = !result.providers?.stripe;
  buyVipVippsBtn.disabled = !result.providers?.vipps;

  if (!result.providers?.stripe) {
    buyVipCardBtn.title = t("profile.stripeNotConfigured");
  }

  if (!result.providers?.vipps) {
    buyVipVippsBtn.title = t("profile.vippsNotConfigured");
  }
}

async function startVipPayment(provider) {
  if (!vipConsent.checked) {
    showMessage(t("profile.acceptTermsError"), "error");
    return;
  }

  const button = provider === "card" ? buyVipCardBtn : buyVipVippsBtn;
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = t("profile.startingPayment");

  try {
    const result = provider === "card"
      ? await createCardVipPayment()
      : await createVippsVipPayment();

    if (result.error) {
      showMessage(result.error, "error");
      return;
    }

    window.location.href = result.url;
  } catch {
    showMessage(t("profile.paymentStartError"), "error");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function renderProfile() {
  const user = await getCurrentUser();
  await updateAuthNav();

  if (!user) {
    window.location.href = "account.html";
    return;
  }

  const trips = await getSavedTrips();
  clearMessage();
  profileTitle.textContent = t("profile.greeting", { name: user.name });
  profileName.textContent = user.name;
  profileEmail.textContent = user.email;
  renderVip(user);
  renderAvatar(user);
  renderTrips(trips);
  await loadTickets();
  document.querySelector(".vpn-account-block").hidden = !user.vpnPreview;
  const vpnPurchase = document.querySelector(".vpn-purchase-block");
  if (vpnPurchase) vpnPurchase.hidden = !user.vpnPreview;
  if (user.vpnPreview) {
    await loadVpnAccount();
    await loadVpnProduct();
  }
}

async function fileToAvatarDataUrl(file) {
  const imageBitmap = await createImageBitmap(file);
  const size = 512;
  const cropSize = Math.min(imageBitmap.width, imageBitmap.height);
  const sx = Math.round((imageBitmap.width - cropSize) / 2);
  const sy = Math.round((imageBitmap.height - cropSize) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  context.drawImage(imageBitmap, sx, sy, cropSize, cropSize, 0, 0, size, size);
  imageBitmap.close();

  return canvas.toDataURL("image/jpeg", 0.84);
}

async function handleAvatarFile(file) {
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    showMessage("Velg et bilde som avatar.", "error");
    return;
  }

  try {
    showMessage("Laster opp avatar...", "success");
    const avatarDataUrl = await fileToAvatarDataUrl(file);
    const result = await saveAvatar(avatarDataUrl);

    if (result.error) {
      showMessage(result.error, "error");
      return;
    }

    showMessage("Avataren ble lagret.", "success");
    await renderProfile();
  } catch {
    showMessage("Kunne ikke lagre avataren.", "error");
  } finally {
    avatarInput.value = "";
  }
}

avatarInput.addEventListener("change", async (event) => {
  await handleAvatarFile(event.target.files?.[0]);
});

removeAvatarBtn.addEventListener("click", async () => {
  const result = await deleteAvatar();

  if (result.error) {
    showMessage(result.error, "error");
    return;
  }

  showMessage("Avataren ble fjernet.", "success");
  await renderProfile();
});

avatarDropzone.addEventListener("dragenter", (event) => {
  event.preventDefault();
  avatarDropzone.classList.add("drag-active");
});

avatarDropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  avatarDropzone.classList.add("drag-active");
});

avatarDropzone.addEventListener("dragleave", (event) => {
  if (event.relatedTarget && avatarDropzone.contains(event.relatedTarget)) {
    return;
  }
  avatarDropzone.classList.remove("drag-active");
});

avatarDropzone.addEventListener("drop", async (event) => {
  event.preventDefault();
  avatarDropzone.classList.remove("drag-active");
  const file = event.dataTransfer?.files?.[0];
  await handleAvatarFile(file);
});

avatarDropzone.addEventListener("click", () => {
  avatarInput.click();
});

avatarDropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    avatarInput.click();
  }
});

savedTrips.addEventListener("click", async (event) => {
  const loadButton = event.target.closest(".load-saved-trip-btn");
  if (loadButton) {
    const index = Number(loadButton.dataset.tripIndex);
    const trip = currentTrips[index];
    if (!trip) {
      return;
    }

    storePlannerDraft(routeToPlannerDraft(trip));
    window.location.href = "planner.html";
    return;
  }

  const deleteButton = event.target.closest(".delete-saved-trip-btn");
  const publishButton = event.target.closest(".publish-saved-trip-btn");

  if (publishButton) {
    const result = await updateTripPublication(
      publishButton.dataset.tripId,
      publishButton.dataset.published === "true"
    );

    if (result.error) {
      showMessage(result.error, "error");
      return;
    }

    showMessage(
      publishButton.dataset.published === "true" ? t("profile.publishedMessage") : t("profile.unpublishedMessage"),
      "success"
    );
    await renderProfile();
    return;
  }

  if (!deleteButton) {
    return;
  }

  const tripId = deleteButton.dataset.tripId;
  const result = await deleteTrip(tripId);

  if (result.error) {
    showMessage(result.error, "error");
    return;
  }

  showMessage("Ruten ble slettet.", "success");
  await renderProfile();
});

ticketUploadForm.addEventListener("submit", uploadSelectedTickets);
vpnDeviceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const result = await addVpnDevice({
    name: vpnDeviceName.value.trim(),
    platform: vpnDevicePlatform.value
  });
  if (result.error) {
    vpnDeviceMessage.textContent = result.error;
    vpnDeviceMessage.className = "auth-message error";
    return;
  }
  vpnDeviceName.value = "";
  vpnDeviceMessage.textContent = "Устройство добавлено.";
  vpnDeviceMessage.className = "auth-message success";
  await loadVpnAccount();
});

vpnDeviceList.addEventListener("click", async (event) => {
  const renameButton = event.target.closest(".rename-vpn-device");
  const removeButton = event.target.closest(".remove-vpn-device");

  if (renameButton) {
    const name = window.prompt("Новое название устройства", renameButton.dataset.deviceName || "");
    if (!name) return;
    const result = await renameVpnDevice(renameButton.dataset.deviceId, name.trim());
    if (result.error) {
      vpnDeviceMessage.textContent = result.error;
      vpnDeviceMessage.className = "auth-message error";
      return;
    }
    await loadVpnAccount();
  }

  if (removeButton && window.confirm("Отключить это устройство от VPN-аккаунта?")) {
    const result = await removeVpnDevice(removeButton.dataset.deviceId);
    if (result.error) {
      vpnDeviceMessage.textContent = result.error;
      vpnDeviceMessage.className = "auth-message error";
      return;
    }
    await loadVpnAccount();
  }
});
ticketFiles.addEventListener("change", () => {
  const count = ticketFiles.files?.length || 0;
  ticketFileLabel.textContent = count ? t("tickets.filesSelected", { count }) : t("tickets.chooseFiles");
});

savedTickets.addEventListener("click", async (event) => {
  const button = event.target.closest(".delete-ticket-btn");
  if (!button || !window.confirm(t("tickets.deleteConfirm"))) return;
  const result = await deleteTicket(button.dataset.ticketId);
  if (result.error) {
    ticketUploadStatus.textContent = result.error;
    ticketUploadStatus.className = "auth-message error";
    return;
  }
  ticketUploadStatus.textContent = t("tickets.deleted");
  ticketUploadStatus.className = "auth-message success";
  await loadTickets();
});

logoutBtn.addEventListener("click", async () => {
  await logoutUser();
  window.location.href = "account.html";
});

buyVipCardBtn.addEventListener("click", () => {
  startVipPayment("card");
});

buyVipVippsBtn.addEventListener("click", () => {
  startVipPayment("vipps");
});

document.addEventListener("currencychange", () => {
  renderTrips(currentTrips);
  renderTickets(currentTickets);
});

buyVpnCardBtn.addEventListener("click", () => startVpnPayment("card"));
buyVpnVippsBtn.addEventListener("click", () => startVpnPayment("vipps"));

document.addEventListener("languagechange", async () => {
  renderVpnOffer();
  applyTranslations();
  renderLegalConsent();
  renderVipProductDescription();
  await updateAuthNav();
  renderTrips(currentTrips);
  const user = await getCurrentUser();

  if (user) {
    profileTitle.textContent = t("profile.greeting", { name: user.name });
    renderVip(user);
  }
});

renderVpnOffer();
initCurrencySelector();
initLanguageSelector();
applyTranslations();
renderLegalConsent();
renderProfile();
