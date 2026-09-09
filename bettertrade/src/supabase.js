import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!URL || !KEY) {
  throw new Error('Mancano VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copia .env.example in .env')
}

export const supabase = createClient(URL, KEY)
