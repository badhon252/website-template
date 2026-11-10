export function getApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) throw new Error("API URL is not configured");
  const url = new URL(raw);
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const isSecure = url.protocol === "https:";
  const isLocalDevelopment =
    process.env.NODE_ENV !== "production" &&
    isLocal &&
    url.protocol === "http:";
  if (
    (!isSecure && !isLocalDevelopment) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "API URL must use HTTPS without credentials, query, or fragment",
    );
  }
  return url.toString().replace(/\/$/, "");
}
