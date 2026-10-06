import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { Injectable, ServiceUnavailableException } from "@nestjs/common"
import { AppConfig } from "../config/app-config.service"
import { objectKey, publicUrl } from "./r2"

const PRESIGN_SECONDS = 15 * 60

/** Cloudflare R2 through the S3 API: audio and images the admin uploads (presigned PUT) and generated covers. */
@Injectable()
export class R2Storage {
  private readonly client: S3Client | null
  private readonly bucket: string | null
  private readonly base: string | null

  constructor(config: AppConfig) {
    const account = config.get("R2_ACCOUNT_ID")
    const accessKeyId = config.get("R2_ACCESS_KEY_ID")
    const secretAccessKey = config.get("R2_SECRET_ACCESS_KEY")
    this.bucket = config.get("R2_BUCKET") ?? null
    this.base = config.get("R2_PUBLIC_BASE_URL") ?? null
    this.client =
      account && accessKeyId && secretAccessKey
        ? new S3Client({
            region: "auto",
            endpoint: `https://${account}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId, secretAccessKey },
          })
        : null
  }

  get configured(): boolean {
    return this.client !== null && this.bucket !== null && this.base !== null
  }

  private ready(): { client: S3Client; bucket: string; base: string } {
    if (!this.client || !this.bucket || !this.base)
      throw new ServiceUnavailableException("R2 storage is not configured")
    return { client: this.client, bucket: this.bucket, base: this.base }
  }

  /** A URL the admin panel PUTs the file to directly (the API never sees the bytes), valid 15 minutes. */
  async presignPut(folder: string, filename: string, contentType: string) {
    const { client, bucket, base } = this.ready()
    const key = objectKey(filename, folder)
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
      { expiresIn: PRESIGN_SECONDS },
    )
    return {
      uploadUrl,
      publicUrl: publicUrl(base, key),
      expiresAt: new Date(Date.now() + PRESIGN_SECONDS * 1000).toISOString(),
    }
  }

  async put(body: Uint8Array, filename: string, contentType: string, folder: string): Promise<string> {
    const { client, bucket, base } = this.ready()
    const key = objectKey(filename, folder)
    await client.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
    )
    return publicUrl(base, key)
  }
}
