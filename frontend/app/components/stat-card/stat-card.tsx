import type { ReactNode } from "react"
import { Card, CardContent, Box, Typography } from "@mui/material"

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string
  hint?: string
  tone?: "primary" | "tertiary" | "secondary"
}

const TONE = {
  primary: { bg: "primaryContainer.main", fg: "primaryContainer.contrastText" },
  tertiary: { bg: "tertiaryContainer.main", fg: "tertiaryContainer.contrastText" },
  secondary: { bg: "secondaryContainer.main", fg: "secondaryContainer.contrastText" },
} as const

export function StatCard({ icon, label, value, hint, tone = "primary" }: StatCardProps) {
  const c = TONE[tone]
  return (
    <Card sx={{ bgcolor: c.bg, border: "none", height: "100%" }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 3,
            bgcolor: "rgba(0,0,0,0.08)",
            color: c.fg,
            display: "grid",
            placeItems: "center",
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" sx={{ color: c.fg, opacity: 0.85 }}>
            {label}
          </Typography>
          <Typography variant="h5" sx={{ color: c.fg, fontWeight: 700, lineHeight: 1.2, mt: 0.5 }}>
            {value}
          </Typography>
          {hint && (
            <Typography variant="caption" sx={{ color: c.fg, opacity: 0.75 }}>
              {hint}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
