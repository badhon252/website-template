/** @jest-environment node */
import { api } from "@/lib/api";
import { getSampleItems } from "@/features/sample-feature/api/sample.api";
jest.mock("@/lib/api", () => ({ api: { get: jest.fn() } }));

test("rejects malformed sample responses at the API boundary", async () => {
  jest.mocked(api.get).mockResolvedValue({ data: { unexpected: true } });
  await expect(getSampleItems()).rejects.toThrow();
});

test("preserves the documented sample item shape", async () => {
  const data = [{ id: "item-1", name: "Sample", createdAt: "2026-11-10" }];
  jest.mocked(api.get).mockResolvedValue({ data });
  await expect(getSampleItems()).resolves.toEqual(data);
});
