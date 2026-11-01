import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("accepts the original password", async () => {
    const hash = await hashPassword("Correct-Horse1@");
    await expect(verifyPassword("Correct-Horse1@", hash)).resolves.toBe(true);
  });

  it("rejects a different password, including a different case", async () => {
    const hash = await hashPassword("Correct-Horse1@");
    await expect(verifyPassword("wrong", hash)).resolves.toBe(false);
    await expect(verifyPassword("correct-horse1@", hash)).resolves.toBe(false);
  });

  it("never stores the password and salts every hash", async () => {
    const first = await hashPassword("Correct-Horse1@");
    const second = await hashPassword("Correct-Horse1@");
    expect(first).not.toContain("Correct-Horse1@");
    expect(first).not.toBe(second);
  });

  it("rejects malformed stored values without throwing", async () => {
    for (const stored of ["!", "", "abc", "abc:def", ":"]) {
      await expect(verifyPassword("anything", stored)).resolves.toBe(false);
    }
  });
});
