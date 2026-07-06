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
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded"
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded"
import type { Rental, OwnedProperty } from "@/models/types"
import { usdc } from "@/lib/format"
import { getRentalAmountToPay } from "@/models/rental-utils"

interface PayRentDialogProps {
  rental: Rental | OwnedProperty | null
  open: boolean
  onClose: () => void
  onPay: (rentalId: string, month: string, amount?: number) => void
  balance: number
}

export function PayRentDialog({
  rental,
  open,
  onClose,
  onPay,
  balance,
}: PayRentDialogProps) {
  if (!rental) return null

  const details = "contractDetails" in rental ? rental.contractDetails : undefined

  if (!details && "contractDetails" in rental) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle>Cargando...</DialogTitle>
        <DialogContent>Obteniendo detalles del contrato...</DialogContent>
      </Dialog>
    )
  }

  const totalPeriods = details?.totalPeriods ?? 12
  const periodsPaid = details?.periodsPaid ?? 0

  let periodLabel = details?.periodLabel ?? ""
  if (!periodLabel) {
    const periodStart = new Date()
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const dateOpts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
    periodLabel = `${periodStart.toLocaleDateString("es-ES", dateOpts)} - ${periodEnd.toLocaleDateString("es-ES", dateOpts)}`
  }

  const amountToPay = getRentalAmountToPay(rental)
  const baseRent = details?.baseRent ?? rental.monthlyRent
  const isLate = details?.isLate ?? false
  const lateFeeAmount = details?.lateFeeAmount ?? 0
  const lateFeeBps = details?.lateFeeBps ?? 0

  const enoughBalance = balance >= amountToPay

  function confirm() {
    if (!rental) return
    const monthLabelForRecord = details?.monthLabelForRecord ?? new Date().toISOString().slice(0, 7)
    onPay(rental.id, monthLabelForRecord, amountToPay)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 0.5 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 3, bgcolor: "primaryContainer.main", color: "primaryContainer.contrastText", display: "grid", placeItems: "center" }}>
          <PaymentsRoundedIcon />
        </Box>
        Pagar periodo
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {rental.name} — Cuota base: {usdc(baseRent)}
        </Typography>

        <Box sx={{ bgcolor: "surfaceContainer.highest", p: 2, borderRadius: 1.5, mt: 2, mb: 1, display: "flex", flexDirection: "column", gap: 1.5, border: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Periodo a abonar:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, textTransform: "capitalize" }}>
                {periodLabel}
              </Typography>
            </Box>
            {isLate ? (
              <Chip size="small" color="error" label="Con mora" />
            ) : (
              <Chip size="small" color="success" label="Al día" />
            )}
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, borderTop: "1px dashed", borderColor: "divider", pt: 1.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Cuota original
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {usdc(baseRent)}
              </Typography>
            </Box>

            {isLate && (
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="body2" color="textDisabled">
                  Interés por mora (+{lateFeeBps / 100}%)
                </Typography>
                <Typography variant="body2" color="textDisabled" sx={{ fontWeight: 500 }}>
                  +{usdc(lateFeeAmount)}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Total final
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
                {usdc(amountToPay)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {!enoughBalance && (
          <Chip
            color="error"
            variant="filled"
            icon={<ErrorRoundedIcon />}
            label={`Saldo insuficiente (Tenés ${usdc(balance)})`}
            sx={{
              mt: 2,
              width: "100%",
              color: "error.contrastText",
              fontWeight: 600,
              justifyContent: "flex-start",
              px: 1
            }}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={!enoughBalance || periodsPaid >= totalPeriods} onClick={confirm}>
          {periodsPaid >= totalPeriods ? "Contrato saldado" : `Pagar ${usdc(amountToPay)}`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
