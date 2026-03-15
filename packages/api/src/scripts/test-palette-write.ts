import { createClient } from '@supabase/supabase-js';
import { env } from '../env.js';

const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const STORE_ID = '1532a530-2d4a-4b14-92db-79da88b27ebc';

const { data: store } = await db.from('stores').select('store_config').eq('id', STORE_ID).single();
const config = store!.store_config as any;
console.log('BEFORE primary:', config.design.palette.primary);

const newPalette = {
  mode: 'custom', primary: '#9333EA', secondary: '#A855F7', accent: '#7C3AED',
  background: '#FAFAFA', surface: '#F3E8FF', text: '#1E1B4B', textMuted: '#6B7280'
};
const mergedDesign = { ...config.design, palette: newPalette };
const { error } = await db.from('stores')
  .update({ store_config: { ...config, design: mergedDesign } })
  .eq('id', STORE_ID);

console.log('update error:', error?.message || 'none');

const { data: after } = await db.from('stores').select('store_config').eq('id', STORE_ID).single();
const afterConfig = after!.store_config as any;
console.log('AFTER primary:', afterConfig.design.palette.primary);
