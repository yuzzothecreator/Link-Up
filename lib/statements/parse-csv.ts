/**
 * Parse mobile-money / bank statement CSVs into normalized cash-flow rows.
 *
 * Supported shapes (auto-detected by headers):
 *  - M-Pesa / Vodacom style: Date, Details, Money In, Money Out, Balance, Receipt No.
 *  - Generic: date, description, amount, type|direction, reference
 *  - Tigo / Airtel-ish: Transaction Date, Narration, Credit, Debit, Ref
 */

export interface ParsedStatementRow {
  recordDate: string // YYYY-MM-DD
  recordType: "income" | "expense"
  amount: number
  description: string
  reference: string | null
  rawHash: string
}

export interface ParseStatementResult {
  ok: boolean
  provider: string
  rows: ParsedStatementRow[]
  error?: string
  skipped: number
}

function simpleHash(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0
  }
  return `h${Math.abs(h).toString(16)}`
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let current: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const next = text[i + 1]
    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ",") {
      current.push(field.trim())
      field = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && next === "\n") i++
      current.push(field.trim())
      field = ""
      if (current.some((v) => v.length > 0)) rows.push(current)
      current = []
    } else {
      field += c
    }
  }
  current.push(field.trim())
  if (current.some((v) => v.length > 0)) rows.push(current)
  return rows
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
}

function parseAmount(raw: string): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/TZS|Tsh|TSH|,|\s/gi, "").replace(/^\((.*)\)$/, "-$1")
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n === 0) return null
  return Math.abs(n)
}

function parseDate(raw: string): string | null {
  if (!raw) return null
  const s = raw.trim()
  // ISO / YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  // DD/MM/YYYY or DD-MM-YYYY
  const m1 = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/)
  if (m1) {
    const dd = m1[1].padStart(2, "0")
    const mm = m1[2].padStart(2, "0")
    return `${m1[3]}-${mm}-${dd}`
  }
  // YYYY/MM/DD
  const m2 = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/)
  if (m2) {
    return `${m2[1]}-${m2[2].padStart(2, "0")}-${m2[3].padStart(2, "0")}`
  }
  return null
}

function detectProvider(headers: string[]): string {
  const joined = headers.join(" ")
  if (joined.includes("money_in") || joined.includes("receipt")) return "mpesa"
  if (joined.includes("credit") && joined.includes("debit")) return "mobile_money"
  return "generic_csv"
}

export function parseStatementCsv(csvText: string): ParseStatementResult {
  const table = parseCsv(csvText.replace(/^\uFEFF/, ""))
  if (table.length < 2) {
    return { ok: false, provider: "unknown", rows: [], skipped: 0, error: "CSV has no data rows." }
  }

  // Find header row (first row with date-like + amount-like columns)
  let headerIdx = 0
  for (let i = 0; i < Math.min(10, table.length); i++) {
    const norm = table[i].map(normalizeHeader)
    if (
      norm.some((h) => h.includes("date")) &&
      norm.some((h) =>
        ["amount", "money_in", "money_out", "credit", "debit", "withdrawn", "paid_in"].includes(h) ||
        h.includes("amount"),
      )
    ) {
      headerIdx = i
      break
    }
  }

  const headers = table[headerIdx].map(normalizeHeader)
  const provider = detectProvider(headers)
  const col = (...names: string[]) => {
    for (const n of names) {
      const i = headers.findIndex((h) => h === n || h.includes(n))
      if (i >= 0) return i
    }
    return -1
  }

  const dateIdx = col("completion_time", "transaction_date", "trans_date", "date")
  const descIdx = col("details", "narration", "description", "particulars", "memo")
  const moneyInIdx = col("paid_in", "money_in", "credit", "deposit", "in")
  const moneyOutIdx = col("withdrawn", "money_out", "debit", "withdrawal", "out")
  const amountIdx = col("amount", "txn_amount", "value")
  const typeIdx = col("transaction_type", "type", "direction", "dr_cr")
  const refIdx = col("receipt_no", "receipt", "reference", "ref", "transaction_id", "trans_id")

  if (dateIdx < 0) {
    return {
      ok: false,
      provider,
      rows: [],
      skipped: 0,
      error: "Could not find a Date column. Export a statement CSV with Date / Details / Amount columns.",
    }
  }

  const rows: ParsedStatementRow[] = []
  let skipped = 0

  for (let r = headerIdx + 1; r < table.length; r++) {
    const cells = table[r]
    const date = parseDate(cells[dateIdx] ?? "")
    if (!date) {
      skipped++
      continue
    }

    const description = (descIdx >= 0 ? cells[descIdx] : "") || "Imported transaction"
    const reference = refIdx >= 0 ? cells[refIdx] || null : null

    let recordType: "income" | "expense" | null = null
    let amount: number | null = null

    if (moneyInIdx >= 0 || moneyOutIdx >= 0) {
      const inn = moneyInIdx >= 0 ? parseAmount(cells[moneyInIdx] ?? "") : null
      const out = moneyOutIdx >= 0 ? parseAmount(cells[moneyOutIdx] ?? "") : null
      if (inn && inn > 0) {
        recordType = "income"
        amount = inn
      } else if (out && out > 0) {
        recordType = "expense"
        amount = out
      }
    } else if (amountIdx >= 0) {
      const raw = cells[amountIdx] ?? ""
      const signed = Number(raw.replace(/TZS|Tsh|,|\s/gi, ""))
      amount = parseAmount(raw)
      if (amount) {
        if (typeIdx >= 0) {
          const t = (cells[typeIdx] ?? "").toLowerCase()
          if (/(out|debit|dr|withdraw|sent|payment)/.test(t)) recordType = "expense"
          else if (/(in|credit|cr|deposit|received)/.test(t)) recordType = "income"
        }
        if (!recordType) {
          recordType = signed < 0 || raw.trim().startsWith("-") || raw.includes("(") ? "expense" : "income"
        }
      }
    }

    if (!recordType || !amount) {
      skipped++
      continue
    }

    const fingerprint = `${date}|${recordType}|${amount}|${reference ?? ""}|${description}`
    rows.push({
      recordDate: date,
      recordType,
      amount,
      description: description.slice(0, 280),
      reference,
      rawHash: simpleHash(fingerprint),
    })
  }

  if (rows.length === 0) {
    return {
      ok: false,
      provider,
      rows: [],
      skipped,
      error: "No usable transactions found. Check the CSV format and try again.",
    }
  }

  return { ok: true, provider, rows, skipped }
}
