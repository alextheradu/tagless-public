function hasProtocol(value: string): boolean {
  return /^[a-z][a-z\d+\-.]*:\/\//i.test(value);
}

function normalizeBaseUrl(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;

  const withProtocol = hasProtocol(raw)
    ? raw
    : raw.startsWith("localhost") ||
        raw.startsWith("127.") ||
        raw.startsWith("0.0.0.0") ||
        raw.startsWith("[::1]")
      ? `http://${raw}`
      : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function configuredBaseUrl(): string | undefined {
  const candidates = [
    process.env.NEXTAUTH_URL,
    process.env.AUTH_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ];

  for (const candidate of candidates) {
    const baseUrl = normalizeBaseUrl(candidate);
    if (!baseUrl) continue;
    return baseUrl;
  }
}

export function configuredUrl(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;

  const withProtocol = hasProtocol(raw)
    ? raw
    : raw.startsWith("localhost") ||
        raw.startsWith("127.") ||
        raw.startsWith("0.0.0.0") ||
        raw.startsWith("[::1]")
      ? `http://${raw}`
      : `https://${raw}`;

  try {
    return new URL(withProtocol).toString();
  } catch {
    return undefined;
  }
}

export function callbackUrl(requestUrl: string | URL, pathname: string): string {
  const requestOrigin = new URL(requestUrl).origin;
  const baseUrl = configuredBaseUrl() ?? requestOrigin;
  return new URL(pathname, baseUrl).toString();
}
