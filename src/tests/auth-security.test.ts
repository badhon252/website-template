/** @jest-environment node */
import NextAuth, { type NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";

jest.mock("next-auth", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("@/features/auth/api/refresh-token.api", () => ({
  refreshAccessToken: jest.fn(),
}));
import "@/app/api/auth/[...nextauth]/route";

const options = jest.mocked(NextAuth).mock
  .calls[0][0] as unknown as NextAuthOptions;
const jwt = options.callbacks!.jwt!;
const session = options.callbacks!.session!;
const token = {
  id: "user-1",
  name: "User",
  email: "user@example.com",
  image: "",
  role: "USER",
  accessToken: "access-token",
  refreshToken: "server-only-refresh",
  accessTokenExpires: Date.now() + 3600000,
} satisfies JWT;

test("client session updates cannot change identity, role, or tokens", async () => {
  const result = await jwt({
    token: { ...token },
    trigger: "update",
    session: { user: { id: "admin-1", role: "ADMIN", accessToken: "forged" } },
  } as Parameters<typeof jwt>[0]);
  expect(result).toEqual(token);
});

test("session responses never expose refresh tokens", async () => {
  const result = await session({
    token: { ...token },
    session: { user: {}, expires: "2099-01-01" },
  } as Parameters<typeof session>[0]);
  expect(result).not.toHaveProperty("refreshToken");
  expect(result).toHaveProperty("accessToken", token.accessToken);
});

test("failed refresh does not expose an expired access token", async () => {
  const result = await session({
    token: { ...token, error: "RefreshAccessTokenError" },
    session: { user: {}, expires: "2099-01-01" },
  } as Parameters<typeof session>[0]);
  expect(result).toHaveProperty("accessToken", "");
  expect(result).toHaveProperty("error", "RefreshAccessTokenError");
});

// The provider itself is the boundary: no real backend is called by these tests.
const provider = options
  .providers[0] as import("next-auth/providers/credentials").CredentialsConfig;
const authorize = provider.options!.authorize!;
const request = { body: {}, query: {}, headers: {}, method: "POST" };
const credentials = { email: "user@example.com", password: "test-password" };

beforeEach(() => {
  jest.replaceProperty(process, "env", {
    ...process.env,
    NEXT_PUBLIC_API_URL: "https://api.example.com/api/v1",
  });
  global.fetch = jest.fn();
});
afterEach(() => jest.restoreAllMocks());

test("invalid credentials are rejected before contacting the backend", async () => {
  expect(
    await authorize({ email: "invalid", password: "x" }, request),
  ).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

test("malformed backend login data fails closed", async () => {
  jest
    .mocked(fetch)
    .mockResolvedValue(
      new Response(JSON.stringify({ data: { user: { role: "ADMIN" } } })),
    );
  expect(await authorize(credentials, request)).toBeNull();
});

test("valid backend login data preserves the existing user contract", async () => {
  jest.mocked(fetch).mockResolvedValue(
    new Response(
      JSON.stringify({
        data: {
          user: {
            _id: "user-1",
            name: "User",
            email: "user@example.com",
            role: "USER",
            refreshToken: "refresh-token",
          },
          accessToken: "access-token",
        },
      }),
    ),
  );
  expect(await authorize(credentials, request)).toEqual({
    id: "user-1",
    name: "User",
    email: "user@example.com",
    image: "",
    role: "USER",
    token: "access-token",
    refreshToken: "refresh-token",
  });
});

test("a successful refresh clears a previous transient refresh error", async () => {
  const { refreshAccessToken } =
    await import("@/features/auth/api/refresh-token.api");
  jest
    .mocked(refreshAccessToken)
    .mockResolvedValue({ status: true, data: { accessToken: "fresh-access" } });
  const result = await jwt({
    token: {
      ...token,
      accessTokenExpires: 0,
      error: "RefreshAccessTokenError",
    },
  } as Parameters<typeof jwt>[0]);
  expect(result).toHaveProperty("accessToken", "fresh-access");
  expect(result.error).toBeUndefined();
});
