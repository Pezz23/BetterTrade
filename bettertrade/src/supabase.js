import { createClient } from '@supabase/supabase-js'

const URL  = 'https://yqiegisyreocwaiwlqkv.supabase.co'
const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxaWVnaXN5cmVvY3dhaXdscWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODI3NTIsImV4cCI6MjA5NDk1ODc1Mn0.Np8b1j-jXk9FdzusJMngXXtjdr2Af_PKFAtuuIS1iow'

export const supabase = createClient(URL, KEY)
