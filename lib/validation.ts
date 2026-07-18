import { z } from "zod"

/**
 * Normalize Tanzanian-style phone numbers to E.164 (+255...).
 * Accepts: 0712345678, 712345678, 255712345678, +255712345678
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "")
  let n = digits.replace(/^\+/, "")
  if (n.startsWith("0")) n = "255" + n.slice(1)
  if (n.length === 9) n = "255" + n
  if (!/^255\d{9}$/.test(n)) return null
  return "+" + n
}

const phoneSchema = z
  .string()
  .min(7, "Phone number is too short")
  .transform((v, ctx) => {
    const normalized = normalizePhone(v)
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number" })
      return z.NEVER
    }
    return normalized
  })

export const registerSchema = z.object({
  fullName: z.string().min(2, "Enter your full name").max(120),
  phone: phoneSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
})

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Enter your password"),
})

export const resetPasswordSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code").optional(),
})

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
})


export const businessProfileSchema = z.object({
  businessType: z.string().min(2, "Select a business type"),
  location: z.string().min(2, "Enter your location"),
  dailyIncome: z.coerce.number().min(0, "Enter a valid amount"),
})

export const financialSchema = z.object({
  mobileMoneyProvider: z.string().min(2, "Select a provider"),
  bankAccount: z.string().optional(),
})

export const loanApplicationSchema = z.object({
  amount: z.coerce.number().min(5000, "Minimum loan is TZS 5,000").max(5_000_000),
  termDays: z.coerce.number().int().min(7).max(365),
  purpose: z.string().min(3, "Describe the purpose").max(300),
  groupId: z.string().uuid().optional().or(z.literal("")),
  productId: z.string().uuid("Select a valid loan provider and product").optional(),
})

export const marketplaceApplicationSchema = z.object({
  productId: z.string().uuid("Select a loan product"),
  amount: z.coerce.number().positive("Enter a valid amount"),
  termDays: z.coerce.number().int().positive("Enter a valid term"),
  purpose: z.string().min(10, "Describe how you will use the loan").max(500),
  groupId: z.string().uuid().optional().or(z.literal("")),
  shareIdentity: z.literal("on"),
  shareTrustScore: z.literal("on"),
  shareCashflow: z.literal("on"),
  shareTransactions: z.string().optional(),
  shareWallet: z.string().optional(),
  shareAssets: z.string().optional(),
})

export const lenderOfferSchema = z.object({
  applicationId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  termDays: z.coerce.number().int().positive(),
  interestRate: z.coerce.number().min(0).max(100),
  fees: z.coerce.number().min(0).default(0),
  conditions: z.string().max(1000).optional(),
})

export const depositSchema = z.object({
  amount: z.coerce.number().min(1000, "Minimum deposit is TZS 1,000").max(10_000_000),
})

export const createGroupSchema = z.object({
  name: z.string().min(2, "Enter a group name").max(120),
})

export const addMemberSchema = z.object({
  groupId: z.string().uuid(),
  phone: phoneSchema,
})
