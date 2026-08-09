import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAuthSession,
  isAuthSnapshotCurrent,
  persistAuthSession,
} from "./authSession";

describe("authSession", () => {
  beforeEach(() => localStorage.clear());

  it("salva usuário e token de acesso", () => {
    persistAuthSession({ id: 7, role: "ADMIN" }, "access-token");
    expect(localStorage.getItem("token")).toBe("access-token");
    expect(JSON.parse(localStorage.getItem("user") || "null")).toEqual({ id: 7, role: "ADMIN" });
  });

  it("remove toda a sessão sem apagar o e-mail lembrado", () => {
    localStorage.setItem("token", "access-token");
    localStorage.setItem("user", "{}");
    localStorage.setItem("refreshToken", "refresh-token");
    localStorage.setItem("rememberedEmail", "cliente@email.com");

    clearAuthSession();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(localStorage.getItem("rememberedEmail")).toBe("cliente@email.com");
  });

  it("rejeita resposta de autenticação criada antes do logout", () => {
    expect(isAuthSnapshotCurrent({
      snapshotToken: "token-antigo",
      currentToken: null,
      snapshotRevision: 0,
      currentRevision: 1,
    })).toBe(false);
  });
});
