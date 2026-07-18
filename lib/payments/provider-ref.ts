/**
 * Shared helpers for reading/writing Tembo provider transaction IDs.
 * Prefer the `provider_ref` column; fall back to encoding in `description`
 * when the column has not been migrated yet.
 */

const TID_MARKER = "|tid:"

export function embedProviderRef(description: string, providerRef: string) {
  const base = description.split(TID_MARKER)[0]
  return `${base}${TID_MARKER}${providerRef}`
}

export function extractProviderRef(row: {
  provider_ref?: string | null
  description?: string | null
}): string | null {
  if (row.provider_ref) return row.provider_ref
  const desc = row.description ?? ""
  const idx = desc.indexOf(TID_MARKER)
  if (idx === -1) return null
  return desc.slice(idx + TID_MARKER.length) || null
}

export async function persistProviderRef(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: { from: (table: string) => any },
  reference: string,
  providerRef: string,
  currentDescription?: string | null,
) {
  const { error } = await admin
    .from("transactions")
    .update({ provider_ref: providerRef })
    .eq("reference", reference)

  if (!error) return

  // Column missing — fall back to description encoding.
  console.warn("[trustLink] provider_ref column missing; encoding in description. Run: ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS provider_ref TEXT;")
  const description = embedProviderRef(currentDescription ?? "Mobile money deposit", providerRef)
  await admin.from("transactions").update({ description }).eq("reference", reference)
}
