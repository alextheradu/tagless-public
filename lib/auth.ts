import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import { getSessionOptions } from "./sessionOptions";

export { getSessionOptions };

export interface HackclubAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  zip: string;
}

export interface HackclubUser {
  id: string;
  email: string;
  username?: string;
  name?: string;
  slack_id?: string;
  verification_status?: string;
  birthdate?: string;
  address?: HackclubAddress;
}

export interface SessionData {
  user?: {
    id: string;
    email: string;
    name: string;
    slackId?: string;
    birthday?: string;
    address?: HackclubAddress;
    verificationStatus?: string;
    lastActiveTouchAt?: string;
  };
  hackatimeToken?: string;
  hackatimeUserId?: string;
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}

export function hackclubAuthorizeUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.HACKCLUB_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email name profile verification_status slack_id address",
    state,
  });
  return `https://auth.hackclub.com/oauth/authorize?${params}`;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<{
  access_token: string;
  token_type: string;
}> {
  const res = await fetch("https://auth.hackclub.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.HACKCLUB_CLIENT_ID!,
      client_secret: process.env.HACKCLUB_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }).toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  return res.json();
}

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function normalizeAddress(value: unknown): HackclubAddress | undefined {
  const address = asObject(value);
  if (!address) return undefined;

  const line1 = stringValue(address.line_1) ?? stringValue(address.street_address);
  if (!line1) return undefined;

  return {
    line1,
    line2: stringValue(address.line_2),
    city: stringValue(address.city) ?? stringValue(address.locality) ?? "",
    state: stringValue(address.state) ?? stringValue(address.region) ?? "",
    country: stringValue(address.country) ?? "",
    zip: stringValue(address.postal_code) ?? "",
  };
}

export function normalizeHackclubUser(payload: unknown): HackclubUser | null {
  const root = asObject(payload);
  if (!root) return null;

  const identity = asObject(root.identity);
  if (identity) {
    const id = stringValue(identity.id);
    const email = stringValue(identity.primary_email) ?? stringValue(identity.email);
    if (!id || !email) return null;

    const firstName = stringValue(identity.first_name);
    const lastName = stringValue(identity.last_name);
    const addresses = Array.isArray(identity.addresses) ? identity.addresses : [];
    const primaryAddress =
      addresses.find((candidate) => asObject(candidate)?.primary === true) ?? addresses[0];

    return {
      id,
      email,
      name: [firstName, lastName].filter(Boolean).join(" ") || undefined,
      slack_id: stringValue(identity.slack_id),
      verification_status: stringValue(identity.verification_status),
      birthdate: stringValue(identity.birthday) ?? stringValue(identity.birthdate),
      address: normalizeAddress(primaryAddress),
    };
  }

  const id =
    stringValue(root.id) ?? stringValue(root.sub) ?? stringValue(root.user_id);
  const email =
    stringValue(root.email) ?? stringValue(root.primary_email);
  if (!id || !email) return null;

  const addresses = Array.isArray(root.addresses) ? root.addresses : [];
  const primaryAddress =
    addresses.find((candidate) => asObject(candidate)?.primary === true) ?? addresses[0];

  return {
    id,
    email,
    username: stringValue(root.username),
    name: stringValue(root.name),
    slack_id: stringValue(root.slack_id),
    verification_status: stringValue(root.verification_status),
    birthdate: stringValue(root.birthdate) ?? stringValue(root.birthday),
    address: normalizeAddress(root.address) ?? normalizeAddress(primaryAddress),
  };
}

export async function getHackclubUser(accessToken: string): Promise<HackclubUser> {
  const endpoints = [
    "https://auth.hackclub.com/api/v1/me",
    "https://auth.hackclub.com/oauth/userinfo",
    "https://auth.hackclub.com/api/v1/users/current",
  ];

  let lastError = "";
  for (const url of endpoints) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.ok) {
      const user = normalizeHackclubUser(await res.json().catch(() => null));
      if (user) return user;
      lastError = `${url} returned an unrecognized response shape`;
      continue;
    }
    const text = await res.text().catch(() => "");
    lastError = `${url} → ${res.status} ${text}`;
  }
  throw new Error(`Failed to fetch HC user: ${lastError}`);
}
