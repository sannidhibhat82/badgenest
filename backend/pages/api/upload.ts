import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthFromRequest } from "../../lib/auth";
import { requireAdmin } from "../../lib/admin";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { z } from "zod";
import { withErrorHandling, withMethods, ok, badRequest, unauthorized } from "../../lib/api/http";
import { parseJson } from "../../lib/api/validate";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const BUCKETS = ["avatars", "badge-images", "issuer-logos"] as const;
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "7mb", // base64 overhead; we still enforce MAX_UPLOAD_BYTES after decoding
    },
  },
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const BodySchema = z
  .object({
    data: z.string().min(1),
    filename: z.string().optional(),
  })
  .strict();

function pickExt(filename?: string): string {
  const ext = filename ? path.extname(filename).toLowerCase() : ".png";
  return ALLOWED_EXT.has(ext) ? ext : ".png";
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized(res);

  const bucket = req.query.bucket;
  if (typeof bucket !== "string" || !(BUCKETS as readonly string[]).includes(bucket)) {
    return badRequest(res, "Invalid bucket");
  }

  if (bucket !== "avatars") {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
  }

  const body = parseJson(BodySchema, req.body ?? {}, res);
  if (!body) return;

  const buf = Buffer.from(body.data, "base64");
  if (!buf.length) return badRequest(res, "Invalid base64 data");
  if (buf.length > MAX_UPLOAD_BYTES) return badRequest(res, `File too large (max ${MAX_UPLOAD_BYTES} bytes)`);

  const ext = pickExt(body.filename);
  const prefix = bucket === "avatars" ? auth.sub : "img";
  const rand = crypto.randomBytes(8).toString("hex");
  const safeName = `${prefix}-${Date.now()}-${rand}${ext}`;

  const dir = path.join(UPLOAD_DIR, bucket);
  ensureDir(dir);
  const filepath = path.join(dir, safeName);
  fs.writeFileSync(filepath, buf, { flag: "wx" });

  const url = `/uploads/${bucket}/${safeName}`;
  return ok(res, { path: url, publicUrl: url });
}

export default withErrorHandling(withMethods(["POST"], handler), { name: "upload" });
