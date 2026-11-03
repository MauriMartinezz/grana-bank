import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const processScheduledPayments = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/features/services/scheduled-payments", () => ({ processScheduledPayments }));
vi.mock("next/cache", () => ({ revalidatePath }));

const { GET, POST } = await import("./route");

const SECRET = "a-long-random-cron-secret";

function request(method: string, authorization?: string) {
  return new Request("http://localhost/api/pagos-agendados", {
    method,
    headers: authorization === undefined ? {} : { authorization },
  });
}

beforeEach(() => {
  processScheduledPayments.mockReset().mockResolvedValue({ paid: 2, failed: 1 });
  revalidatePath.mockReset();
  vi.stubEnv("CRON_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/api/pagos-agendados", () => {
  it.each(["GET", "POST"])("%s processes every user's due payments with the secret", async (method) => {
    const handler = method === "GET" ? GET : POST;

    const response = await handler(request(method, `Bearer ${SECRET}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ paid: 2, failed: 1 });
    expect(processScheduledPayments).toHaveBeenCalledTimes(1);
    const [{ now, userId }] = processScheduledPayments.mock.calls[0];
    expect(now).toBeInstanceOf(Date);
    expect(userId).toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledWith("/(app)", "layout");
  });

  it.each([
    ["no header", undefined],
    ["a wrong secret", "Bearer wrong-secret"],
    ["the secret without Bearer", SECRET],
    ["a longer secret", `Bearer ${SECRET}x`],
  ])("refuses %s with 401 and processes nothing", async (_name, authorization) => {
    const response = await GET(request("GET", authorization));

    expect(response.status).toBe(401);
    expect(processScheduledPayments).not.toHaveBeenCalled();
  });

  it.each([
    ["unset", undefined],
    ["empty", ""],
  ])("refuses every request when CRON_SECRET is %s", async (_name, value) => {
    vi.stubEnv("CRON_SECRET", value);

    const empty = await GET(request("GET", "Bearer "));
    const undefinedSecret = await GET(request("GET", "Bearer undefined"));

    expect(empty.status).toBe(401);
    expect(undefinedSecret.status).toBe(401);
    expect(processScheduledPayments).not.toHaveBeenCalled();
  });

  it("does not revalidate when nothing was paid", async () => {
    processScheduledPayments.mockResolvedValue({ paid: 0, failed: 1 });

    const response = await GET(request("GET", `Bearer ${SECRET}`));

    expect(await response.json()).toEqual({ paid: 0, failed: 1 });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers 500 without details when the run fails", async () => {
    processScheduledPayments.mockRejectedValue(new Error("database down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(request("GET", `Bearer ${SECRET}`));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Scheduled payments failed" });
  });
});
