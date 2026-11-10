/** @jest-environment node */
import { getApiUrl } from "@/lib/api-url";
import { api } from "@/lib/api";
import { getSession } from "next-auth/react";
import { refreshAccessToken } from "@/features/auth/api/refresh-token.api";

jest.mock("next-auth/react", () => ({
  getSession: jest.fn(),
  signOut: jest.fn(),
}));
const originalFetch = global.fetch;
beforeEach(() => {
  jest.replaceProperty(process, "env", {
    ...process.env,
    NODE_ENV: "production",
    NEXT_PUBLIC_API_URL: "https://api.example.com/api/v1",
  });
  global.fetch = jest.fn();
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  global.fetch = originalFetch;
});

test.each([
  "http://api.example.com",
  "http://localhost:5001",
  "https://user:password@example.com",
  "https://api.example.com?x=y",
  "file:///etc/passwd",
])("rejects unsafe production API configuration: %s", (url) => {
  process.env.NEXT_PUBLIC_API_URL = url;
  expect(() => getApiUrl()).toThrow();
});

test("allows HTTP only for local development", () => {
  jest.replaceProperty(process, "env", {
    ...process.env,
    NODE_ENV: "development",
    NEXT_PUBLIC_API_URL: "http://localhost:5001/api/v1/",
  });
  expect(getApiUrl()).toBe("http://localhost:5001/api/v1");
});

test.each(["https://attacker.example/steal", "//attacker.example/steal"])(
  "does not attach credentials to an untrusted destination: %s",
  async (url) => {
    await expect(api.get(url)).rejects.toThrow("configured backend origin");
    expect(getSession).not.toHaveBeenCalled();
  },
);

test("refresh rejects malformed responses without calling the browser session", async () => {
  jest
    .mocked(fetch)
    .mockResolvedValue(
      new Response(
        JSON.stringify({ status: true, data: { accessToken: 123 } }),
      ),
    );
  await expect(refreshAccessToken("refresh-token")).rejects.toThrow();
  expect(getSession).not.toHaveBeenCalled();
});

test("refresh validates rotated tokens and forbids redirects", async () => {
  const data = {
    status: true,
    data: { accessToken: "new-access", refreshToken: "new-refresh" },
  };
  jest.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(data)));
  await expect(refreshAccessToken("old-refresh")).resolves.toEqual(data);
  expect(fetch).toHaveBeenCalledWith(
    "https://api.example.com/api/v1/auth/refresh-access-token",
    expect.objectContaining({
      redirect: "error",
      cache: "no-store",
      signal: expect.any(AbortSignal),
    }),
  );
});
