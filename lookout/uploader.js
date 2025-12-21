// scripts/lookout/uploader.js
import fs from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

const SECRETS_PATH = path.join(process.cwd(), "scripts", "lookout", "secrets.env");

export function loadSecretsOrThrow() {
  if (!fs.existsSync(SECRETS_PATH)) {
    throw new Error(`Missing secrets file at ${SECRETS_PATH}`);
  }

  const env = dotenv.parse(fs.readFileSync(SECRETS_PATH, "utf8"));

  const required = ["B2_ENDPOINT", "B2_BUCKET", "B2_REGION", "B2_KEY_ID", "B2_APP_KEY"];
  for (const k of required) {
    if (!env[k] || !String(env[k]).trim()) {
      throw new Error(`Missing required secret: ${k} in ${SECRETS_PATH}`);
    }
  }

  return {
    endpoint: env.B2_ENDPOINT.trim(),
    bucket: env.B2_BUCKET.trim(),
    region: env.B2_REGION.trim(),
    keyId: env.B2_KEY_ID.trim(),
    appKey: env.B2_APP_KEY.trim(),
  };
}

export function makeS3Client(secrets) {
  return new S3Client({
    region: secrets.region,
    endpoint: secrets.endpoint,
    credentials: {
      accessKeyId: secrets.keyId,
      secretAccessKey: secrets.appKey,
    },
    forcePathStyle: true, // works well for S3-compatible endpoints
  });
}

export async function putObjectText({ s3, bucket, key, body, contentType }) {
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await s3.send(cmd);
}