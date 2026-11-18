import { describe, expect, it } from "vitest";
import { accountRecoveryRedirect, validateNewAccountPassword } from "./password-recovery";

describe("account password recovery", () => {
  it("returns the account page on the current origin", () => {
    expect(accountRecoveryRedirect("https://prancheta.example.test")).toBe("https://prancheta.example.test/conta");
  });
  it("requires a minimum length and matching confirmation", () => {
    expect(validateNewAccountPassword("short", "short")).toContain("8 caracteres");
    expect(validateNewAccountPassword("long-enough", "different")).toBe("As senhas não coincidem.");
    expect(validateNewAccountPassword("long-enough", "long-enough")).toBeNull();
  });
});
