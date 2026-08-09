import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NodeHttpHandler } from "@smithy/node-http-handler";

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error(
      "R2 não configurado. Verifique as variáveis: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL",
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    const { accountId, accessKeyId, secretAccessKey } = getR2Config();
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

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const { bucket, publicUrl } = getR2Config();
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  const cleanPublicUrl = publicUrl.replace(/\/$/, "");
  return `${cleanPublicUrl}/${key}`;
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300,
): Promise<{ presignedUrl: string; publicUrl: string }> {
  const { bucket, publicUrl } = getR2Config();
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();

  // Presigned URLs usam um client separado sem checksum middleware,
  // para evitar headers extras que complicam o CORS no browser.
  const presignClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const presignedUrl = await getSignedUrl(presignClient as any, command, {
    expiresIn,
    unhoistableHeaders: new Set(["content-type"]),
  });
  const cleanPublicUrl = publicUrl.replace(/\/$/, "");

  return { presignedUrl, publicUrl: `${cleanPublicUrl}/${key}` };
}

export async function downloadFromR2(key: string): Promise<Buffer> {
  const { bucket } = getR2Config();
  const client = getS3Client();

  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
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

export async function deleteFromR2(key: string): Promise<void> {
  const { bucket } = getR2Config();
  const client = getS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}
