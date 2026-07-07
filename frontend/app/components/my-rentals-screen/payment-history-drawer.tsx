import { useState, useEffect } from "react"
import { Box, CircularProgress, Divider, Drawer, IconButton, Typography } from "@mui/material"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import { PaymentHistory } from "@components/payment-history/payment-history"
import { useRentalsStore } from "@/stores/rentals-store"
import type { Rental, PaymentRecord } from "@models/types"

interface PaymentHistoryDrawerProps {
  rental: Rental
  isOpen: boolean
  onClose: () => void
}

export function PaymentHistoryDrawer({ rental, isOpen, onClose }: PaymentHistoryDrawerProps) {
  const fetchPaymentHistory = useRentalsStore(s => s.fetchPaymentHistory)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLoadingPayments(true)
      fetchPaymentHistory(rental.id)
        .then(setPayments)
        .finally(() => setLoadingPayments(false))
    }
  }, [isOpen, rental.id, fetchPaymentHistory])

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100%", sm: 400 },
            bgcolor: "background.default",
            p: 3,
          },
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Historial de pagos
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {rental.name}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="cerrar">
          <CloseRoundedIcon />
        </IconButton>
      </Box>
      <Divider sx={{ mb: 3 }} />
      {loadingPayments ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <PaymentHistory payments={payments} />
      )}
    </Drawer>
  )
}
