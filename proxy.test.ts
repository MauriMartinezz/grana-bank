import { readdirSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { SESSION_COOKIE } from "@/features/auth/session-cookie";
import { config, proxy } from "./proxy";

function request(path: string, cookie?: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {},
  });
}

describe("proxy", () => {
  it.each([
    "/inicio",
    "/movimientos",
    "/movimientos/some-id",
    "/transferir",
    "/transferir/nuevo",
    "/servicios",
    "/recargas",
    "/recargas/sube",
    "/recargas/sube/nueva",
    "/recargas/confirmar",
    "/recargas/comprobante/some-id",
    "/tarjetas",
    "/tarjetas/nueva",
    "/dolares",
    "/perfil",
  ])(
    "redirects %s to login without a session cookie",
    (path) => {
      const response = proxy(request(path));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/ingresar",
      );
    },
  );

  it("lets a request with a session cookie continue", () => {
    const response = proxy(request("/inicio", "token"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("covers every private route", () => {
    const routes = readdirSync(path.join(__dirname, "app/(app)"), {
      withFileTypes: true,
    }).filter((entry) => entry.isDirectory());

    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      expect(
        config.matcher.some((pattern) => pattern.startsWith(`/${route.name}`)),
      ).toBe(true);
    }
  });
});
