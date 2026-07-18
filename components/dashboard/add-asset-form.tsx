"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addAssetAction } from "@/lib/actions/assets"
import { useToast } from "@/hooks/use-toast"

export function AddAssetForm() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await addAssetAction(formData)
    
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else {
      toast({ title: "Success", description: "Asset declared successfully." })
      ;(e.target as HTMLFormElement).reset()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Asset Name/Title</Label>
          <Input id="name" name="name" placeholder="e.g. Toyota IST 2012" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Asset Type</Label>
          <Select name="type" required>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vehicle">Vehicle / Automobile</SelectItem>
              <SelectItem value="real_estate">Real Estate / Land</SelectItem>
              <SelectItem value="equipment">Business Equipment</SelectItem>
              <SelectItem value="livestock">Livestock / Agriculture</SelectItem>
              <SelectItem value="other">Other Asset</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimated_value">Estimated Value (TZS)</Label>
          <Input id="estimated_value" name="estimated_value" type="number" min="1" step="1" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="document_url">Proof Document URL (Optional)</Label>
          <Input id="document_url" name="document_url" type="url" placeholder="https://..." />
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? "Submitting..." : "Declare Asset"}
      </Button>
    </form>
  )
}
