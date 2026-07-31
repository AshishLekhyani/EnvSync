import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { ConflictError, UnauthorizedError } from "../../common/errors/AppError";

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export function getAuthorizeUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    state,
  });
  return `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID ?? "",
      client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new UnauthorizedError("Google did not return an access token");
  }
  return body.access_token;
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const user = (await res.json()) as {
    id: string;
    email?: string;
    verified_email?: boolean;
    name?: string;
  };

  if (!user.email || !user.verified_email) {
    throw new UnauthorizedError("Google account has no verified email address");
  }

  return {
    googleId: user.id,
    email: user.email,
    name: user.name ?? user.email,
  };
}

export async function findOrCreateGoogleUser(profile: GoogleProfile) {
  const existingByProvider = await prisma.user.findUnique({
    where: {
      authProvider_providerId: { authProvider: "GOOGLE", providerId: profile.googleId },
    },
  });

  if (existingByProvider) {
    return existingByProvider;
  }

  const existingByEmail = await prisma.user.findUnique({ where: { email: profile.email } });
  if (existingByEmail) {
    throw new ConflictError(
      "An account with this email already exists. Log in with your password."
    );
  }

  return prisma.user.create({
    data: {
      email: profile.email,
      name: profile.name,
      authProvider: "GOOGLE",
      providerId: profile.googleId,
      emailVerifiedAt: new Date(),
    },
  });
}
