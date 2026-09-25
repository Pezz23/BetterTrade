import { createClient } from '@supabase/supabase-js'

// URL e chiave `anon` del progetto Supabase.
//
// Stanno qui in chiaro di proposito. La chiave `anon` è pubblica per
// costruzione: qualunque cosa si faccia, finisce nel JavaScript che il browser
// scarica, quindi nasconderla non protegge niente — a proteggere i dati sono le
// policy RLS (vedi sql/02-rls.sql), che senza login non lasciano leggere nulla.
//
// Tenerle come valori predefiniti significa che il sito funziona ovunque senza
// configurazione: su Vercel, in locale, su una macchina nuova. Metterle in
// variabili d'ambiente aveva aggiunto un modo di rompere il deploy senza
// aggiungere sicurezza.
//
// Le variabili d'ambiente restano possibili, per puntare a un altro progetto
// (per esempio un ambiente di prova) senza toccare il codice.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://yqiegisyreocwaiwlqkv.supabase.co'
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxaWVnaXN5cmVvY3dhaXdscWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODI3NTIsImV4cCI6MjA5NDk1ODc1Mn0.Np8b1j-jXk9FdzusJMngXXtjdr2Af_PKFAtuuIS1iow'

export const supabase = createClient(URL, KEY)
