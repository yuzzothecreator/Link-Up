"use client"

import { useActionState } from "react"
import { submitMarketplaceApplicationAction } from "@/lib/actions/marketplace"
import type { ActionState } from "@/lib/actions/auth"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2 } from "lucide-react"

interface LoanProduct {
  id: string
  name: string
  providerName: string
  providerType: string
  minAmount: number
  maxAmount: number
  minTermDays: number
  maxTermDays: number
  baseInterestRate: number
  requiredTrustScore: number
}

export function LoanApplicationForm({ products }: { products: LoanProduct[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    submitMarketplaceApplicationAction,
    {},
  )

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && state.message && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="productId">Loan provider and product</Label>
        <select
          id="productId"
          name="productId"
          required
          className="h-11 rounded-md border border-input bg-background px-3 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Select a bank, telecom or microfinance product
          </option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.providerName} · {product.name} ({product.baseInterestRate}% base)
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Each provider reviews your consented Link-Up financial profile independently.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="amount">Loan Amount (TZS)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min="5000"
            max="5000000"
            step="1000"
            placeholder="e.g. 100000"
            required
          />
          <p className="text-xs text-muted-foreground">Product limits are checked on submission.</p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="termDays">Term (Days)</Label>
          <Input
            id="termDays"
            name="termDays"
            type="number"
            min="7"
            max="365"
            placeholder="e.g. 30"
            required
          />
          <p className="text-xs text-muted-foreground">7 to 365 days</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="purpose">Loan Purpose</Label>
        <Textarea
          id="purpose"
          name="purpose"
          placeholder="Describe how you will use this loan for your business..."
          className="min-h-[100px] resize-y"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="groupId">Group/Kikundi (Optional)</Label>
        <Input
          id="groupId"
          name="groupId"
          placeholder="If applying via a group, leave blank for individual"
        />
        <p className="text-xs text-muted-foreground">
          Group-backed loans have higher approval rates and lower interest.
        </p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <h3 className="text-sm font-semibold">Data-sharing consent</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          The selected provider sees only the scopes you grant for this application. Access expires
          after 90 days and every view is audited.
        </p>
        <div className="mt-4 space-y-3 text-sm">
          <label className="flex items-start gap-2">
            <input type="checkbox" name="shareIdentity" required className="mt-1" />
            <span>Identity verification summary and business profile (required)</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="shareTrustScore" required className="mt-1" />
            <span>Trust Score, factors and prior loan history (required)</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="shareCashflow" required className="mt-1" />
            <span>Income/expense aggregates from imported statements (required)</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="shareTransactions" className="mt-1" />
            <span>Detailed transaction rows (optional; no full account number)</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="shareWallet" className="mt-1" />
            <span>Link-Up wallet balance (optional)</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="shareAssets" className="mt-1" />
            <span>Verified asset summary (optional)</span>
          </label>
        </div>
      </div>

      <Button type="submit" className="mt-2 h-11" disabled={pending}>
        {pending ? "Submitting securely..." : "Submit to selected provider"}
      </Button>
    </form>
  )
}
