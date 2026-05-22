import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yqiegisyreocwaiwlqkv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxaWVnaXN5cmVvY3dhaXdscWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODI3NTIsImV4cCI6MjA5NDk1ODc1Mn0.Np8b1j-jXk9FdzusJMngXXtjdr2Af_PKFAtuuIS1iow'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
