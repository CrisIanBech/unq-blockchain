import { useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Stack,
  Typography,
  Box,
  InputAdornment,
} from "@mui/material"
import TokenRoundedIcon from "@mui/icons-material/TokenRounded"
import type { PropertyType } from "@/models/types"
import { TYPE_LABEL } from "@/lib/format" // Wait, we can keep using lib/format or move it, lib/format has no React context dependencies

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/

interface AddPropertyDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: {
    realEstateToken: string
    rentalToken: string
    name: string
    type: PropertyType
    address: string
    monthlyRent: number
  }) => void
}

export function AddPropertyDialog({ open, onClose, onSubmit }: AddPropertyDialogProps) {
  const [realEstateToken, setRe] = useState("")
  const [rentalToken, setRt] = useState("")
  const [name, setName] = useState("")
  const [type, setType] = useState<PropertyType>("departamento")
  const [address, setAddress] = useState("")
  const [rent, setRent] = useState("")
  const [touched, setTouched] = useState(false)

  const reValid = ADDR_RE.test(realEstateToken)
  const rtValid = ADDR_RE.test(rentalToken)
  const rentValid = Number(rent) > 0
  const nameValid = name.trim().length > 1
  const addrValid = address.trim().length > 3
  const valid = reValid && rtValid && rentValid && nameValid && addrValid

  function reset() {
    setRe("")
    setRt("")
    setName("")
    setType("departamento")
    setAddress("")
    setRent("")
    setTouched(false)
  }

  function submit() {
    setTouched(true)
    if (!valid) return
    onSubmit({
      realEstateToken,
      rentalToken,
      name: name.trim(),
      type,
      address: address.trim(),
      monthlyRent: Number(rent),
    })
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 0.5 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 3, bgcolor: "primaryContainer.main", color: "primaryContainer.contrastText", display: "grid", placeItems: "center" }}>
          <TokenRoundedIcon />
        </Box>
        Cargar propiedad on-chain
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Ingresá las dos addresses de los tokens. Mintearemos el token de bien inmueble y el de
          alquiler a tu wallet.
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Address del token de bien inmueble"
            value={realEstateToken}
            onChange={(e) => setRe(e.target.value)}
            placeholder="0x..."
            error={touched && !reValid}
            helperText={touched && !reValid ? "Debe ser una address válida (0x + 40 hex)" : " "}
            fullWidth
            slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
          />
          <TextField
            label="Address del token de alquiler"
            value={rentalToken}
            onChange={(e) => setRt(e.target.value)}
            placeholder="0x..."
            error={touched && !rtValid}
            helperText={touched && !rtValid ? "Debe ser una address válida (0x + 40 hex)" : " "}
            fullWidth
            slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
          />
          <TextField
            label="Nombre de la propiedad"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={touched && !nameValid}
            fullWidth
          />
          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
            <TextField select label="Tipo" value={type} onChange={(e) => setType(e.target.value as PropertyType)} sx={{ flex: 1 }}>
              {(Object.keys(TYPE_LABEL) as PropertyType[]).map((t) => (
                <MenuItem key={t} value={t}>
                  {TYPE_LABEL[t]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Alquiler mensual"
              value={rent}
              onChange={(e) => setRent(e.target.value.replace(/[^0-9]/g, ""))}
              error={touched && !rentValid}
              sx={{ flex: 1 }}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">USDC</InputAdornment> } }}
            />
          </Box>
          <TextField
            label="Dirección"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            error={touched && !addrValid}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={submit}>
          Mintear y cargar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
