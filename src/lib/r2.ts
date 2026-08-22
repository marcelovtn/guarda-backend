import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NodeHttpHandler } from "@smithy/node-http-handler";

/**
 * Two buckets, because the two kinds of asset have different audiences.
 *
 * `media` is public: a profile photo is served straight from the bucket's
 * public URL, so the address can be stored and cached forever. `video` is
 * private — the lesson recordings are the thing students pay for, and they
 * leave the bucket only through a signed URL that expires.
 *
 * Keeping them apart is what lets an avatar have a permanent address while a
 * lesson does not. One bucket cannot do both: R2 makes public access a
 * property of the bucket, not of a prefix.
 */
export type BucketKind = "media" | "video";

function getCredentials() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 não configurado. Verifique R2_ACCOUNT_ID, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY.",
    );
  }

  return { accountId, accessKeyId, secretAccessKey };
}

function getBucket(kind: BucketKind): string {
  const bucket =
    kind === "media"
      ? process.env.R2_MEDIA_BUCKET
      : process.env.R2_VIDEO_BUCKET;

  if (!bucket) {
    const variable = kind === "media" ? "R2_MEDIA_BUCKET" : "R2_VIDEO_BUCKET";
    throw new Error(`R2 não configurado. Verifique ${variable}.`);
  }

  return bucket;
}

/** Base address of the public bucket. Only `media` has one. */
function getMediaPublicUrl(): string {
  const publicUrl = process.env.R2_MEDIA_PUBLIC_URL;

  if (!publicUrl) {
    throw new Error("R2 não configurado. Verifique R2_MEDIA_PUBLIC_URL.");
  }

  return publicUrl.replace(/\/$/, "");
}

/** Permanent address of an object in the public bucket. */
export function buildPublicUrl(key: string): string {
  return `${getMediaPublicUrl()}/${key}`;
}

let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    const { accountId, accessKeyId, secretAccessKey } = getCredentials();
    s3ClientInstance = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      // connectionTimeout: 5s para detectar falhas de rede rapidamente.
      // requestTimeout: 60s como safety net para conexões verdadeiramente presas.
      // IMPORTANTE: não usar valor < 20s — o R2 ocasionalmente leva ~20s para
      // responder a uploads específicos; timeouts menores causam retries que
      // acumulam (ex.: 10s + 10s + 20s = 40s, pior que os 20s originais).
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 5_000,
        requestTimeout: 60_000,
      }),
    });
  }
  return s3ClientInstance;
}

let presignClientInstance: S3Client | null = null;

/**
 * Client used only for signing.
 *
 * Separate from the one above because it turns the checksum middleware off:
 * the extra headers it adds would have to be reproduced by the browser on the
 * PUT, and a mismatch shows up as an opaque CORS failure.
 */
function getPresignClient(): S3Client {
  if (!presignClientInstance) {
    const { accountId, accessKeyId, secretAccessKey } = getCredentials();
    presignClientInstance = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return presignClientInstance;
}

export async function uploadToR2(
  kind: BucketKind,
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getBucket(kind),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/** URL the browser can PUT to, so the blob never passes through the API. */
export async function getPresignedUploadUrl(
  kind: BucketKind,
  key: string,
  contentType: string,
  expiresIn = 300,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucket(kind),
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(getPresignClient(), command, {
    expiresIn,
    unhoistableHeaders: new Set(["content-type"]),
  });
}

/**
 * Short-lived URL for reading a private object.
 *
 * This is how a lesson video reaches the player. Do not store the result:
 * it stops working when it expires, and a stored copy would outlive it.
 */
export async function getPresignedDownloadUrl(
  kind: BucketKind,
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(kind),
    Key: key,
  });

  return getSignedUrl(getPresignClient(), command, { expiresIn });
}

export async function downloadFromR2(
  kind: BucketKind,
  key: string,
): Promise<Buffer> {
  const response = await getS3Client().send(
    new GetObjectCommand({ Bucket: getBucket(kind), Key: key }),
  );

  if (!response.Body) {
    throw new Error(`R2: body vazio para key ${key}`);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function deleteFromR2(
  kind: BucketKind,
  key: string,
): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: getBucket(kind), Key: key }),
  );
}
