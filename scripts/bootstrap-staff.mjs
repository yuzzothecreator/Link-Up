/**
 * Bootstrap real admin / lender accounts from environment variables.
 *
 * Usage:
 *   node --env-file=.env.local scripts/bootstrap-staff.mjs
 *
 * Required for admin:
 *   BOOTSTRAP_ADMIN_PHONE=+2557XXXXXXXX
 *   BOOTSTRAP_ADMIN_NAME=Your Name
 *
 * Optional lender:
 *   BOOTSTRAP_LENDER_PHONE=+2557YYYYYYYY
 *   BOOTSTRAP_LENDER_NAME=Underwriter Name
 *   BOOTSTRAP_LENDER_ORG=Link-Up Partner Bank
 *
 * After bootstrap, set a password via /auth/reset-password (SMS OTP),
 * then log in at /auth/login with phone + password.
 */

import { createClient } from "@supabase/supabase-js"

function normalizePhone(input) {
  let n = String(input || "").replace(/[^\d+]/g, "").replace(/^\+/, "")
  if (n.startsWith("0")) n = "255" + n.slice(1)
  if (n.length === 9) n = "255" + n
  if (!/^255\d{9}$/.test(n)) return null
  return "+" + n
}

const DEMO = new Set(["+255711111111", "+255722222222", "+255733333333"])

async function upsertStaff(supabase, { phone, fullName, role, organizationName }) {
  const normalized = normalizePhone(phone)
  if (!normalized) throw new Error(`Invalid phone: ${phone}`)
  if (DEMO.has(normalized) && process.env.NODE_ENV === "production") {
    throw new Error("Demo phones are not allowed in production bootstrap.")
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", normalized)
    .maybeSingle()

  let userId = existing?.id

  if (userId) {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        role,
        is_phone_verified: true,
        onboarding_complete: true,
        onboarding_step: "complete",
      })
      .eq("id", userId)
    if (error) throw error
  } else {
    const { data: created, error } = await supabase
      .from("profiles")
      .insert({
        phone: normalized,
        full_name: fullName,
        role,
        is_phone_verified: true,
        onboarding_complete: true,
        onboarding_step: "complete",
      })
      .select("id")
      .single()
    if (error) throw error
    userId = created.id
    await supabase.from("wallets").upsert({ user_id: userId, balance: 0 }, { onConflict: "user_id" })
    await supabase.from("trust_scores").upsert(
      {
        user_id: userId,
        score: 300,
        risk_level: "medium",
        breakdown: {
          savings: 30,
          documents: 30,
          repayment: 30,
          accountAge: 30,
          transactions: 30,
          identity: 40,
        },
      },
      { onConflict: "user_id" },
    )
  }

  if (role === "lender" && organizationName) {
    const { data: org } = await supabase
      .from("provider_organizations")
      .select("id")
      .eq("name", organizationName)
      .maybeSingle()
    if (!org) {
      console.warn(`Org "${organizationName}" not found. Run migration 003 first.`)
    } else {
      const { error } = await supabase.from("provider_members").upsert(
        {
          organization_id: org.id,
          profile_id: userId,
          role: "organization_admin",
          status: "active",
        },
        { onConflict: "organization_id,profile_id" },
      )
      if (error) throw error
    }
  }

  return { userId, phone: normalized, role }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const supabase = createClient(url, key)
  const results = []

  if (process.env.BOOTSTRAP_ADMIN_PHONE) {
    results.push(
      await upsertStaff(supabase, {
        phone: process.env.BOOTSTRAP_ADMIN_PHONE,
        fullName: process.env.BOOTSTRAP_ADMIN_NAME || "Platform Admin",
        role: "admin",
      }),
    )
    console.log("✅ Admin ready:", results.at(-1))
  } else {
    console.log("Skip admin (set BOOTSTRAP_ADMIN_PHONE)")
  }

  if (process.env.BOOTSTRAP_LENDER_PHONE) {
    results.push(
      await upsertStaff(supabase, {
        phone: process.env.BOOTSTRAP_LENDER_PHONE,
        fullName: process.env.BOOTSTRAP_LENDER_NAME || "Provider Underwriter",
        role: "lender",
        organizationName:
          process.env.BOOTSTRAP_LENDER_ORG || "Link-Up Partner Bank",
      }),
    )
    console.log("✅ Lender ready:", results.at(-1))
  } else {
    console.log("Skip lender (set BOOTSTRAP_LENDER_PHONE)")
  }

  if (!results.length) {
    console.error("No BOOTSTRAP_* phones set. See docs/CREDENTIALS.md")
    process.exit(1)
  }

  console.log("\nNext: /auth/reset-password → set password → /auth/login")
  console.log("Never enable ALLOW_TEST_OTP in production.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
