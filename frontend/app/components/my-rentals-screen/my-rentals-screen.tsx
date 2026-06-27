import { Box, Typography } from "@mui/material"
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded"
import { PayRentDialog } from "@components/pay-rent-dialog/pay-rent-dialog"
import type { UseMyRentalsPageReturn } from "@hooks/use-my-rentals-page"
import { RentalCard } from "./rental-card"

interface MyRentalsScreenProps extends UseMyRentalsPageReturn {
  onNavigateToSmartlock: () => void
}

export function MyRentalsScreen({
  rentals,
  balance,
  payTarget,
  expanded,
  onSetPayTarget,
  onToggleExpand,
  onPayRent,
  onNavigateToSmartlock,
}: MyRentalsScreenProps) {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Mis alquileres
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Propiedades que estás alquilando como inquilino.
        </Typography>
      </Box>

      {rentals.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 8,
            px: 2,
            textAlign: "center",
            gap: 2,
            bgcolor: "background.paper",
            borderRadius: "16px",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <HomeWorkRoundedIcon sx={{ fontSize: 64, color: "text.secondary", opacity: 0.6 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
              No tienes alquileres activos
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Busca y alquila propiedades desde la sección del buscador.
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 3 }}>
          {rentals.map((r) => (
            <RentalCard
              key={r.id}
              rental={r}
              isOpen={expanded === r.id}
              onSetPayTarget={onSetPayTarget}
              onNavigateToSmartlock={onNavigateToSmartlock}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </Box>
      )}

      <PayRentDialog
        rental={payTarget}
        open={Boolean(payTarget)}
        onClose={() => onSetPayTarget(null)}
        onPay={onPayRent}
        balance={balance}
      />
    </Box>
  )
}
