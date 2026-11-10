import { z } from "zod";
import { getApiUrl } from "@/lib/api-url";

const refreshResponseSchema = z.object({
  status: z.literal(true),
  data: z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1).optional(),
  }),
});

export const refreshAccessToken = async (refreshToken: string) => {
  if (!refreshToken) throw new Error("Refresh token is missing");
  // A server refresh must not invoke the browser session interceptor recursively.
  const response = await fetch(`${getApiUrl()}/auth/refresh-access-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Unable to refresh session");
  return refreshResponseSchema.parse(await response.json());
};
