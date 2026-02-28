import { z } from 'zod';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from monorepo root
config({ path: resolve(process.cwd(), '../../.env.local') });
// Also try local .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const EnvSchema = z.object({
  // Supabase
  SUPABASE_URL: z.string().url().default('http://127.0.0.1:54321'),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1).default('postgresql://postgres:postgres@127.0.0.1:54322/postgres'),

  // Redis
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),

  // API Server
  API_PORT: z.coerce.number().default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // App
  APP_DOMAIN: z.string().default('tatparya.in'),
  API_BASE_URL: z.string().url().default('http://localhost:3001'),
  STOREFRONT_BASE_URL: z.string().url().default('http://localhost:3000'),

  // Anthropic (Claude) — Required for AI catalog features
  ANTHROPIC_API_KEY: z.string().min(1).optional(),

  // Cloudflare R2 — Required for image storage
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET_NAME: z.string().default('tatparya-media'),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Payments (for later phases)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  // WhatsApp (for later phases)
  GUPSHUP_API_KEY: z.string().optional(),

  // AI extras (for later phases)
  REPLICATE_API_TOKEN: z.string().optional(),
});

function loadEnv() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    // In test mode, provide defaults
    if (process.env['NODE_ENV'] === 'test') {
      // Filter out empty strings that fail validation (e.g. R2_PUBLIC_URL="")
      const cleaned = Object.fromEntries(
        Object.entries(process.env).filter(([, v]) => v !== '')
      );
      return EnvSchema.parse({
        ...cleaned,
        SUPABASE_ANON_KEY: process.env['SUPABASE_ANON_KEY'] || 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY'] || 'test-service-key',
        ANTHROPIC_API_KEY: process.env['ANTHROPIC_API_KEY'] || 'test-anthropic-key',
        R2_ACCOUNT_ID: process.env['R2_ACCOUNT_ID'] || 'test-r2-account',
        R2_ACCESS_KEY_ID: process.env['R2_ACCESS_KEY_ID'] || 'test-r2-access',
        R2_SECRET_ACCESS_KEY: process.env['R2_SECRET_ACCESS_KEY'] || 'test-r2-secret',
      });
    }
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof EnvSchema>;
