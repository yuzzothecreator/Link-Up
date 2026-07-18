const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing connection to:", supabaseUrl);
  
  // Test 1: Query profiles
  console.log("\n--- Testing 'profiles' table ---");
  const { data: profiles, error: err1 } = await supabase.from("profiles").select("*").limit(1);
  if (err1) {
    console.error("Error querying profiles:", err1);
  } else {
    console.log("Success! Profile columns:", profiles.length > 0 ? Object.keys(profiles[0]) : "Empty table");
  }

  // Test 2: Query otp_codes
  console.log("\n--- Testing 'otp_codes' table ---");
  const { data: otp, error: err2 } = await supabase.from("otp_codes").select("*").limit(1);
  if (err2) {
    console.error("Error querying otp_codes:", err2);
  } else {
    console.log("Success! otp_codes columns:", otp.length > 0 ? Object.keys(otp[0]) : "Empty table");
  }

  // Test 3: Insert dummy otp_code
  console.log("\n--- Testing inserting into 'otp_codes' ---");
  const { data: ins, error: err3 } = await supabase.from("otp_codes").insert({
    phone: "+255711111111",
    code_hash: "$2a$10$dummyhash",
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    consumed: false
  }).select();
  if (err3) {
    console.error("Error inserting into otp_codes:", err3);
  } else {
    console.log("Success! Inserted row:", ins);
    
    // Clean up
    await supabase.from("otp_codes").delete().eq("phone", "+255711111111");
    console.log("Cleaned up dummy row.");
  }
}

test();
