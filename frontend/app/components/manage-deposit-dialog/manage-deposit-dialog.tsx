import { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress
} from "@mui/material"
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded"
import { Property } from "@models/types"
import { getServices } from "@/lib/services/service-registry"
import { useUserStore } from "@stores/user-store"
import { usdc } from "@/lib/format"

interface ManageDepositDialogProps {
  open: boolean
  onClose: () => void
  properties: Property[]
  contractHistory: Record<number, string[]>
  onRelease: (agreementAddress: string) => Promise<void>
  onClaim: (agreementAddress: string, amount: number, reason: string) => Promise<void>
}

export function ManageDepositDialog({ open, onClose, properties, contractHistory, onRelease, onClaim }: ManageDepositDialogProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | "">("")
  const [selectedContract, setSelectedContract] = useState<string>("")
  const [customContract, setCustomContract] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [depositData, setDepositData] = useState<{ amount: number } | null>(null)

  const [actionType, setActionType] = useState<"release" | "claim">("release")
  const [claimAmount, setClaimAmount] = useState<string>("")
  const [claimReason, setClaimReason] = useState<string>("")

  const { wallet, pushToast } = useUserStore()

  useEffect(() => {
    if (open) {
      setStep(1)
      setSelectedPropertyId("")
      setSelectedContract("")
      setCustomContract("")
      setDepositData(null)
      setActionType("release")
      setClaimAmount("")
      setClaimReason("")
    }
  }, [open])

  const propertyOptions = properties.filter(p => p.propertyId !== undefined)
  const contractOptions = selectedPropertyId !== "" ? (contractHistory[Number(selectedPropertyId)] || []) : []

  const finalContractAddress = selectedContract || customContract

  async function fetchDepositInfo() {
    if (!finalContractAddress || !wallet) return
    setIsLoading(true)
    try {
      const { rentalsService } = getServices(wallet)
      const details = await rentalsService.getRentalDetails(finalContractAddress)
      
      if (details.status === 2) {
        pushToast({ 
          message: "El contrato sigue activo. No podés gestionar el depósito hasta que finalice.", 
          severity: "error" 
        })
        return;
      }

      if (details.depositStatus !== 1) {
        pushToast({
          message: "Este contrato no tiene depósito de garantía bloqueado o ya fue gestionado.",
          severity: "warning"
        })
        return;
      }

      setDepositData({ amount: details.securityDeposit })
      setStep(2)
    } catch (err: any) {
      console.error(err)
      pushToast({ message: "Error al cargar contrato: " + err.message, severity: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit() {
    if (!finalContractAddress) return
    
    setIsLoading(true)
    try {
      if (actionType === "release") {
        await onRelease(finalContractAddress)
      } else {
        await onClaim(finalContractAddress, Number(claimAmount), claimReason)
      }
      onClose()
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 0.5 }}>
        <Box sx={{
          width: 40,
          height: 40,
          borderRadius: 3,
          bgcolor: "primaryContainer.main",
          color: "primaryContainer.contrastText",
          display: "grid",
          placeItems: "center"
        }}>
          <AccountBalanceWalletRoundedIcon />
        </Box>
        Gestionar Depósito
      </DialogTitle>
      <DialogContent>
        {step === 1 ? (
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Seleccioná la propiedad y el contrato del cual querés gestionar el depósito de garantía.
            </Typography>

            <FormControl fullWidth>
              <InputLabel>Propiedad</InputLabel>
              <Select
                value={selectedPropertyId}
                label="Propiedad"
                onChange={(e) => {
                  setSelectedPropertyId(e.target.value as number)
                  setSelectedContract("")
                }}
              >
                {propertyOptions.map(p => (
                  <MenuItem key={p.id} value={p.propertyId}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={!selectedPropertyId || contractOptions.length === 0}>
              <InputLabel>Contrato guardado</InputLabel>
              <Select
                value={selectedContract}
                label="Contrato guardado"
                onChange={(e) => {
                  setSelectedContract(e.target.value as string)
                  setCustomContract("")
                }}
              >
                <MenuItem value=""><em>-- Ninguno / Pegar manual --</em></MenuItem>
                {contractOptions.map((c, i) => (
                  <MenuItem key={i} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="caption" align="center" color="text.secondary">
              O ingresá la dirección manualmente:
            </Typography>
            <TextField
              label="Dirección del contrato (Address)"
              value={customContract}
              onChange={(e) => {
                setCustomContract(e.target.value)
                setSelectedContract("")
              }}
              fullWidth
            />
          </Stack>
        ) : (
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">Depósito de contrato</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                {usdc(depositData?.amount || 0)}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button 
                variant={actionType === "release" ? "contained" : "outlined"}
                fullWidth
                onClick={() => setActionType("release")}
                disableElevation
              >
                Devolver Todo
              </Button>
              <Button 
                variant={actionType === "claim" ? "contained" : "outlined"}
                color="error"
                fullWidth
                onClick={() => setActionType("claim")}
                disableElevation
              >
                Reclamar
              </Button>
            </Stack>

            {actionType === "claim" && (
              <Stack spacing={2}>
                <TextField 
                  label="Monto a retener (USDC)"
                  type="number"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  fullWidth
                  error={Number(claimAmount) > (depositData?.amount || 0) || Number(claimAmount) < 0}
                  helperText={
                    Number(claimAmount) > (depositData?.amount || 0) 
                      ? `No podés retener más de ${depositData?.amount} USDC` 
                      : "Ingresá cuánto querés retener"
                  }
                />
                <TextField 
                  label="Motivo (ej. daños en pared)"
                  value={claimReason}
                  onChange={(e) => setClaimReason(e.target.value)}
                  fullWidth
                />
              </Stack>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={isLoading}>Cancelar</Button>
        {step === 1 ? (
          <Button 
            variant="contained" 
            disableElevation 
            onClick={fetchDepositInfo}
            disabled={!finalContractAddress || isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : "Siguiente"}
          </Button>
        ) : (
          <Button 
            variant="contained" 
            color={actionType === "claim" ? "error" : "primary"}
            disableElevation 
            onClick={handleSubmit}
            disabled={
              isLoading || 
              (actionType === "claim" && (
                !claimAmount || 
                !claimReason || 
                Number(claimAmount) > (depositData?.amount || 0) || 
                Number(claimAmount) <= 0
              ))
            }
          >
            {isLoading ? <CircularProgress size={24} /> : (actionType === "release" ? "Confirmar Devolución" : "Confirmar Reclamo")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
