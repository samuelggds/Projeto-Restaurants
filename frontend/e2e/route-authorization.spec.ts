import { expect, test, type Page } from "@playwright/test";

async function mockSession(page: Page, user: Record<string, unknown> | null) {
  await page.route("http://127.0.0.1:3000/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/auth/me" && user) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.addInitScript((sessionUser) => {
    localStorage.clear();
    if (sessionUser) {
      localStorage.setItem("token", "e2e-token");
      localStorage.setItem("user", JSON.stringify(sessionUser));
    }
  }, user);
}

test("Home é pública e rota privada exige login", async ({ page }) => {
  await mockSession(page, null);
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login$/);
});

const restrictedProfiles = [
  { role: "SUPER_ADMIN", allowed: "/super_admin", forbidden: "/admin" },
  { role: "MOTOQUEIRO", allowed: "/courier", forbidden: "/profile" },
  { role: "FUNCIONARIO", subRole: "COZINHA", allowed: "/kitchen", forbidden: "/waiter" },
  { role: "FUNCIONARIO", subRole: "GARCOM", allowed: "/waiter", forbidden: "/kitchen" },
];

for (const profile of restrictedProfiles) {
  test(`${profile.role} ${profile.subRole || ""} permanece na área autorizada`, async ({ page }) => {
    const user = { id: 1, name: "Teste E2E", restaurantId: 1, ...profile };
    await mockSession(page, user);
    await page.goto(profile.allowed);
    await expect(page).toHaveURL(new RegExp(`${profile.allowed.replace("/", "\\/")}$`));
    await page.goto(profile.forbidden);
    await expect(page).toHaveURL(new RegExp(`${profile.allowed.replace("/", "\\/")}$`));
  });
}

test("cliente acompanha pedido, mas não acessa painel operacional", async ({ page }) => {
  await mockSession(page, { id: 2, name: "Cliente", role: "CLIENTE" });
  await page.goto("/orders/48/tracking");
  await expect(page).toHaveURL(/\/orders\/48\/tracking$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/$/);
});

test("admin acessa operação, mas nunca o Super Admin", async ({ page }) => {
  await mockSession(page, { id: 3, name: "Admin", role: "ADMIN", restaurantId: 1 });
  await page.goto("/kitchen");
  await expect(page).toHaveURL(/\/kitchen$/);
  await page.goto("/super_admin");
  await expect(page).toHaveURL(/\/admin$/);
});
