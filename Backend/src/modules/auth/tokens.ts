import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../../config/env";
import { sha256Hex } from "../../common/hash";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashRefreshToken(raw: string): string {
  return sha256Hex(raw);
}

export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
}

export const REFRESH_TOKEN_MAX_AGE_MS = REFRESH_TOKEN_TTL_MS;
