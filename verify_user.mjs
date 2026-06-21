import fs from 'fs';
import { neon } from '@neondatabase/serverless';

const envFile = fs.readFileSync('.env', 'utf-8');
const dbUrlMatch = envFile.match(/VITE_DATABASE_URL="?([^"\n\r]+)"?/);
if (!dbUrlMatch) {
  console.error("No DB URL found in .env");
  process.exit(1);
}

const sql = neon(dbUrlMatch[1]);

async function verifyUser() {
  const username = process.argv[2];
  
  if (!username) {
    console.log("Usage: node verify_user.mjs <username>");
    console.log("Example: node verify_user.mjs adiyanhehe");
    process.exit(1);
  }

  try {
    const user = await sql`SELECT id, username, is_verified FROM users WHERE LOWER(username) = LOWER(${username})`;
    if (user.length === 0) {
      console.error(`User '${username}' not found in the database.`);
      process.exit(1);
    }

    const currentStatus = user[0].is_verified;
    const newStatus = !currentStatus;

    await sql`UPDATE users SET is_verified = ${newStatus} WHERE LOWER(username) = LOWER(${username})`;
    
    if (newStatus) {
      console.log(`✅ Successfully verified user: @${username}! They now have the blue badge.`);
    } else {
      console.log(`❌ Removed verification from user: @${username}.`);
    }

  } catch (err) {
    console.error("Error updating user:", err);
  }
}

verifyUser();
