const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TABLES = [
  "profiles",
  "otp_codes",
  "wallets",
  "trust_scores",
  "transactions",
  "loans",
  "documents",
  "notifications",
];

async function check() {
  console.log("Checking tables on:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("");

  for (const table of TABLES) {
    const { error } = await supabase.from(table).select("*").limit(0);
    if (error) {
      console.log(`❌  ${table}  — MISSING (${error.code}: ${error.message})`);
    } else {
      console.log(`✅  ${table}  — exists`);
    }
  }
}

check();
