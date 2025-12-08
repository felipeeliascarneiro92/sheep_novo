import { createClient } from '@supabase/supabase-js';

// HARDCODED CREDENTIALS TO FIX ENV LOADING ISSUE
// This ensures the frontend works even if Vite doesn't pick up .env.local immediately
const supabaseUrl = 'https://ptwpsuvkrcbkfkutddnq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0d3BzdXZrcmNia2ZrdXRkZG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNzg4MTgsImV4cCI6MjA3OTc1NDgxOH0.qtbyUmkDeorMw3SyqL2kXsTq7ndQvU7nYnYirEozLlA';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
