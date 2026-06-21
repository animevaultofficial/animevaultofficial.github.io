import fs from 'fs';
import { neon } from '@neondatabase/serverless';
const envFile = fs.readFileSync('.env', 'utf-8');
const dbUrlMatch = envFile.match(/VITE_DATABASE_URL="?([^"\n\r]+)"?/);
const sql = neon(dbUrlMatch[1]);
sql`SELECT id, username, is_verified FROM users`.then(console.log);
