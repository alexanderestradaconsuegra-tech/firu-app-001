/* FIRU · Supabase client */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://jyceccbtkritogjzqcma.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y2VjY2J0a3JpdG9nanpxY21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjkyMzgsImV4cCI6MjA5NjYwNTIzOH0.5zp1sk4mZDEuiEfNobsN68yhYmkVrsVoyETqYwuUhDA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
