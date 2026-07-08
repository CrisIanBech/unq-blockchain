import { Box, Typography, SpeedDial, SpeedDialIcon, SpeedDialAction, Stack, CircularProgress } from "@mui/material"
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded"
import EventRoundedIcon from "@mui/icons-material/EventRounded"
import PieChartRoundedIcon from "@mui/icons-material/PieChartRounded"
import AddRoundedIcon from "@mui/icons-material/AddRounded"
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded"
import HomeRoundedIcon from "@mui/icons-material/HomeRounded"
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded"
import { StatCard } from "@components/stat-card/stat-card"
import { OwnedPropertyCard } from "@components/owned-property-card/owned-property-card"
import { AddPropertyDialog } from "@components/add-property-dialog/add-property-dialog"
import { ImportPropertyDialog } from "@components/import-property-dialog/import-property-dialog"
import { ManageDepositDialog } from "@components/manage-deposit-dialog/manage-deposit-dialog"
import { usdc, dateLabel, monthLabel, CURRENT_MONTH } from "@/lib/format"
import type { UseMyPropertiesPageReturn } from "@hooks/use-my-properties-page"

const SafeSpeedDialAction = SpeedDialAction as any;

export function MyPropertiesScreen({
  isSyncing,
  ownedProperties,
  addOpen,
  importOpen,
  depositOpen,
  contractHistory,
  monthIncome,
  nextCharge,
  occupancyStats,
  onOpenAdd,
  onCloseAdd,
  onOpenImport,
  onCloseImport,
  onSubmitImport,
  onWithdrawRent,
  onSignContract,
  onCancelContract,
  onUnlinkContract,
  onOpenDeposit,
  onCloseDeposit,
  onReleaseDeposit,
  onClaimDeposit,
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
          value={usdc(monthIncome)}
          hint={`Cobrado en ${monthLabel(CURRENT_MONTH)}`}
        />
        <StatCard
          tone="tertiary"
          icon={<EventRoundedIcon />}
          label="Próximo cobro"
          value={dateLabel(nextCharge)}
          hint="Fecha más cercana"
        />
        <StatCard
          tone="secondary"
          icon={<PieChartRoundedIcon />}
          label="Ocupación"
          value={`${occupancyStats.occupancy}%`}
          hint={`${occupancyStats.occupied} de ${ownedProperties.length} alquiladas`}
        />
      </Box>

      {isSyncing && ownedProperties.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      ) : ownedProperties.length === 0 ? (
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
              onUnlinkContract={onUnlinkContract}
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
        <SafeSpeedDialAction
          icon={<AccountBalanceWalletRoundedIcon />}
          tooltipTitle="Gestionar Depósito"
          onClick={onOpenDeposit}
        />
      </SpeedDial>

      <AddPropertyDialog open={addOpen} onClose={onCloseAdd} />
      <ImportPropertyDialog open={importOpen} onClose={onCloseImport} onSubmit={onSubmitImport} />
      <ManageDepositDialog
        open={depositOpen}
        onClose={onCloseDeposit}
        properties={ownedProperties}
        contractHistory={contractHistory}
        onRelease={onReleaseDeposit}
        onClaim={onClaimDeposit}
      />
    </Box>
  )
}
