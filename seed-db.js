const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const users = [
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    phone: '+255711111111',
    full_name: 'Admin User',
    role: 'admin',
    is_phone_verified: true,
    onboarding_complete: true,
    onboarding_step: 'complete',
    business_name: 'TrustLink Admin Corp',
    business_type: 'Services',
    business_location: 'Dar es Salaam',
    years_in_operation: 5,
    daily_income: 150000,
    mobile_money_provider: 'mpesa',
    mobile_money_number: '+255711111111',
    nida_number: '19900101-12345-00001-11'
  },
  {
    id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    phone: '+255722222222',
    full_name: 'Borrower User',
    role: 'borrower',
    is_phone_verified: true,
    onboarding_complete: true,
    onboarding_step: 'complete',
    business_name: 'Mangi General Store',
    business_type: 'Retail',
    business_location: 'Arusha',
    years_in_operation: 3,
    daily_income: 75000,
    mobile_money_provider: 'tigopesa',
    mobile_money_number: '+255722222222',
    nida_number: '19930505-12345-00002-22'
  },
  {
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    phone: '+255733333333',
    full_name: 'Lender User',
    role: 'lender',
    is_phone_verified: true,
    onboarding_complete: true,
    onboarding_step: 'complete',
    business_name: 'Biashara Capital',
    business_type: 'Finance',
    business_location: 'Mwanza',
    years_in_operation: 10,
    daily_income: 500000,
    mobile_money_provider: 'airtelmoney',
    mobile_money_number: '+255733333333',
    nida_number: '19850808-12345-00003-33'
  }
];

const wallets = [
  { user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', balance: 1000000 },
  { user_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', balance: 5000 },
  { user_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', balance: 5000000 }
];

const trustScores = [
  {
    user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    score: 950,
    risk_level: 'low',
    breakdown: { savings: 95, documents: 95, repayment: 95, accountAge: 95, transactions: 95 }
  },
  {
    user_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    score: 550,
    risk_level: 'medium',
    breakdown: { savings: 50, documents: 60, repayment: 70, accountAge: 40, transactions: 50 }
  },
  {
    user_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    score: 850,
    risk_level: 'low',
    breakdown: { savings: 85, documents: 90, repayment: 80, accountAge: 90, transactions: 85 }
  }
];

async function seed() {
  console.log("Seeding database using Supabase JS client...");

  // Clean up
  console.log("Cleaning up old seed data...");
  const userIds = users.map(u => u.id);
  await supabase.from("trust_scores").delete().in("user_id", userIds);
  await supabase.from("wallets").delete().in("user_id", userIds);
  await supabase.from("profiles").delete().in("id", userIds);

  // Seed Profiles
  console.log("Inserting profiles...");
  const { error: err1 } = await supabase.from("profiles").insert(users);
  if (err1) {
    console.error("Error seeding profiles:", err1);
    return;
  }

  // Seed Wallets
  console.log("Inserting wallets...");
  const { error: err2 } = await supabase.from("wallets").insert(wallets);
  if (err2) {
    console.error("Error seeding wallets:", err2);
    return;
  }

  // Seed Trust Scores
  console.log("Inserting trust scores...");
  const { error: err3 } = await supabase.from("trust_scores").insert(trustScores);
  if (err3) {
    console.error("Error seeding trust scores:", err3);
    return;
  }

  console.log("✅ Database seeded successfully!");
}

seed();
