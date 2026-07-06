import { useState } from "react"
import { Box, Button, CircularProgress, Typography, Fab, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material"
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded"
import AddRoundedIcon from "@mui/icons-material/AddRounded"
import { PayRentDialog } from "@components/pay-rent-dialog/pay-rent-dialog"
import type { UseMyRentalsPageReturn } from "@hooks/use-my-rentals-page"
import { RentalCard } from "./rental-card"
import { ethers } from "ethers"

interface MyRentalsScreenProps extends UseMyRentalsPageReturn {
  onNavigateToSmartlock: () => void
}

export function MyRentalsScreen({
  rentals,
  balance,
  payTarget,
  expanded,
  isSyncing,
  addRentalOpen,
  onSetPayTarget,
  onToggleExpand,
  onPayRent,
  onSignAgreement,
  onCancelAgreement,
  onNavigateToSmartlock,
  onImportRental,
  onOpenAddRental,
  onCloseAddRental,
  onRemoveRental,
}: MyRentalsScreenProps) {
  const [importName, setImportName] = useState("")
  const [importAddress, setImportAddress] = useState("")

  const isAddressValid = 
    importAddress.trim() === "" || 
    ethers.isAddress(importAddress.trim()) || 
    importAddress.trim().startsWith("0xMock")

  function handleImport() {
    if (importName.trim() && importAddress.trim() && isAddressValid) {
      onImportRental(importName.trim(), importAddress.trim())
      setImportName("")
      setImportAddress("")
      onCloseAddRental()
    }
  }

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

      {isSyncing && rentals.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : rentals.length === 0 ? (
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
              onSignAgreement={onSignAgreement}
              onCancelAgreement={onCancelAgreement}
              onNavigateToSmartlock={onNavigateToSmartlock}
              onToggleExpand={onToggleExpand}
              onRemoveRental={onRemoveRental}
            />
          ))}
        </Box>
      )}

      {payTarget && (
        <PayRentDialog
          rental={payTarget}
          open={!!payTarget}
          onClose={() => onSetPayTarget(null)}
          onPay={onPayRent}
          balance={balance}
        />
      )}

      <Fab
        color="primary"
        aria-label="add"
        onClick={onOpenAddRental}
        sx={{
          position: "fixed",
          bottom: 32,
          right: 32,
        }}
      >
        <AddRoundedIcon />
      </Fab>

      <Dialog open={addRentalOpen} onClose={onCloseAddRental} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Importar Contrato de Alquiler</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Ingresá el nombre con el que querés identificar la propiedad y la dirección del contrato inteligente.
          </Typography>
          <TextField
            label="Nombre de la propiedad"
            variant="outlined"
            fullWidth
            value={importName}
            onChange={(e) => setImportName(e.target.value)}
            placeholder="Ej: Depto Palermo"
          />
          <TextField
            label="Dirección del Contrato (0x...)"
            variant="outlined"
            fullWidth
            value={importAddress}
            onChange={(e) => setImportAddress(e.target.value)}
            error={!isAddressValid}
            helperText={!isAddressValid ? "Debe ser una dirección válida (0x...)" : ""}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={onCloseAddRental} color="inherit">
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleImport} 
            disabled={!importName.trim() || !importAddress.trim() || !isAddressValid || isSyncing}
          >
            {isSyncing ? <CircularProgress size={24} color="inherit" /> : "Importar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
