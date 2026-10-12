// Takes the UI screenshots used in the project documentation from the running app.
// Run by .github/workflows/screenshots.yml; expects the API on :5050 and the client on :5173
// with the demo data loaded (npm run seed-demo, npm run seed-dorms).
import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const API = "http://localhost:5050/api";
const OUT = process.argv[2] || "docs/screenshots";

const browser = await chromium.launch();
const view = { width: 1366, height: 768 };

async function login(page, email, password) {
  await page.goto(`${BASE}/login`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

// Figure 12: Administrator dashboard, Users.
{
  const page = await (await browser.newContext({ viewport: view })).newPage();
  await login(page, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  await page.goto(`${BASE}/admin/users`);
  await page.getByText("maria@findorm.test").first().waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/fig-12-admin-users.png` });
}

// Figure 28: reservation request form filled in (a fresh seeker, so the form is open).
{
  const email = "ana.reyes@findorm.test";
  await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ firstName: "Ana", lastName: "Reyes", email, password: "Password123", role: "seeker" }),
  });
  const res = await (await fetch(`${API}/listings?q=Dapitan&available=true`)).json();
  const listing = res.items[0];
  const page = await (await browser.newContext({ viewport: view })).newPage();
  await login(page, email, "Password123");
  await page.goto(`${BASE}/listings/${listing._id}`);
  const submit = page.getByRole("button", { name: "Request 1 slot" });
  await submit.waitFor();
  const d = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  await page.locator('input[type="date"]').fill(d);
  await page.locator("textarea").first().fill("Hi! I'm a 2nd year student looking for a bedspace starting next month. Is the slot still open?");
  await submit.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/fig-28-request-form.png` });
}

await browser.close();
