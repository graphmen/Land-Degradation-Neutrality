/**
 * Supabase Keep-Alive Script
 * Keeps the Supabase free-tier project active to prevent auto-pausing after 7 days of inactivity.
 * 
 * Environment Variables required:
 *   SUPABASE_URL (default: https://pqfbcvxisrmtmhmuxbjk.supabase.co)
 *   SUPABASE_KEY (or set via GitHub Secrets / .env)
 */

const fs = require('fs');
const path = require('path');

// Try loading from .env or .env.local if present
try {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...val] = line.split('=');
      if (key && val.length > 0 && !process.env[key.trim()]) {
        process.env[key.trim()] = val.join('=').trim();
      }
    });
  }
} catch (e) {}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pqfbcvxisrmtmhmuxbjk.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error("ERROR: SUPABASE_KEY environment variable is not defined.");
  process.exit(1);
}

// Ping interval for daemon mode: 48 hours (in milliseconds)
const TWO_DAYS_MS = 48 * 60 * 60 * 1000;

async function pingSupabase() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Pinging Supabase project at ${SUPABASE_URL}...`);

  try {
    const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');

    const response = await fetchFn(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (response.ok || response.status === 200) {
      console.log(`[${timestamp}] SUCCESS: Supabase project pinged successfully! (HTTP Status: ${response.status})`);
      return true;
    } else {
      console.warn(`[${timestamp}] WARNING: Received response status ${response.status} from Supabase.`);
      return false;
    }
  } catch (error) {
    console.error(`[${timestamp}] ERROR pinging Supabase:`, error.message);
    return false;
  }
}

const isDaemon = process.argv.includes('--daemon');

if (isDaemon) {
  console.log("Starting Supabase Keep-Alive Daemon (running every 48 hours)...");
  pingSupabase();
  setInterval(pingSupabase, TWO_DAYS_MS);
} else {
  pingSupabase();
}
