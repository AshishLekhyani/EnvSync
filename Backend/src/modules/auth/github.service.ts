import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { ConflictError, UnauthorizedError } from "../../common/errors/AppError";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_USER_EMAILS_URL = "https://api.github.com/user/emails";

export function getAuthorizeUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state,
  });
  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new UnauthorizedError("GitHub did not return an access token");
  }
  return body.access_token;
}

export interface GithubProfile {
  githubId: string;
  email: string;
  name: string;
}

export async function fetchGithubProfile(accessToken: string): Promise<GithubProfile> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
  };

  const userRes = await fetch(GITHUB_USER_URL, { headers });
  const user = (await userRes.json()) as {
    id: number;
    login: string;
    name: string | null;
    email: string | null;
  };

  let email = user.email;
  if (!email) {
    const emailsRes = await fetch(GITHUB_USER_EMAILS_URL, { headers });
    const emails = (await emailsRes.json()) as {
      email: string;
      primary: boolean;
      verified: boolean;
    }[];
    const primary = emails.find((e) => e.primary && e.verified);
    email = primary?.email ?? null;
  }

  if (!email) {
    throw new UnauthorizedError("GitHub account has no verified email address");
  }

  return {
    githubId: String(user.id),
    email,
    name: user.name ?? user.login,
  };
}

export async function findOrCreateGithubUser(profile: GithubProfile) {
  const existingByProvider = await prisma.user.findUnique({
    where: {
      authProvider_providerId: { authProvider: "GITHUB", providerId: profile.githubId },
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
      authProvider: "GITHUB",
      providerId: profile.githubId,
    },
  });
}
