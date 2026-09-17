import { t } from "./i18n.js?v=reliability-1";

export async function registerUser({ name, email, password }) {
  return requestJson("/api/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password })
  });
}

export async function resendVerification(email) {
  return requestJson("/api/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export async function loginUser({ email, password }) {
  return requestJson("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function getAuthProviders() {
  return requestJson("/api/auth/providers");
}

export async function logoutUser() {
  const result = await requestJson("/api/logout", { method: "POST" });
  window.dispatchEvent(new CustomEvent("tripplanner:logout"));
  return result;
}

export async function saveTrip(route) {
  return requestJson("/api/trips", {
    method: "POST",
    body: JSON.stringify(route)
  });
}

export async function deleteTrip(tripId) {
  return requestJson(`/api/trips/${tripId}`, {
    method: "DELETE"
  });
}

export async function updateTripPublication(tripId, published) {
  return requestJson(`/api/trips/${tripId}/publication`, {
    method: "PATCH",
    body: JSON.stringify({ published })
  });
}

export async function getPublicRoutes() {
  return requestJson("/api/public-routes");
}

export async function getRouteRatings(routeIds) {
  const params = new URLSearchParams({
    routeIds: routeIds.join(",")
  });
  return requestJson(`/api/route-ratings?${params.toString()}`);
}

export async function rateRoute(routeId, rating) {
  return requestJson("/api/route-ratings", {
    method: "POST",
    body: JSON.stringify({ routeId, rating })
  });
}

export async function saveAvatar(avatarUrl) {
  return requestJson("/api/avatar", {
    method: "POST",
    body: JSON.stringify({ avatarUrl })
  });
}

export async function deleteAvatar() {
  return requestJson("/api/avatar", {
    method: "DELETE"
  });
}

export async function getSavedTickets() {
  const result = await requestJson("/api/tickets");
  return result.error ? result : { tickets: Array.isArray(result.tickets) ? result.tickets : [] };
}

export async function saveTicket(ticket) {
  return requestJson("/api/tickets", {
    method: "POST",
    body: JSON.stringify(ticket)
  });
}

export async function deleteTicket(ticketId) {
  return requestJson(`/api/tickets/${encodeURIComponent(ticketId)}`, {
    method: "DELETE"
  });
}

export async function getVipProduct() {
  return requestJson("/api/vip/product");
}

export async function createCardVipPayment() {
  return requestJson("/api/payments/card/create", {
    method: "POST"
  });
}

export async function createVippsVipPayment() {
  return requestJson("/api/payments/vipps/create", {
    method: "POST"
  });
}

export async function getAdminUsers() {
  return requestJson("/api/admin/users");
}

export async function deleteAdminUser(userId) {
  return requestJson(`/api/admin/users/${userId}`, {
    method: "DELETE"
  });
}

export async function updateAdminUserRole(userId, role) {
  return requestJson(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role })
  });
}

export async function updateAdminUserVip(userId, days) {
  return requestJson(`/api/admin/users/${userId}/vip`, {
    method: "PATCH",
    body: JSON.stringify({ days })
  });
}

export async function getAdminRoutes() {
  return requestJson("/api/admin/routes");
}

export async function getAdminPayments() {
  return requestJson("/api/admin/payments");
}

export async function deleteAdminRoute(routeId) {
  return requestJson(`/api/admin/routes/${routeId}`, {
    method: "DELETE"
  });
}

export async function getSavedTrips() {
  const response = await fetch("/api/trips", {
    credentials: "same-origin"
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return Array.isArray(data.trips) ? data.trips : [];
}

export async function getCurrentUser() {
  const response = await fetch("/api/me", {
    credentials: "same-origin"
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.user || null;
}

export async function updateAuthNav() {
  const nav = document.querySelector(".topnav");
  if (!nav) return;

  const accountLink = nav.querySelector('a[href="/account"], a[href="/profile"], a[href="account.html"], a[href="profile.html"]');
  if (accountLink) {
    accountLink.textContent = t("nav.account");
    accountLink.dataset.i18n = "nav.account";
  }

  let status = nav.querySelector(".auth-status");
  if (!status) {
    status = document.createElement("span");
    status.className = "auth-status";
    nav.appendChild(status);
  }

  const user = await getCurrentUser();

  if (accountLink) {
    accountLink.href = user ? "profile.html" : "account.html";
  }

  let adminLink = nav.querySelector('a[href="admin.html"]');

  if (user?.role === "admin") {
    if (!adminLink) {
      adminLink = document.createElement("a");
      adminLink.href = "admin.html";
      adminLink.textContent = "Admin";
      nav.insertBefore(adminLink, status);
    }
  } else if (adminLink) {
    adminLink.remove();
  }

  if (user) {
    delete status.dataset.i18n;
    status.textContent = user.name;
  } else {
    status.dataset.i18n = "auth.notSignedIn";
    status.textContent = t("auth.notSignedIn");
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { error: data.error || "Noe gikk galt.", status: response.status };
  }

  return data;
}



