// src/app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { getApiUrl } from "@/lib/api-url";
import { refreshAccessToken } from "@/features/auth/api/refresh-token.api";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(1024),
});
const loginResponseSchema = z.object({
  data: z.object({
    user: z
      .object({
        _id: z.string().min(1).optional(),
        id: z.string().min(1).optional(),
        name: z.string(),
        email: z.string().email(),
        profileImage: z.string().nullish(),
        role: z.string().min(1),
        refreshToken: z.string().min(1),
      })
      .refine((user) => Boolean(user._id || user.id)),
    accessToken: z.string().min(1),
  }),
});

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        try {
          const res = await fetch(`${getApiUrl()}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsed.data),
            cache: "no-store",
            redirect: "error",
            signal: AbortSignal.timeout(10_000),
          });
          if (!res.ok) return null;
          const { data } = loginResponseSchema.parse(await res.json());
          const { user } = data;
          return {
            id: (user._id || user.id)!,
            name: user.name,
            email: user.email,
            image: user.profileImage ?? "",
            role: user.role,
            token: data.accessToken,
            refreshToken: user.refreshToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        return {
          ...token,
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          accessToken: user.token,
          refreshToken: user.refreshToken,
          accessTokenExpires: Date.now() + 60 * 60 * 1000, // Default 1 hour expiry
        };
      }

      // Identity and permissions come only from the authenticated backend.
      // Client-supplied session updates must never overwrite signed claims.
      // Return previous token if the access token has not expired yet
      if (Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Access token has expired, try to update it
      try {
        const refreshedTokens = await refreshAccessToken(token.refreshToken);

        if (!refreshedTokens.status) {
          throw refreshedTokens;
        }

        return {
          ...token,
          accessToken: refreshedTokens.data.accessToken,
          error: undefined,
          accessTokenExpires: Date.now() + 60 * 60 * 1000, // Update expiration
          refreshToken: refreshedTokens.data.refreshToken || token.refreshToken, // Fallback to old refresh token
        };
      } catch {
        return {
          ...token,
          error: "RefreshAccessTokenError",
        };
      }
    },

    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id,
          name: token.name,
          email: token.email,
          image: token.image,
          role: token.role,
        };
        session.accessToken = token.error ? "" : token.accessToken;
        session.error = token.error;
      }
      return session;
    },
  },

  useSecureCookies: process.env.NODE_ENV === "production",
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
