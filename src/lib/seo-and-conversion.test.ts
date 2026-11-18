import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import robots from "../app/robots";

const chrome = readFileSync(path.resolve(__dirname, "../app/chrome.tsx"), "utf8");
const dashboard = readFileSync(path.resolve(__dirname, "../app/dashboard-client.tsx"), "utf8");
const landing = readFileSync(path.resolve(__dirname, "../app/landing-client.tsx"), "utf8");
const account = readFileSync(path.resolve(__dirname, "../app/conta/account-client.tsx"), "utf8");
const layout = readFileSync(path.resolve(__dirname, "../app/layout.tsx"), "utf8");

describe("SEO público, simulador sem login e conta self-service", () => {
  it("libera indexação das rotas públicas e protege /conta, /api/ e /app no robots.txt", () => {
    const cfg = robots();
    expect(cfg.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/conta", "/api/", "/app"],
    });
    expect(layout).toContain("robots: { index: true, follow: true }");
  });

  it("rebatiza a marca para VagaMatch e expõe proposta clara + mockup de match na landing", () => {
    expect(layout).toContain("VagaMatch —");
    expect(chrome).toMatch(/Vaga<span[^>]*>\s*Match<\/span>/);
    expect(chrome).not.toContain(">Prancheta<");
    expect(landing).toContain("Descubra seu");
    expect(landing).toContain("match real");
    expect(landing).toContain("antes do RH");
    expect(landing).toContain("Teste agora em 30 segundos — sem criar conta");
    expect(landing).toContain("Passe 90 Dias");
    expect(landing).toContain("ChatGPT numa 2ª aba");
  });

  it("mantém simulador sem login e Passe Sprint 90 Dias no painel operacional", () => {
    expect(dashboard).toContain("Teste agora em 30 segundos — sem criar conta");
    expect(dashboard).toContain("Passe Sprint 90 Dias");
  });

  it("oferece criação de conta self-service (signUp) e sincronização automática opcional em /conta", () => {
    expect(account).toContain("client!.auth.signUp(");
    expect(account).toContain("Criar minha conta");
    expect(account).toContain('id="account-auto-sync"');
  });
});
