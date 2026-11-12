import { describe, expect, it } from "vitest";
import { QUICK_ACTIONS } from "@/features/account/quick-actions";

describe("Home quick actions", () => {
  it("keeps the previous shortcuts in order and adds Finanzas last", () => {
    expect(QUICK_ACTIONS.map(({ href, label }) => [href, label])).toEqual([
      ["/ingresar-dinero", "Ingresar"],
      ["/transferir", "Transferir"],
      ["/servicios", "Servicios"],
      ["/recargas", "Recargas"],
      ["/tarjetas", "Tarjetas"],
      ["/dolares", "Dólares"],
      ["/promociones", "Promos"],
      ["/finanzas", "Finanzas"],
    ]);
  });
});
