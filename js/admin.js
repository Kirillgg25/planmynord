import {
  deleteAdminRoute,
  deleteAdminUser,
  getAdminPayments,
  getAdminRoutes,
  getAdminUsers,
  getCurrentUser,
  updateAdminUserRole,
  updateAdminUserVip,
  updateAuthNav
} from "./auth.js?v=reliability-1";
import { formatBudgetText, initCurrencySelector } from "./currency.js?v=currency-menu-1";
import { applyTranslations, getLanguage, initLanguageSelector, t } from "./i18n.js?v=reliability-1";
import { escapeHtml } from "./html-utils.js?v=shared-ui-2";

const adminMessage = document.getElementById("adminMessage");
const adminPageContent = document.getElementById("adminPageContent");
const refreshAdminBtn = document.getElementById("refreshAdminBtn");
const adminUsers = document.getElementById("adminUsers");
const adminPayments = document.getElementById("adminPayments");
const adminRoutes = document.getElementById("adminRoutes");
const usersCount = document.getElementById("usersCount");
const adminsCount = document.getElementById("adminsCount");
const routesCount = document.getElementById("routesCount");
const vipUsersCount = document.getElementById("vipUsersCount");
const paidPaymentsCount = document.getElementById("paidPaymentsCount");

let currentUsers = [];
let currentRoutes = [];
let currentPayments = [];
let currentAdminUser = null;

function showMessage(message, type = "success") {
  adminMessage.textContent = message;
  adminMessage.className = `auth-message ${type}`;
}

function syncAdminNavLabels() {
  const accountLink = document.querySelector('.topnav a[href="/account"], .topnav a[href="/profile"], .topnav a[href="account.html"], .topnav a[href="profile.html"]');
  const adminLink = document.querySelector('.topnav a[href="admin.html"]');

  if (accountLink) {
    accountLink.textContent = t("nav.account");
    accountLink.dataset.i18n = "nav.account";
  }

  if (adminLink) {
    adminLink.textContent = t("nav.admin");
    adminLink.dataset.i18n = "nav.admin";
  }
}

function initAdminLanguageSelector() {
  if (!["en", "ru"].includes(getLanguage())) {
    localStorage.setItem("tripplannerLanguage", "en");
  }

  initLanguageSelector();

  const switcher = document.querySelector(".language-switcher");
  const currentLanguage = getLanguage();

  if (switcher) {
    switcher.classList.add("admin-language-switcher");
    switcher.innerHTML = `
      <span data-i18n="nav.language">Language</span>
      <div class="admin-lang-toggle" role="group" aria-label="Language">
        <button type="button" class="${currentLanguage === "en" ? "active" : ""}" data-admin-language="en">EN</button>
        <button type="button" class="${currentLanguage === "ru" ? "active" : ""}" data-admin-language="ru">RU</button>
      </div>
    `;

    switcher.addEventListener("click", (event) => {
      const button = event.target.closest("[data-admin-language]");

      if (!button) {
        return;
      }

      localStorage.setItem("tripplannerLanguage", button.dataset.adminLanguage);
      applyTranslations();
      document.dispatchEvent(new CustomEvent("languagechange"));
    });
  }

  applyTranslations();
  syncAdminNavLabels();
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return date.toLocaleString("no-NO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderCounts() {
  usersCount.textContent = currentUsers.length;
  adminsCount.textContent = currentUsers.filter((user) => user.role === "admin").length;
  routesCount.textContent = currentRoutes.length;
  vipUsersCount.textContent = currentUsers.filter((user) => user.vip?.active).length;
  paidPaymentsCount.textContent = currentPayments.filter((payment) => payment.status === "paid").length;
}

function renderVipBadge(vip) {
  if (!vip?.active) {
    return `<span class="role-pill">${t("admin.inactive")}</span>`;
  }

  return `<span class="role-pill vip">${t("admin.vipUntil", { date: formatDate(vip.until) })}</span>`;
}

function renderPaymentStatus(status) {
  const key = status === "paid" ? "admin.paid" : "admin.pending";
  const label = t(key);

  return `<span class="payment-status ${escapeHtml(status)}">${escapeHtml(label)}</span>`;
}

function renderUserActions(user) {
  const nextRole = user.role === "admin" ? "user" : "admin";
  const roleLabel = user.role === "admin" ? t("admin.removeAdmin") : t("admin.makeAdmin");

  return `
    <div class="admin-user-actions">
      <button type="button" class="admin-small-button" data-user-role="${escapeHtml(user.id)}" data-role="${nextRole}">
        ${roleLabel}
      </button>
      <div class="admin-vip-control">
        <select data-vip-days="${escapeHtml(user.id)}" aria-label="Support duration">
          <option value="30">${t("admin.days30")}</option>
          <option value="90">${t("admin.days90")}</option>
          <option value="365" selected>${t("admin.year1")}</option>
          <option value="0">${t("admin.removeVip")}</option>
        </select>
        <button type="button" class="admin-small-button vip" data-grant-vip="${escapeHtml(user.id)}">
          ${t("admin.applyVip")}
        </button>
      </div>
      <button type="button" class="admin-danger-button" data-delete-user="${escapeHtml(user.id)}">
        ${t("admin.delete")}
      </button>
    </div>
  `;
}

function renderUsers(users) {
  if (!users.length) {
    adminUsers.innerHTML = `<p class="admin-empty">${t("admin.noUsers")}</p>`;
    return;
  }

  adminUsers.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>${t("admin.name")}</th>
          <th>${t("admin.email")}</th>
          <th>${t("admin.role")}</th>
          <th>${t("admin.status")}</th>
          <th>${t("admin.vipUsers")}</th>
          <th>${t("admin.routes")}</th>
          <th>${t("admin.created")}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${users
          .map(
            (user) => `
              <tr>
                <td>${escapeHtml(user.name)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td><span class="role-pill ${user.role === "admin" ? "admin" : ""}">${escapeHtml(user.role)}</span></td>
                <td>${user.emailVerified ? t("admin.verified") : t("admin.notVerified")}</td>
                <td>${renderVipBadge(user.vip)}</td>
                <td>${Number(user.tripsCount) || 0}</td>
                <td>${formatDate(user.createdAt)}</td>
                <td>${renderUserActions(user)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderPayments(payments) {
  if (!payments.length) {
    adminPayments.innerHTML = `<p class="admin-empty">${t("admin.noPayments")}</p>`;
    return;
  }

  const paidPayments = payments.filter((payment) => payment.status === "paid");
  const pendingPayments = payments.filter((payment) => payment.status !== "paid");
  const paidTotal = paidPayments.reduce((sum, payment) => sum + (Number(payment.amountNok) || 0), 0);
  const renderPaymentRows = (items) =>
    items
      .map(
        (payment) => `
          <tr>
            <td>
              ${escapeHtml(payment.userName || t("admin.unknownUser"))}
              <span class="admin-subtext">${escapeHtml(payment.userEmail || payment.userId)}</span>
            </td>
            <td>${escapeHtml(payment.provider)}</td>
            <td>${renderPaymentStatus(payment.status)}</td>
            <td>${Number(payment.amountNok) || 0} ${escapeHtml(payment.currency || "NOK")}</td>
            <td>${Number(payment.vipDays) || 0}</td>
            <td>${formatDate(payment.createdAt)}</td>
            <td>${payment.paidAt ? formatDate(payment.paidAt) : "-"}</td>
          </tr>
        `
      )
      .join("");

  adminPayments.innerHTML = `
    <div class="payment-overview">
      <div><span>${t("admin.paid")}</span><strong>${paidPayments.length}</strong></div>
      <div><span>${t("admin.pendingAttempts")}</span><strong>${pendingPayments.length}</strong></div>
      <div><span>${t("admin.revenue")}</span><strong>${paidTotal} NOK</strong></div>
    </div>

    ${
      paidPayments.length
        ? `
          <table class="admin-table payments-table">
            <thead>
              <tr>
                <th>${t("admin.user")}</th>
                <th>${t("admin.provider")}</th>
                <th>${t("admin.status")}</th>
                <th>${t("admin.amount")}</th>
                <th>${t("admin.vipDays")}</th>
                <th>${t("admin.created")}</th>
                <th>${t("admin.paid")}</th>
              </tr>
            </thead>
            <tbody>${renderPaymentRows(paidPayments)}</tbody>
          </table>
        `
        : `<p class="admin-empty">${t("admin.noPaidPayments")}</p>`
    }

    ${
      pendingPayments.length
        ? `
          <details class="pending-payments">
            <summary>${t("admin.showPending", { count: pendingPayments.length })}</summary>
            <table class="admin-table payments-table">
              <thead>
                <tr>
                  <th>${t("admin.user")}</th>
                  <th>${t("admin.provider")}</th>
                  <th>${t("admin.status")}</th>
                  <th>${t("admin.amount")}</th>
                  <th>${t("admin.vipDays")}</th>
                  <th>${t("admin.created")}</th>
                  <th>${t("admin.paid")}</th>
                </tr>
              </thead>
              <tbody>${renderPaymentRows(pendingPayments)}</tbody>
            </table>
          </details>
        `
        : ""
    }
  `;
}

function renderRoutes(routes) {
  if (!routes.length) {
    adminRoutes.innerHTML = `<p class="admin-empty">${t("admin.noRoutes")}</p>`;
    return;
  }

  adminRoutes.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>${t("admin.route")}</th>
          <th>${t("admin.owner")}</th>
          <th>${t("admin.days")}</th>
          <th>${t("admin.budget")}</th>
          <th>${t("admin.stops")}</th>
          <th>${t("admin.saved")}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${routes
          .map(
            (route) => `
              <tr>
                <td>
                  <strong>${escapeHtml(route.title)}</strong>
                  <span class="admin-subtext">${escapeHtml(route.info)}</span>
                </td>
                <td>
                  ${escapeHtml(route.ownerName)}
                  <span class="admin-subtext">${escapeHtml(route.ownerEmail)}</span>
                </td>
                <td>${Number(route.days) || 0}</td>
                <td>${escapeHtml(formatBudgetText(route.budget))}</td>
                <td>${escapeHtml(Array.isArray(route.stops) ? route.stops.join(" -> ") : "")}</td>
                <td>${formatDate(route.savedAt)}</td>
                <td>
                  <button type="button" class="admin-danger-button" data-delete-route="${escapeHtml(route.id)}">
                    ${t("admin.delete")}
                  </button>
                </td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

async function loadAdminData({ quiet = false } = {}) {
  if (!quiet) {
    showMessage(t("admin.loadingData"), "success");
  }

  const [usersResult, routesResult, paymentsResult] = await Promise.all([
    getAdminUsers(),
    getAdminRoutes(),
    getAdminPayments()
  ]);

  if (usersResult.error) {
    showMessage(usersResult.error, "error");
    return;
  }

  if (routesResult.error) {
    showMessage(routesResult.error, "error");
    return;
  }

  if (paymentsResult.error) {
    showMessage(paymentsResult.error, "error");
    return;
  }

  currentUsers = Array.isArray(usersResult.users) ? usersResult.users : [];
  currentRoutes = Array.isArray(routesResult.routes) ? routesResult.routes : [];
  currentPayments = Array.isArray(paymentsResult.payments) ? paymentsResult.payments : [];
  renderCounts();
  renderUsers(currentUsers);
  renderPayments(currentPayments);
  renderRoutes(currentRoutes);
  showMessage(t("admin.updated"), "success");
}

async function initAdminPage() {
  const user = await getCurrentUser();
  await updateAuthNav();
  syncAdminNavLabels();

  if (!user) {
    window.location.href = "account.html";
    return;
  }

  if (user.role !== "admin") {
    window.location.href = "profile.html";
    return;
  }

  currentAdminUser = user;
  adminPageContent.hidden = false;
  await loadAdminData();
}

refreshAdminBtn.addEventListener("click", async () => {
  await loadAdminData();
});

adminUsers.addEventListener("click", async (event) => {
  const roleButton = event.target.closest("[data-user-role]");
  if (roleButton) {
    const userId = roleButton.dataset.userRole;
    const role = roleButton.dataset.role;
    const user = currentUsers.find((item) => item.id === userId);

    if (!user) {
      return;
    }

    if (
      role === "user" &&
      currentAdminUser?.id === userId &&
      !confirm(t("admin.selfRemoveAdminConfirm"))
    ) {
      return;
    }

    const result = await updateAdminUserRole(userId, role);

    if (result.error) {
      showMessage(result.error, "error");
      return;
    }

    showMessage(t("admin.roleUpdated"), "success");
    await loadAdminData({ quiet: true });
    return;
  }

  const vipButton = event.target.closest("[data-grant-vip]");
  if (vipButton) {
    const userId = vipButton.dataset.grantVip;
    const select = Array.from(adminUsers.querySelectorAll("[data-vip-days]")).find(
      (item) => item.dataset.vipDays === userId
    );
    const days = Number(select?.value || 365);
    const result = await updateAdminUserVip(userId, days);

    if (result.error) {
      showMessage(result.error, "error");
      return;
    }

    showMessage(days > 0 ? t("admin.vipUpdated") : t("admin.vipRemoved"), "success");
    await loadAdminData({ quiet: true });
    return;
  }

  const button = event.target.closest("[data-delete-user]");

  if (!button) {
    return;
  }

  const userId = button.dataset.deleteUser;
  const user = currentUsers.find((item) => item.id === userId);

  if (!user || !confirm(t("admin.deleteUserConfirm", { email: user.email }))) {
    return;
  }

  const result = await deleteAdminUser(userId);

  if (result.error) {
    showMessage(result.error, "error");
    return;
  }

  await loadAdminData({ quiet: true });
});

adminRoutes.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-route]");

  if (!button) {
    return;
  }

  const routeId = button.dataset.deleteRoute;
  const route = currentRoutes.find((item) => item.id === routeId);

  if (!route || !confirm(t("admin.deleteRouteConfirm", { title: route.title }))) {
    return;
  }

  const result = await deleteAdminRoute(routeId);

  if (result.error) {
    showMessage(result.error, "error");
    return;
  }

  await loadAdminData({ quiet: true });
});

document.addEventListener("currencychange", () => {
  renderRoutes(currentRoutes);
});

document.addEventListener("languagechange", () => {
  applyTranslations();
  syncAdminNavLabels();
  renderUsers(currentUsers);
  renderPayments(currentPayments);
  renderRoutes(currentRoutes);
  showMessage(t("admin.updated"), "success");
});

initCurrencySelector();
initAdminLanguageSelector();
initAdminPage();



