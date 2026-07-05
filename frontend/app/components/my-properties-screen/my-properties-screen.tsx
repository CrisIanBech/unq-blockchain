import { Box, Typography, SpeedDial, SpeedDialIcon, SpeedDialAction } from "@mui/material"
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded"
import EventRoundedIcon from "@mui/icons-material/EventRounded"
import PieChartRoundedIcon from "@mui/icons-material/PieChartRounded"
import AddRoundedIcon from "@mui/icons-material/AddRounded"
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded"
import HomeRoundedIcon from "@mui/icons-material/HomeRounded"
import { StatCard } from "@components/stat-card/stat-card"
import { OwnedPropertyCard } from "@components/owned-property-card/owned-property-card"
import { AddPropertyDialog } from "@components/add-property-dialog/add-property-dialog"
import { ImportPropertyDialog } from "@components/import-property-dialog/import-property-dialog"
import { usdc, dateLabel } from "@/lib/format"
import type { UseMyPropertiesPageReturn } from "@hooks/use-my-properties-page"

const SafeSpeedDialAction = SpeedDialAction as any;

export function MyPropertiesScreen({
  ownedProperties,
  addOpen,
  importOpen,
  stats,
  onOpenAdd,
  onCloseAdd,
  onSubmitAdd,
  onOpenImport,
  onCloseImport,
  onSubmitImport,
  onWithdrawRent,
  onSignContract,
  onCancelContract,
  onCreateContract,
}: UseMyPropertiesPageReturn) {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Mis propiedades
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Resumen de tus inmuebles tokenizados y sus contratos de alquiler.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 2,
          mb: 4,
        }}
      >
        <StatCard
          tone="primary"
          icon={<TrendingUpRoundedIcon />}
          label="Ingreso de este mes"
          value={usdc(stats.monthIncome)}
          hint="Cobrado en junio 2026"
        />
        <StatCard
          tone="tertiary"
          icon={<EventRoundedIcon />}
          label="Próximo cobro"
          value={dateLabel(stats.nextCharge)}
          hint="Fecha más cercana"
        />
        <StatCard
          tone="secondary"
          icon={<PieChartRoundedIcon />}
          label="Ocupación"
          value={`${stats.occupancy}%`}
          hint={`${stats.occupied} de ${ownedProperties.length} alquiladas`}
        />
      </Box>

      {ownedProperties.length === 0 ? (
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
          <HomeRoundedIcon sx={{ fontSize: 64, color: "text.secondary", opacity: 0.6 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
              No tienes propiedades registradas
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Tokeniza y publica tu primera propiedad para empezar a recibir alquileres sin intermediarios.
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
            gap: 3,
          }}
        >
          {ownedProperties.map((p) => (
            <OwnedPropertyCard
              key={p.id}
              property={p}
              onWithdrawRent={onWithdrawRent}
              onSignContract={onSignContract}
              onCancelContract={onCancelContract}
              onCreateContract={onCreateContract}
            />
          ))}
        </Box>
      )}

      <SpeedDial
        ariaLabel="Acciones de propiedad"
        sx={{ position: "fixed", bottom: { xs: 88, sm: 32 }, right: { xs: 16, sm: 32 }, zIndex: 1100 }}
        icon={<SpeedDialIcon />}
      >
        <SafeSpeedDialAction
          icon={<AddRoundedIcon />}
          tooltipTitle="Registrar propiedad (Mint)"
          onClick={onOpenAdd}
        />
        <SafeSpeedDialAction
          icon={<DownloadRoundedIcon />}
          tooltipTitle="Importar propiedad (ID)"
          onClick={onOpenImport}
        />
      </SpeedDial>

      <AddPropertyDialog open={addOpen} onClose={onCloseAdd} onSubmit={onSubmitAdd} />
      <ImportPropertyDialog open={importOpen} onClose={onCloseImport} onSubmit={onSubmitImport} />
    </Box>
  )
}
