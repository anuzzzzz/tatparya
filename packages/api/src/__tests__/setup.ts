// Test setup — runs before all tests
// Sets environment variables for test mode

process.env['NODE_ENV'] = 'test';
process.env['SUPABASE_URL'] = process.env['SUPABASE_URL'] || 'http://127.0.0.1:54321';
process.env['SUPABASE_ANON_KEY'] = process.env['SUPABASE_ANON_KEY'] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key';
process.env['SUPABASE_SERVICE_ROLE_KEY'] = process.env['SUPABASE_SERVICE_ROLE_KEY'] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key';
process.env['DATABASE_URL'] = process.env['DATABASE_URL'] || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
process.env['REDIS_URL'] = process.env['REDIS_URL'] || 'redis://127.0.0.1:6379';
process.env['API_PORT'] = '3099'; // Different port for tests
