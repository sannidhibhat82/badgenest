import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthFromRequest } from "../../lib/auth";
import { requireAdmin } from "../../lib/admin";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const bucket = req.query.bucket as string;
  if (!bucket || !["avatars", "badge-images", "issuer-logos"].includes(bucket)) {
    return res.status(400).json({ error: "Invalid bucket" });
  }

  if (bucket !== "avatars") {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
  }

  const { data, filename } = req.body ?? {};
  if (!data) return res.status(400).json({ error: "data (base64) required" });

  try {
    const buf = Buffer.from(data, "base64");
    const ext = filename ? path.extname(filename) : ".png";
    const safeName = `${bucket === "avatars" ? auth.sub : "img"}-${Date.now()}${ext}`;
    const dir = path.join(UPLOAD_DIR, bucket);
    ensureDir(dir);
    const filepath = path.join(dir, safeName);
    fs.writeFileSync(filepath, buf);
    const url = `/uploads/${bucket}/${safeName}`;
    return res.status(200).json({ path: url, publicUrl: url });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
}
