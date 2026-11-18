import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:net";
import { chromium } from "playwright";

const cwd = process.cwd();
const mockOrigin = "https://mock-prancheta.supabase.co";
const publicKey = "test-publishable-key";
const user = { id: "a12ea46b-86d4-4e5c-9a2e-1f5b71d14201", aud: "authenticated", role: "authenticated", email: "qa@example.invalid", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" };
const jwtPart = value => Buffer.from(JSON.stringify(value)).toString("base64url");
const token = `${jwtPart({ alg: "HS256", typ: "JWT" })}.${jwtPart({ sub: user.id, aud: "authenticated", role: "authenticated", email: user.email, exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000), session_id: "qa-session" })}.fixture-signature`;

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

const port = await freePort();
const localOrigin = `http://127.0.0.1:${port}`;
const testEnv = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: mockOrigin, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey };
execFileSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], { cwd, env: testEnv, stdio: "ignore" });
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", String(port)], {
  cwd, env: testEnv,
  stdio: "ignore",
  windowsHide: true,
});
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
const page = await context.newPage();
const browserErrors = [];
page.on("pageerror", error => browserErrors.push(error.message));
const externalHosts = new Set();
const requestPaths = [];
let updateMode = "error";
let updateStarted;
let markUpdateStarted;
updateStarted = new Promise(resolve => { markUpdateStarted = resolve; });

try {
  await context.route("**/*", async route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === localOrigin) return route.continue();
    if (requestUrl.origin !== mockOrigin) {
      externalHosts.add(requestUrl.host);
      return route.abort();
    }
    requestPaths.push(`${route.request().method()} ${requestUrl.pathname}`);
    if (requestUrl.pathname === "/auth/v1/user" && route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(user) });
    }
    if (requestUrl.pathname === "/auth/v1/user" && route.request().method() === "PUT") {
      markUpdateStarted();
      await new Promise(resolve => setTimeout(resolve, 500));
      if (updateMode === "error") return route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ code: "weak_password", message: "simulated update failure" }) });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(user) });
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "Unexpected mock request" }) });
  });

  let ready = false;
  for (let i = 0; i < 90; i++) {
    if (server.exitCode !== null) throw new Error(`Next start exited with ${server.exitCode}`);
    try { const response = await fetch(`${localOrigin}/conta`); if (response.ok) { ready = true; break; } } catch { /* wait for local server only */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.equal(ready, true, "Next dev server became ready on localhost");

  await page.goto(`${localOrigin}/conta#access_token=${token}&expires_in=3600&refresh_token=fixture-refresh&token_type=bearer&type=recovery`, { waitUntil: "networkidle" });
  try { await page.getByRole("heading", { name: "Definir nova senha" }).waitFor({ timeout: 8000 }); }
  catch { throw new Error(`Recovery UI missing; URL=${page.url()} text=${(await page.locator("body").innerText()).slice(0, 500)} requests=${JSON.stringify(requestPaths)} pageErrors=${JSON.stringify(browserErrors)}`); }
  assert.equal(await page.getByLabel("Nova senha", { exact: true }).isVisible(), true, "PASSWORD_RECOVERY event opened real recovery form");

  await page.getByLabel("Nova senha", { exact: true }).fill("short");
  await page.getByLabel("Confirme a nova senha").fill("short");
  await page.getByRole("button", { name: "Atualizar senha" }).click();
  await page.getByText("pelo menos 8 caracteres").waitFor();
  assert.equal(requestPaths.filter(path => path === "PUT /auth/v1/user").length, 0, "invalid password never reaches mock update endpoint");

  await page.getByLabel("Nova senha", { exact: true }).fill("long-enough-password");
  await page.getByLabel("Confirme a nova senha").fill("different-password");
  await page.getByRole("button", { name: "Atualizar senha" }).click();
  await page.getByText("As senhas não coincidem.").waitFor();
  assert.equal(requestPaths.filter(path => path === "PUT /auth/v1/user").length, 0, "mismatched passwords never reach mock update endpoint");

  await page.getByLabel("Confirme a nova senha").fill("long-enough-password");
  await page.getByRole("button", { name: "Atualizar senha" }).click();
  await updateStarted;
  assert.equal(await page.getByRole("button", { name: "Atualizar senha" }).isDisabled(), true, "update button stays disabled while Auth response is pending");
  await page.getByText("Não foi possível atualizar a senha.").waitFor();
  assert.equal(await page.getByRole("button", { name: "Atualizar senha" }).isEnabled(), true, "button re-enables after mocked error");

  updateMode = "success";
  updateStarted = new Promise(resolve => { markUpdateStarted = resolve; });
  await page.getByRole("button", { name: "Atualizar senha" }).click();
  await updateStarted;
  assert.equal(await page.getByRole("button", { name: "Atualizar senha" }).isDisabled(), true, "update button stays disabled during successful request");
  await page.getByText("Senha atualizada.").waitFor();
  await page.getByText("Sessão iniciada. Não há sincronização automática.").waitFor();
  const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, height: innerHeight }));
  assert.ok(layout.scrollWidth <= layout.width, `mobile layout has no horizontal overflow: ${JSON.stringify(layout)}`);
  assert.deepEqual([...externalHosts], [], "browser made no requests outside localhost and the mocked Auth origin");
  assert.equal(requestPaths.filter(path => path === "GET /auth/v1/user").length >= 1, true, "fake recovery hash resolved through mock getUser");
  console.log(JSON.stringify({ viewport: layout, event: "PASSWORD_RECOVERY", validation: "short and mismatch rejected", pending: "disabled", responses: ["mock error", "mock success"], externalHosts: [...externalHosts], authRequests: requestPaths.length }));
} finally {
  await context.close();
  await browser.close();
  server.kill("SIGTERM");
}
