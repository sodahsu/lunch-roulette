import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url =
  import.meta.env.VITE_SUPABASE_URL ??
  'https://hvaxoopyccwsqmhjnibg.supabase.co'

const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  'sb_publishable_TTIx4ujs2WkdRzl6_y6zrA_BJN8PhaI'

export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
