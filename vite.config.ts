import { defineConfig, loadEnv } from 'vite';

function readSupabaseEnv(env: Record<string, string>, names: string[]) {
  return names.map((name) => env[name]?.trim()).find(Boolean) ?? '';
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: {
      __SUPABASE_URL__: JSON.stringify(
        readSupabaseEnv(env, ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL']),
      ),
      __SUPABASE_ANON_KEY__: JSON.stringify(
        readSupabaseEnv(env, [
          'VITE_SUPABASE_ANON_KEY',
          'VITE_SUPABASE_PUBLISHABLE_KEY',
          'NEXT_PUBLIC_SUPABASE_ANON_KEY',
          'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
          'SUPABASE_ANON_KEY',
          'SUPABASE_PUBLISHABLE_KEY',
        ]),
      ),
    },
  };
});
