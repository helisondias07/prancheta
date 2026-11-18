import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import robots from "../app/robots";

const chrome = readFileSync(path.resolve(__dirname, "../app/chrome.tsx"), "utf8");
const dashboard = readFileSync(path.resolve(__dirname, "../app/dashboard-client.tsx"), "utf8");
const account = readFileSync(path.resolve(__dirname, "../app/conta/account-client.tsx"), "utf8");
const layout = readFileSync(path.resolve(__dirname, "../app/layout.tsx"), "utf8");

describe("SEO público, simulador sem login e conta self-service", () => {
  it("libera indexação das rotas públicas e protege /conta e /api/ no robots.txt", () => {
    const cfg = robots();
    expect(cfg.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/conta", "/api/"],
    });
    expect(layout).toContain("robots: { index: true, follow: true }");
  });

  it("remove aviso defensivo de Hobby do cabeçalho e expõe proposta clara + Passe Sprint 90 Dias", () => {
    expect(chrome).not.toContain("Vercel Hobby");
    expect(chrome).toContain("Compare seu currículo e portfólio com a vaga usando evidência literal");
    expect(dashboard).toContain("Teste agora em 30 segundos — sem criar conta");
    expect(dashboard).toContain("Passe Sprint 90 Dias");
  });

  it("oferece criação de conta self-service (signUp) e sincronização automática opcional em /conta", () => {
    expect(account).toContain("client!.auth.signUp(");
    expect(account).toContain("Criar minha conta");
    expect(account).toContain('id="account-auto-sync"');
  });
});
