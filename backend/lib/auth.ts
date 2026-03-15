import { NextApiRequest } from "next";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production";

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export function signToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function getAuthFromRequest(req: NextApiRequest): JwtPayload | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}
