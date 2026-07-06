import { Box, Typography, Chip, Stack, IconButton } from "@mui/material"
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded"
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded"
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded"
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded"
import type { PaymentRecord } from "@/models/types"
import { usdc, monthLabel } from "@/lib/format"
import { useUserStore } from "@/stores/user-store"

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
              flexDirection: "column",
              gap: 0.5,
              p: 2,
              borderRadius: "12px",
              bgcolor: "surfaceContainer.main",
            }}
          >
            {/* Row 1: Period Label and Status */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: "capitalize", fontWeight: 600 }}>
                {p.periodLabel || monthLabel(p.month)}
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
            
            {/* Row 2: Amount */}
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 0.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main" }}>
                {usdc(p.amount)}
              </Typography>
            </Box>
            
            {p.txHash && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, width: "100%" }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontFamily: "monospace",
                    display: "block",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  tx {p.txHash}
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(p.txHash!);
                    useUserStore.getState().pushToast({
                      message: "Hash de transacción copiado",
                      severity: "success"
                    });
                  }}
                  sx={{ p: 0.25, color: "text.secondary", flexShrink: 0 }}
                >
                  <ContentCopyRoundedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            )}
          </Box>
        )
      })}
    </Stack>
  )
}
