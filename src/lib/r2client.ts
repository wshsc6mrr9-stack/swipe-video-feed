// src/lib/r2client.ts
import { S3Client } from "@aws-sdk/client-s3";

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function hasR2Env() {
  return !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

export function r2Client() {
  const accountId = must("CLOUDFLARE_ACCOUNT_ID");
  const accessKeyId = must("R2_ACCESS_KEY_ID");
  const secretAccessKey = must("R2_SECRET_ACCESS_KEY");

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

export const R2_BUCKET = () => must("R2_BUCKET_NAME");
