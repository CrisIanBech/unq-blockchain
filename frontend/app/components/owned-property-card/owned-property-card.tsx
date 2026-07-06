import { useState } from "react"
import {
  Card,
  CardContent,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded"
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import type { OwnedProperty } from "@models/types"
import { dateLabel } from "@/lib/format"
import { PaymentHistory } from "@components/payment-history/payment-history"
import { PropertyCardHeader } from "./property-card-header"
import { PropertyDetails } from "./property-details"
import { PropertyMenu } from "./property-menu"

const STATUS_CHIP = {
  active: { label: "Contrato activo", color: "success" as const },
  draft: { label: "Borrador", color: "warning" as const },
  cancelled: { label: "Cancelado", color: "default" as const },
}

interface OwnedPropertyCardProps {
  property: OwnedProperty
  onWithdrawRent: (id: string) => void
  onSignContract: (id: string) => void
  onCancelContract: (id: string) => void
  onCreateContract: (id: string, tenant: string, rent: number) => void
}

export function OwnedPropertyCard({
  property,
  onWithdrawRent,
  onSignContract,
  onCancelContract,
  onCreateContract,
}: OwnedPropertyCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [menuEl, setMenuEl] = useState<null | HTMLElement>(null)

  const isOverdue = property.payments.some((p) => p.status === "overdue")
  const canWithdraw = property.availableToWithdraw > 0
  const s = STATUS_CHIP[property.contractStatus]

  function consultTenant() {
    setMenuEl(null)
    alert(
      property.tenant
        ? `Inquilino on-chain de "${property.name}":\n${property.tenant}\nDesde: ${dateLabel(property.tenantSince)}`
        : `"${property.name}" no tiene inquilino asignado.`,
    )
  }

  return (
    <Card
      sx={{
        overflow: "hidden",
      }}
    >
      <PropertyCardHeader
        imageUrl={property.imageUrl ?? ""}
        name={property.name}
        type={property.type}
        isOverdue={isOverdue}
        statusColor={s.color}
        statusLabel={
          property.contractStatus === "draft" && property.landlordApproved
            ? "Esperando al inquilino"
            : s.label
        }
      />

      <CardContent>
        <PropertyDetails
          name={property.name}
          address={property.address}
          monthlyRent={property.monthlyRent}
          nextChargeDate={property.nextChargeDate ?? ""}
          availableToWithdraw={property.availableToWithdraw}
          canWithdraw={canWithdraw}
          onOpenMenu={(e) => setMenuEl(e.currentTarget)}
        />

        <Box sx={{ display: "flex", gap: 1.5, mt: 2.5, alignItems: "center", flexWrap: "wrap" }}>
          <Tooltip title={canWithdraw ? "" : "No hay fondos disponibles"}>
            <span>
              <Button
                variant="contained"
                startIcon={<PaymentsRoundedIcon />}
                disabled={!canWithdraw}
                onClick={() => onWithdrawRent(property.id)}
              >
                Retirar fondos
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="text"
            startIcon={<HistoryRoundedIcon />}
            onClick={() => setExpanded(true)}
            sx={{ ml: "auto" }}
          >
            Historial de pagos
          </Button>
        </Box>
      </CardContent>

      <PropertyMenu
        property={property}
        menuEl={menuEl}
        onCloseMenu={() => setMenuEl(null)}
        onConsultTenant={consultTenant}
        onCreateContract={onCreateContract}
        onSignContract={onSignContract}
        onCancelContract={onCancelContract}
      />

      {/* Drawer for Payment History (Side Sheet) */}
      <Drawer
        anchor="right"
        open={expanded}
        onClose={() => setExpanded(false)}
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
              {property.name}
            </Typography>
          </Box>
          <IconButton onClick={() => setExpanded(false)} aria-label="cerrar">
            <CloseRoundedIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <PaymentHistory payments={property.payments} />
      </Drawer>
    </Card>
  )
}
