import { describe, expect, it } from "vitest";
import { accountParam, pickSelectedAccount } from "./selected-account";

const ars = { id: "ars", currency: "ARS" as const };
const usd = { id: "usd", currency: "USD" as const };

describe("pickSelectedAccount", () => {
  it("picks the account named in the URL, ignoring case", () => {
    expect(pickSelectedAccount([ars, usd], "usd", "ARS")).toBe(usd);
    expect(pickSelectedAccount([ars, usd], "ARS", "USD")).toBe(ars);
  });

  it("uses the first value when the param is repeated", () => {
    expect(pickSelectedAccount([ars, usd], ["usd", "ars"], "ARS")).toBe(usd);
  });

  it("falls back to the preferred currency without a param", () => {
    expect(pickSelectedAccount([ars, usd], undefined, "USD")).toBe(usd);
    expect(pickSelectedAccount([ars, usd], undefined, "ARS")).toBe(ars);
  });

  it("falls back to the preferred currency for an unknown param", () => {
    expect(pickSelectedAccount([ars, usd], "eur", "USD")).toBe(usd);
  });

  it("falls back to the preferred currency when the user has no account in the requested one", () => {
    expect(pickSelectedAccount([ars], "usd", "ARS")).toBe(ars);
  });

  it("falls back to the first account when there is none in the preferred currency", () => {
    expect(pickSelectedAccount([ars], undefined, "USD")).toBe(ars);
  });

  it("returns undefined when the user has no account", () => {
    expect(pickSelectedAccount([], "ars", "ARS")).toBeUndefined();
  });
});

describe("accountParam", () => {
  it("is the lowercase currency that travels in the URL", () => {
    expect(accountParam("USD")).toBe("usd");
    expect(accountParam("ARS")).toBe("ars");
  });
});
