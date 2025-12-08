
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

console.log('URL=' + envConfig.VITE_SUPABASE_URL);
console.log('KEY=' + envConfig.VITE_SUPABASE_ANON_KEY);
