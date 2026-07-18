"use client"

import { useMemo } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"

export function FinancialsChart({ records }: { records: any[] }) {
  const data = useMemo(() => {
    const grouped: Record<string, { income: number; expense: number }> = {}
    
    // Process records and group by month
    records.forEach(r => {
      const date = new Date(r.record_date)
      const month = date.toLocaleString('default', { month: 'short' }) + " " + date.getFullYear()
      
      if (!grouped[month]) grouped[month] = { income: 0, expense: 0 }
      
      if (r.record_type === "income") {
        grouped[month].income += Number(r.amount)
      } else if (r.record_type === "expense") {
        grouped[month].expense += Number(r.amount)
      }
    })

    return Object.entries(grouped).map(([month, values]) => ({
      name: month,
      ...values
    })).reverse() // Show chronological
  }, [records])

  if (data.length === 0) {
    return <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data to display</div>
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={(val) => `TZS ${val / 1000}k`} />
          <Tooltip formatter={(value) => `TZS ${Number(value).toLocaleString()}`} />
          <Legend />
          <Bar dataKey="income" name="Income" fill="#16a34a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="Expense" fill="#dc2626" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
