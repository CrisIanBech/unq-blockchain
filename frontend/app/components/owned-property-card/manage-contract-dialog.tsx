import { useState } from "react"
import { ethers } from "ethers"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Tabs,
  Tab,
  InputAdornment,
  Grid,
} from "@mui/material"
import type { CreateContractInput } from "@/lib/services/property-dashboard-service"
import { usePropertiesStore } from "@/stores/properties-store"

interface ManageContractDialogProps {
  open: boolean
  onClose: () => void
  propertyId: number
  propertyName: string
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`manage-contract-tabpanel-${index}`}
      aria-labelledby={`manage-contract-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export function ManageContractDialog({ open, onClose, propertyId, propertyName }: ManageContractDialogProps) {
  const [tab, setTab] = useState(0)

  // Link existing
  const [existingAddress, setExistingAddress] = useState("")

  // Create new
  const [tenant, setTenant] = useState("")
  const [baseRent, setBaseRent] = useState(1)
  const [securityDeposit, setSecurityDeposit] = useState(0)
  const [durationMonths, setDurationMonths] = useState(12)
  const [paymentPeriodDays, setPaymentPeriodDays] = useState(30)
  const [gracePeriodDays, setGracePeriodDays] = useState(5)
  const [lateFeePercent, setLateFeePercent] = useState(1)
  const [inflationPercent, setInflationPercent] = useState(5)
  const [inflationAdjustmentInterval, setInflationAdjustmentInterval] = useState(12)
  const [deadlineDays, setDeadlineDays] = useState(7)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { createContract, linkContract } = usePropertiesStore()

  const handleCreate = async () => {
    setIsSubmitting(true)
    try {
      const input: Omit<CreateContractInput, "propertyId"> = {
        tenant,
        baseRent,
        securityDeposit,
        durationMonths,
        gracePeriodDays,
        lateFeeBps: lateFeePercent * 100,
        inflationBps: inflationPercent * 100,
        paymentPeriodDays,
        inflationAdjustmentInterval,
        deadlineDays
      }
      await createContract(String(propertyId), input)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLink = () => {
    if (existingAddress) {
      linkContract(propertyId, existingAddress)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Gestionar Contrato - {propertyName}</DialogTitle>

      <DialogContent dividers>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, nv) => setTab(nv)}>
            <Tab label="Crear Nuevo" />
            <Tab label="Vincular Existente" />
          </Tabs>
        </Box>

        <TabPanel value={tab} index={0}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pt: 1 }}>
            <TextField
              label="Billetera del inquilino"
              fullWidth
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              placeholder="0x..."
              error={tenant.length > 0 && !ethers.isAddress(tenant)}
              helperText={tenant.length > 0 && !ethers.isAddress(tenant) ? "Dirección de billetera inválida" : ""}
            />
            <TextField
              label="Alquiler Base"
              type="number"
              fullWidth
              value={baseRent}
              onChange={(e) => setBaseRent(Number(e.target.value))}
              error={baseRent <= 0}
              helperText={baseRent <= 0 ? "Debe ser mayor a 0" : ""}
              slotProps={{
                input: { startAdornment: <InputAdornment position="start">USDC</InputAdornment> },
                htmlInput: { min: 1 }
              }}
            />
            <TextField
              label="Depósito de Garantía"
              type="number"
              fullWidth
              value={securityDeposit}
              onChange={(e) => setSecurityDeposit(Number(e.target.value))}
              error={securityDeposit < 0}
              helperText={securityDeposit < 0 ? "No puede ser negativo" : ""}
              slotProps={{
                input: { startAdornment: <InputAdornment position="start">USDC</InputAdornment> },
                htmlInput: { min: 0 }
              }}
            />
            <TextField
              label="Duración"
              type="number"
              fullWidth
              value={durationMonths}
              onChange={(e) => setDurationMonths(Number(e.target.value))}
              error={durationMonths < 1}
              helperText={durationMonths < 1 ? "Debe ser al menos 1 mes" : ""}
              slotProps={{
                input: { endAdornment: <InputAdornment position="end">meses</InputAdornment> },
                htmlInput: { min: 1 }
              }}
            />
            <TextField
              label="Período de Pago"
              type="number"
              fullWidth
              value={paymentPeriodDays}
              onChange={(e) => setPaymentPeriodDays(Number(e.target.value))}
              error={paymentPeriodDays < 1}
              helperText={paymentPeriodDays < 1 ? "Debe ser al menos 1 día" : ""}
              slotProps={{
                input: { endAdornment: <InputAdornment position="end">días</InputAdornment> },
                htmlInput: { min: 1 }
              }}
            />
            <TextField
              label="Plazo de Gracia"
              type="number"
              fullWidth
              value={gracePeriodDays}
              onChange={(e) => setGracePeriodDays(Number(e.target.value))}
              error={gracePeriodDays < 1}
              helperText={gracePeriodDays < 1 ? "Debe ser al menos 1 día" : ""}
              slotProps={{
                input: { endAdornment: <InputAdornment position="end">días</InputAdornment> },
                htmlInput: { min: 1 }
              }}
            />
            <TextField
              label="Penalidad por Mora"
              type="number"
              fullWidth
              value={lateFeePercent}
              onChange={(e) => setLateFeePercent(Number(e.target.value))}
              error={lateFeePercent < 0}
              helperText={lateFeePercent < 0 ? "No puede ser negativo" : ""}
              slotProps={{
                input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                htmlInput: { min: 0 }
              }}
            />
            <TextField
              label="Inflación / Ajuste"
              type="number"
              fullWidth
              value={inflationPercent}
              onChange={(e) => setInflationPercent(Number(e.target.value))}
              error={inflationPercent < 0}
              helperText={inflationPercent < 0 ? "No puede ser negativo" : ""}
              slotProps={{
                input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                htmlInput: { min: 0 }
              }}
            />
            <TextField
              label="Intervalo de Ajuste"
              type="number"
              fullWidth
              value={inflationAdjustmentInterval}
              onChange={(e) => setInflationAdjustmentInterval(Number(e.target.value))}
              error={inflationAdjustmentInterval < 1}
              helperText={inflationAdjustmentInterval < 1 ? "Debe ser al menos 1 período" : ""}
              slotProps={{
                input: { endAdornment: <InputAdornment position="end">períodos</InputAdornment> },
                htmlInput: { min: 1 }
              }}
            />
            <TextField
              label="Plazo para Firmar"
              type="number"
              fullWidth
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(Number(e.target.value))}
              error={deadlineDays < 1}
              helperText={deadlineDays < 1 ? "Debe ser al menos 1 día" : ""}
              slotProps={{
                input: { endAdornment: <InputAdornment position="end">días</InputAdornment> },
                htmlInput: { min: 1 }
              }}
            />
          </Box>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <TextField
            label="Dirección del Contrato (RentalAgreement)"
            fullWidth
            value={existingAddress}
            onChange={(e) => setExistingAddress(e.target.value)}
            placeholder="0x..."
            helperText="Si ya desplegaste el contrato por otro medio, podés vincularlo ingresando su dirección."
          />
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
        {tab === 0 ? (
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!tenant || !ethers.isAddress(tenant) || baseRent <= 0 || securityDeposit < 0 || durationMonths < 1 || paymentPeriodDays < 1 || gracePeriodDays < 1 || lateFeePercent < 0 || inflationPercent < 0 || inflationAdjustmentInterval < 1 || deadlineDays < 1 || isSubmitting}
          >
            Desplegar Contrato
          </Button>
        ) : (
          <Button onClick={handleLink} variant="contained" disabled={!existingAddress || isSubmitting}>
            Vincular Contrato
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
