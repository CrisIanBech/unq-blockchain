import { useState, useMemo } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
} from "@mui/material"
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded"
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded"
import type { Rental } from "@/models/types"
import { usdc, monthLabel, nextMonths } from "@/lib/format"

interface PayRentDialogProps {
  rental: Rental | null
  open: boolean
  onClose: () => void
  onPay: (rentalId: string, month: string) => void
  balance: number
}

export function PayRentDialog({
  rental,
  open,
  onClose,
  onPay,
  balance,
}: PayRentDialogProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const months = useMemo(() => {
    if (!rental) return []
    const paidSet = new Set(rental.payments.filter((p) => p.status === "paid").map((p) => p.month))
    return nextMonths(12, "2025-09").map((m) => ({ month: m, paid: paidSet.has(m) }))
  }, [rental])

  if (!rental) return null

  const enoughBalance = balance >= rental.monthlyRent

  function confirm() {
    if (!selected || !rental) return
    onPay(rental.id, selected)
    setSelected(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 0.5 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 3, bgcolor: "primaryContainer.main", color: "primaryContainer.contrastText", display: "grid", placeItems: "center" }}>
          <PaymentsRoundedIcon />
        </Box>
        Pagar mes
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {rental.name} — {usdc(rental.monthlyRent)} / mes
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Seleccioná el mes a pagar. Los meses ya pagados no se pueden volver a pagar.
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 1,
            mt: 2,
          }}
        >
          {months.map(({ month, paid }) => {
            const isSel = selected === month
            return (
              <Box
                key={month}
                role="button"
                aria-disabled={paid}
                onClick={() => !paid && setSelected(month)}
                sx={{
                  p: 1.25,
                  borderRadius: 3,
                  border: 2,
                  borderColor: isSel ? "primary.main" : "divider",
                  bgcolor: paid ? "surfaceContainer.high" : isSel ? "primaryContainer.main" : "transparent",
                  color: paid ? "text.disabled" : isSel ? "primaryContainer.contrastText" : "text.primary",
                  cursor: paid ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 0.5,
                  transition: ".15s",
                }}
              >
                <Typography variant="body2" sx={{ textTransform: "capitalize", fontWeight: 600 }}>
                  {monthLabel(month)}
                </Typography>
                {paid && <CheckCircleRoundedIcon fontSize="small" color="success" />}
              </Box>
            )
          })}
        </Box>

        {!enoughBalance && (
          <Chip color="error" variant="outlined" label="Saldo USDC insuficiente" sx={{ mt: 2 }} />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={!selected || !enoughBalance} onClick={confirm}>
          Pagar {usdc(rental.monthlyRent)}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
