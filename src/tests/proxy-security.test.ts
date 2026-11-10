/** @jest-environment node */
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { proxy } from "@/proxy";

jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));
const token = {
  id: "user-1",
  name: "User",
  email: "user@example.com",
  image: "",
  role: "USER",
  accessToken: "access-token",
  refreshToken: "refresh-token",
  accessTokenExpires: Date.now() + 3600000,
};
const mockedGetToken = jest.mocked(getToken);
afterEach(() => jest.resetAllMocks());

test("production pages have unique nonces and forbid injected inline scripts", async () => {
  const first = await proxy(new NextRequest("https://app.example.com/"));
  const second = await proxy(new NextRequest("https://app.example.com/"));
  const csp = first.headers.get("Content-Security-Policy");
  expect(csp).toContain("'nonce-");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toBe(second.headers.get("Content-Security-Policy"));
  expect(mockedGetToken).not.toHaveBeenCalled();
});

test("guests cannot access dashboard pages", async () => {
  mockedGetToken.mockResolvedValue(null);
  const response = await proxy(
    new NextRequest("https://app.example.com/dashboard"),
  );
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(
    "https://app.example.com/login?callbackUrl=%2Fdashboard",
  );
});

test("a failed session refresh cannot authorize dashboard access", async () => {
  mockedGetToken.mockResolvedValue({
    ...token,
    role: "ADMIN",
    error: "RefreshAccessTokenError",
  });
  const response = await proxy(
    new NextRequest("https://app.example.com/dashboard/settings"),
  );
  expect(response.headers.get("location")).toContain("/login?");
});

test("regular users cannot access dashboard pages", async () => {
  mockedGetToken.mockResolvedValue({ ...token, role: "USER" });
  const response = await proxy(
    new NextRequest("https://app.example.com/dashboard/settings"),
  );
  expect(response.headers.get("location")).toBe("https://app.example.com/");
});

test("admins retain dashboard access", async () => {
  mockedGetToken.mockResolvedValue({ ...token, role: "ADMIN" });
  const response = await proxy(
    new NextRequest("https://app.example.com/dashboard/settings"),
  );
  expect(response.headers.get("x-middleware-next")).toBe("1");
});
