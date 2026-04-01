import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'preview', 'production']).default('development'),
  PAYLOAD_SECRET: z.string().min(32, 'PAYLOAD_SECRET must be at least 32 characters'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  S3_ACCESS_KEY_ID: z.string().min(1, 'S3_ACCESS_KEY_ID is required'),
  S3_SECRET_ACCESS_KEY: z.string().min(1, 'S3_SECRET_ACCESS_KEY is required'),
  S3_BUCKET: z.string().min(1, 'S3_BUCKET is required'),
  S3_REGION: z.string().min(1, 'S3_REGION is required'),
  S3_ENDPOINT: z.string().url('S3_ENDPOINT must be a valid URL'),
  NEXT_PUBLIC_SERVER_URL: z.string().url('NEXT_PUBLIC_SERVER_URL must be a valid URL'),
  EMAIL_USER: z.string().email('EMAIL_USER must be a valid email').optional(),
  EMAIL_PASSWORD: z.string().optional(),
})

export const env = envSchema.parse(process.env)

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}
