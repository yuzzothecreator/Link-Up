"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addFinancialRecordAction } from "@/lib/actions/financials"
import { useToast } from "@/hooks/use-toast"

export function AddFinancialRecordForm() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await addFinancialRecordAction(formData)
    
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else {
      toast({ title: "Success", description: "Financial record saved successfully." })
      ;(e.target as HTMLFormElement).reset()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="record_type">Record Type</Label>
          <Select name="record_type" required>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Income (Cash In)</SelectItem>
              <SelectItem value="expense">Expense (Cash Out)</SelectItem>
              <SelectItem value="asset_purchase">Asset Purchase</SelectItem>
              <SelectItem value="liability">Liability / Loan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" name="category" placeholder="e.g. Sales, Rent, Supplies" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (TZS)</Label>
          <Input id="amount" name="amount" type="number" min="1" step="1" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="record_date">Date</Label>
          <Input id="record_date" name="record_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Input id="description" name="description" placeholder="Additional details..." />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Add Record"}
      </Button>
    </form>
  )
}
