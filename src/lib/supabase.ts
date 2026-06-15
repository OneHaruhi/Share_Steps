import { createClient } from '@supabase/supabase-js';

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed || trimmed === 'https://your-project.supabase.co' || trimmed === 'your-anon-key') {
    return undefined;
  }

  return trimmed;
}

const supabaseUrl = normalizeEnvValue(__SUPABASE_URL__ || import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = normalizeEnvValue(__SUPABASE_ANON_KEY__ || import.meta.env.VITE_SUPABASE_ANON_KEY);

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
export const missingSupabaseEnvNames = [
  supabaseUrl ? null : 'VITE_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL',
  supabaseAnonKey
    ? null
    : 'VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY',
].filter((name): name is string => Boolean(name));

export const supabase = createClient(supabaseUrl ?? 'https://example.supabase.co', supabaseAnonKey ?? 'missing-key');
