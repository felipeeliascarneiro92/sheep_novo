
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const url = envConfig.VITE_SUPABASE_URL;
const key = envConfig.VITE_SUPABASE_ANON_KEY;

const tsContent = `import { createClient } from '@supabase/supabase-js';

// HARDCODED CREDENTIALS TO FIX ENV LOADING ISSUE
// This ensures the frontend works even if Vite doesn't pick up .env.local immediately
const supabaseUrl = '${url}';
const supabaseAnonKey = '${key}';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
`;

fs.writeFileSync(path.join(__dirname, '../services/supabase.ts'), tsContent);
console.log('Fixed services/supabase.ts with hardcoded credentials.');
