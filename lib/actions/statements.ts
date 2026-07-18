"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { parseStatementCsv } from "@/lib/statements/parse-csv"
import { recalculateTrustScore } from "@/lib/trust/engine"
import type { ActionState } from "@/lib/actions/auth"

async function requireAuth() {
  const session = await getSession()
  if (!session) redirect("/auth/login")
  return session
}

/**
 * Import a mobile-money / bank statement CSV and fold activity into Trust Score.
 */
export async function importStatementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAuth()
  const file = formData.get("statement")

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV statement file to upload." }
  }
  if (file.size > 2 * 1024 * 1024) {
    return { error: "Statement file must be under 2MB." }
  }
  if (!file.name.toLowerCase().endsWith(".csv") && file.type && !file.type.includes("csv") && !file.type.includes("text")) {
    return { error: "Upload a CSV export from M-Pesa, Tigo Pesa, Airtel Money, or your bank." }
  }

  const text = await file.text()
  const parsed = parseStatementCsv(text)
  if (!parsed.ok) {
    return { error: parsed.error ?? "Could not parse statement." }
  }

  const admin = createAdminClient()

  const { data: importRow, error: importError } = await admin
    .from("statement_imports")
    .insert({
      user_id: session.userId,
      provider: parsed.provider,
      file_name: file.name,
      status: "processed",
      row_count: parsed.rows.length,
      skipped_count: parsed.skipped,
    })
    .select("id")
    .single()

  if (importError || !importRow) {
    console.error("[statement import]", importError)
    return {
      error:
        "Statement tables are missing. Run migrations/002_nida_and_statements.sql in Supabase, then retry.",
    }
  }

  const payload = parsed.rows.map((r) => ({
    user_id: session.userId,
    import_id: importRow.id,
    record_date: r.recordDate,
    record_type: r.recordType,
    amount: r.amount,
    description: r.description,
    reference: r.reference,
    raw_hash: r.rawHash,
  }))

  // Upsert-like: ignore duplicates via unique (user_id, raw_hash)
  const { error: rowsError } = await admin.from("imported_transactions").upsert(payload, {
    onConflict: "user_id,raw_hash",
    ignoreDuplicates: true,
  })

  if (rowsError) {
    console.error("[statement rows]", rowsError)
    return { error: "Could not save imported transactions. Try again." }
  }

  await recalculateTrustScore(session.userId)

  return {
    success: true,
    message: `Imported ${parsed.rows.length} transactions${parsed.skipped ? ` (${parsed.skipped} skipped)` : ""}. Trust Score updated.`,
  }
}
