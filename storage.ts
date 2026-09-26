import path from 'node:path'
import type { Config as PayloadConfig, Plugin, PayloadRequest } from 'payload'
import type { TypeWithID } from 'payload'
import { s3Storage } from '@payloadcms/storage-s3'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { getFileKey, getFilePrefix } from '@payloadcms/plugin-cloud-storage/utilities'
import { BlobNotFoundError, head } from '@vercel/blob'
import { getRangeRequestInfo } from 'payload/internal'
import { Media } from './collections'

interface PayloadCollection {
  slug: string
  upload?:
    | false
    | {
        handlers?: PayloadUploadHandler[]
        modifyResponseHeaders?: (args: { headers: Headers }) => Headers | null | undefined
        [key: string]: unknown
      }
}

type PayloadUploadHandler = (
  req: PayloadRequest,
  args: StaticHandlerArgs,
) => Promise<Response> | Promise<void> | Response | void

interface StaticHandlerArgs {
  doc: TypeWithID
  headers?: Headers
  params: { clientUploadContext?: unknown; collection: string; filename: string; prefix?: string }
}

interface PrivateBlobHandlerOptions {
  baseUrl: string
  cacheControlMaxAge: number
  token: string
}

/**
 * Builds the blob URL for a file, mirroring the adapter's generateURL:
 * joins the doc prefix with the sanitized filename and percent-encodes
 * the last path segment so spaces in filenames survive a URL round-trip.
 */
function generateLocalURL({
  baseUrl,
  filename,
  prefix,
}: {
  baseUrl: string
  filename: string
  prefix: string
}): string {
  const { fileKey } = getFileKey({
    collectionPrefix: '',
    docPrefix: prefix,
    filename,
    useCompositePrefixes: false,
  })
  const dir = path.posix.dirname(fileKey)
  const encodedFilename = encodeURIComponent(path.posix.basename(fileKey))
  const finalKey = dir === '.' ? encodedFilename : path.posix.join(dir, encodedFilename)
  return `${baseUrl}/${finalKey}`
}

/**
 * staticHandler replacement for private blob stores.
 *
 * Upstream @payloadcms/storage-vercel-blob reads files with a plain
 * `fetch()` against the blob URL, which works only for public stores.
 * This clone adds an Authorization header to that fetch, reusing the
 * upstream helpers (getFilePrefix, getRangeRequestInfo) and @vercel/blob
 * `head` (token-scoped, works for private stores) for metadata.
 */
function createPrivateStaticHandler(
  collection: PayloadCollection,
  { baseUrl, cacheControlMaxAge, token }: PrivateBlobHandlerOptions,
): PayloadUploadHandler {
  return async (
    req,
    {
      headers: incomingHeaders,
      params: { clientUploadContext, filename, prefix: prefixQueryParam },
    },
  ) => {
    try {
      const docPrefix = await getFilePrefix({
        clientUploadContext,
        collection: collection as never,
        filename,
        prefixQueryParam,
        req,
      })
      const fileUrl = generateLocalURL({ baseUrl, filename, prefix: docPrefix })

      const etagFromHeaders = req.headers.get('etag') || req.headers.get('if-none-match')
      const blobMetadata = await head(fileUrl, { token })
      const { contentDisposition, contentType, size, uploadedAt } = blobMetadata
      const uploadedAtString = uploadedAt.toISOString()
      const fileKeyForETag = fileUrl.replace(`${baseUrl}/`, '')
      const ETag = `"${fileKeyForETag}-${uploadedAtString}"`

      // Handle range request
      const rangeHeader = req.headers.get('range')
      const rangeResult = getRangeRequestInfo({ fileSize: size, rangeHeader })
      if (rangeResult.type === 'invalid') {
        return new Response(null, {
          headers: new Headers(rangeResult.headers),
          status: rangeResult.status,
        })
      }

      let headers = new Headers(incomingHeaders)
      for (const [key, value] of Object.entries(rangeResult.headers)) {
        headers.append(key, value)
      }
      headers.append('Cache-Control', `public, max-age=${cacheControlMaxAge}`)
      headers.append('Content-Disposition', contentDisposition)
      headers.append('Content-Type', contentType)
      headers.append('ETag', ETag)

      // Add Content-Security-Policy header for SVG files to prevent executable code
      if (contentType === 'image/svg+xml') {
        headers.append('Content-Security-Policy', "script-src 'none'")
      }

      const upload = collection.upload
      if (
        upload &&
        typeof upload === 'object' &&
        typeof upload.modifyResponseHeaders === 'function'
      ) {
        headers = upload.modifyResponseHeaders({ headers }) || headers
      }

      if (etagFromHeaders && etagFromHeaders === ETag) {
        return new Response(null, { headers, status: 304 })
      }

      const response = await fetch(`${fileUrl}?${uploadedAtString}`, {
        headers: {
          // Private stores require an authenticated read; the upstream
          // public-store handler fetches the blob anonymously.
          authorization: `Bearer ${token}`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
          ...(rangeResult.type === 'partial' && {
            Range: `bytes=${rangeResult.rangeStart}-${rangeResult.rangeEnd}`,
          }),
        },
      })

      if (!response.ok || !response.body) {
        return new Response(null, { status: 204, statusText: 'No Content' })
      }

      headers.append('Last-Modified', uploadedAtString)
      return new Response(response.body, {
        headers,
        status: rangeResult.status,
      })
    } catch (err) {
      if (err instanceof BlobNotFoundError) {
        return new Response(null, { status: 404, statusText: 'Not Found' })
      }
      req.payload.logger.error({ err, msg: 'Unexpected error in staticHandler' })
      return new Response('Internal Server Error', { status: 500 })
    }
  }
}

/**
 * Post-processes a blob plugin config so media is served from a private store:
 * the uploader asks @vercel/blob for `access: 'private'`, so reads must be
 * token-authenticated. Swaps the plugin's staticHandler (the last entry in each
 * targeted collection's upload.handlers) for a token-aware variant.
 */
async function withPrivateBlobAccess(
  plugin: Plugin,
  config: PayloadConfig,
): Promise<PayloadConfig> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return config
  }

  const storeId = token.match(/^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i)?.[1]?.toLowerCase()
  const baseUrl =
    process.env.STORAGE_VERCEL_BLOB_BASE_URL ||
    (storeId ? `https://${storeId}.private.blob.vercel-storage.com` : undefined)
  if (!baseUrl) {
    return config
  }

  const result = await plugin(config)
  if (!result?.collections) {
    return result
  }

  const cacheControlMaxAge = 60 * 60 * 24 * 365
  return {
    ...result,
    collections: result.collections.map((collection) => {
      if (collection.slug !== Media.slug) {
        return collection
      }
      const upload = collection.upload
      if (
        !upload ||
        typeof upload !== 'object' ||
        !Array.isArray(upload.handlers) ||
        upload.handlers.length === 0
      ) {
        return collection
      }

      const handlers = [...upload.handlers]
      handlers[handlers.length - 1] = createPrivateStaticHandler(
        collection as unknown as PayloadCollection,
        { baseUrl, cacheControlMaxAge, token },
      )
      return {
        ...collection,
        upload: {
          ...upload,
          handlers,
        },
      }
    }),
  }
}

/**
 * Storage selection, in priority order:
 *
 * 1. Vercel deployments use Vercel Blob whenever a Blob token is present —
 *    exactly today's behavior, taking precedence over any stray S3 variables
 *    (e.g. local-dev Supabase S3 values that would be unreachable from Vercel).
 * 2. S3 everywhere else (local dev, the Docker deploy, or an explicit
 *    S3-only Vercel project) — selected whenever S3 credentials are present,
 *    so one adapter serves local Supabase S3, the compose MinIO, and any
 *    remote S3-compatible provider.
 * 3. Non-Vercel fallback to Blob when only a token exists.
 * 4. Otherwise, fail loudly: a config that cannot store media must not boot.
 *
 * Media is private user content (profile pictures, guest photos), so Blob
 * stores are used with `access: 'private'` and uploads require an
 * authenticated GET. See withPrivateBlobAccess.
 */
export function getStoragePlugin(): Plugin {
  const hasS3Credentials = Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY)
  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN)
  const isVercelDeployment = Boolean(process.env.VERCEL)

  if (isVercelDeployment && hasBlobToken) {
    const config = vercelBlobStorage({
      collections: {
        [Media.slug]: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN,
      // TS lies: @payloadcms/storage-vercel-blob types `access` as 'public'
      // only, but @vercel/blob upholds the 'private' value.
      access: 'private' as unknown as 'public',
    })
    return async (payloadConfig) => withPrivateBlobAccess(config, payloadConfig)
  }

  if (hasS3Credentials) {
    return s3Storage({
      collections: {
        [Media.slug]: {
          prefix: 'media',
        },
      },
      bucket: process.env.S3_BUCKET || 'media',
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        region: process.env.S3_REGION || 'local',
        endpoint: process.env.S3_ENDPOINT || '',
        forcePathStyle: true,
      },
    })
  }

  if (hasBlobToken) {
    const config = vercelBlobStorage({
      collections: {
        [Media.slug]: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN,
      // TS lies: @payloadcms/storage-vercel-blob types `access` as 'public'
      // only, but @vercel/blob upholds the 'private' value.
      access: 'private' as unknown as 'public',
    })
    return async (payloadConfig) => withPrivateBlobAccess(config, payloadConfig)
  }

  throw new Error(
    'No storage backend configured. Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY ' +
      'for S3-compatible storage, or BLOB_READ_WRITE_TOKEN for Vercel Blob.',
  )
}
