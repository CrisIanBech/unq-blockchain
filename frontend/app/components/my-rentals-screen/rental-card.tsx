import { Box, Button, Card, Chip, Collapse, Divider, Drawer, IconButton, Tooltip, Typography } from "@mui/material"
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded"
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded"
import EventRoundedIcon from "@mui/icons-material/EventRounded"
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import { usdc, dateLabel, TYPE_LABEL } from "@/lib/format"
import { PaymentHistory } from "@components/payment-history/payment-history"
import type { Rental } from "@models/types"

interface RentalCardProps {
  rental: Rental
  isOpen: boolean
  onSetPayTarget: (r: Rental) => void
  onNavigateToSmartlock: () => void
  onToggleExpand: (id: string) => void
}

export function RentalCard({
  rental,
  isOpen,
  onSetPayTarget,
  onNavigateToSmartlock,
  onToggleExpand,
}: RentalCardProps) {
  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Section */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, flex: 1 }}>
        <Box
          component="img"
          src={rental.imageUrl}
          alt={rental.name}
          sx={{
            width: { xs: "100%", sm: 160 },
            height: { xs: 160, sm: "auto" },
            objectFit: "cover",
          }}
        />
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, p: 2.5 }}>
          <Box sx={{ flex: 1 }}>
            <Chip
              size="small"
              label={TYPE_LABEL[rental.type]}
              sx={{ mb: 1, bgcolor: "surfaceContainer.high", fontWeight: 600 }}
            />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              {rental.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {rental.address}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <EventRoundedIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.primary">
                Próximo pago: <strong>{dateLabel(rental.nextPaymentDate)}</strong> · {usdc(rental.monthlyRent)}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 2.5, flexWrap: "wrap" }}>
            <Tooltip title="Smartlock">
              <IconButton
                size="small"
                onClick={onNavigateToSmartlock}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  color: "primary.main",
                  p: 0.75,
                }}
              >
                <LockOpenRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button size="small" variant="contained" startIcon={<PaymentsRoundedIcon />} onClick={() => onSetPayTarget(rental)}>
              Pagar mes
            </Button>
            <Button
              size="small"
              variant="text"
              startIcon={<HistoryRoundedIcon />}
              onClick={() => onToggleExpand(rental.id)}
              sx={{ ml: "auto" }}
            >
              Historial
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Drawer for Payment History (Side Sheet) */}
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={() => onToggleExpand(rental.id)}
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
          <IconButton onClick={() => onToggleExpand(rental.id)} aria-label="cerrar">
            <CloseRoundedIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <PaymentHistory payments={rental.payments} />
      </Drawer>
    </Card>
  )
}
