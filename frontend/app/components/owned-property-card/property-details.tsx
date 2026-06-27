import { Box, IconButton, Typography } from "@mui/material"
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded"
import { usdc, dateLabel } from "@/lib/format"

interface PropertyDetailsProps {
  name: string
  address: string
  monthlyRent: number
  nextChargeDate: string
  availableToWithdraw: number
  canWithdraw: boolean
  onOpenMenu: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export function PropertyDetails({
  name,
  address,
  monthlyRent,
  nextChargeDate,
  availableToWithdraw,
  canWithdraw,
  onOpenMenu,
}: PropertyDetailsProps) {
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            {name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {address}
          </Typography>
        </Box>
        <IconButton onClick={onOpenMenu} aria-label="acciones del contrato">
          <MoreVertRoundedIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", gap: 3, mt: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Alquiler mensual
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {usdc(monthlyRent)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Próximo cobro
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {dateLabel(nextChargeDate)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Disponible
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: canWithdraw ? "primary.main" : "text.primary" }}>
            {usdc(availableToWithdraw)}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
