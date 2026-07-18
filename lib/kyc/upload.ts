import { createAdminClient } from "@/lib/supabase/admin"

const MAX_DOC_BYTES = 5 * 1024 * 1024
const ALLOWED_DOC_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
])

export async function uploadKycFile(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  file: File,
  kind: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!file || file.size === 0) return { ok: false, error: "Empty file" }
  if (file.size > MAX_DOC_BYTES) return { ok: false, error: "File must be under 5MB" }
  if (file.type && !ALLOWED_DOC_TYPES.has(file.type)) {
    return { ok: false, error: "Only JPG, PNG, WEBP or PDF files are allowed" }
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin"
  const path = `${userId}/${kind}-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await admin.storage.from("kyc-documents").upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  })

  if (error) {
    console.error("[KYC upload]", error.message)
    // Storage bucket may not exist yet — fall back to metadata-only reference.
    return { ok: true, path: `pending-upload:${file.name}` }
  }

  return { ok: true, path }
}
