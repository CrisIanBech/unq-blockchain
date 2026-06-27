import { Box, Typography, Chip, Stack } from "@mui/material"
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded"
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded"
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded"
import type { PaymentRecord } from "@/models/types"
import { usdc, monthLabel } from "@/lib/format"

const STATUS = {
  paid: {
    label: "Pagado",
    color: "success" as const,
    icon: <CheckCircleRoundedIcon fontSize="small" sx={{ color: "surfaceContainer.main" }} />,
  },
  overdue: {
    label: "Moroso",
    color: "error" as const,
    icon: <ErrorRoundedIcon fontSize="small" sx={{ color: "surfaceContainer.main" }} />,
  },
  pending: {
    label: "Pendiente",
    color: "warning" as const,
    icon: <ScheduleRoundedIcon fontSize="small" sx={{ color: "surfaceContainer.main" }} />,
  },
}

export function PaymentHistory({ payments }: { payments: PaymentRecord[] }) {
  if (payments.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        Todavía no hay pagos registrados.
      </Typography>
    )
  }

  return (
    <Stack spacing={2}>
      {payments.map((p) => {
        const s = STATUS[p.status]
        return (
          <Box
            key={p.month}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              p: 2.5, // Increased padding to make items spacious
              borderRadius: "12px", // Fixed: Use explicit 12px instead of theme-multiplied 3 (48px capsule)
              bgcolor: "surfaceContainer.main",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ textTransform: "capitalize", fontWeight: 700 }}>
                {monthLabel(p.month)}
              </Typography>
              {p.txHash && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontFamily: "monospace", display: "block", mt: 0.5 }}
                >
                  tx {p.txHash}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {usdc(p.amount)}
              </Typography>
              <Chip
                size="small"
                color={s.color}
                icon={s.icon}
                label={s.label}
                sx={{
                  fontWeight: 700,
                  px: 0.5,
                  "& .MuiChip-label": { color: "surfaceContainer.main" },
                  "& svg": { color: "surfaceContainer.main !important" },
                }}
              />
            </Box>
          </Box>
        )
      })}
    </Stack>
  )
}
