"use client"

interface TrustScoreRingProps {
  score: number // 0-1000
  size?: number
  strokeWidth?: number
  className?: string
}

export function TrustScoreRing({
  score,
  size = 180,
  strokeWidth = 12,
  className,
}: TrustScoreRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progress = Math.min(score / 1000, 1)
  const offset = circumference - progress * circumference

  const riskLevel = score >= 700 ? "low" : score >= 400 ? "medium" : "high"
  const color =
    riskLevel === "low"
      ? "stroke-emerald-500"
      : riskLevel === "medium"
        ? "stroke-amber-500"
        : "stroke-red-500"
  const bgColor =
    riskLevel === "low"
      ? "text-emerald-500"
      : riskLevel === "medium"
        ? "text-amber-500"
        : "text-red-500"
  const label =
    riskLevel === "low" ? "Low Risk" : riskLevel === "medium" ? "Medium Risk" : "High Risk"

  return (
    <div className={`relative inline-flex items-center justify-center ${className ?? ""}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${color} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tight text-card-foreground">{score}</span>
        <span className={`text-xs font-semibold ${bgColor}`}>{label}</span>
        <span className="text-[10px] text-muted-foreground">out of 1,000</span>
      </div>
    </div>
  )
}
