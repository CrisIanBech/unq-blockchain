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
  FormControlLabel,
  Switch,
} from "@mui/material"
import TokenRoundedIcon from "@mui/icons-material/TokenRounded"
import type { PropertyType } from "@/models/types"
import { TYPE_LABEL } from "@/lib/format"

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/

interface AddPropertyDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: {
    realEstateToken: string
    rentalToken: string
    type: PropertyType
    address: string
    monthlyRent: number
    surface: number
    rooms: number
    bathrooms: number
    pets: boolean
    garage: boolean
    images: File[]
  }) => void
}

export function AddPropertyDialog({ open, onClose, onSubmit }: AddPropertyDialogProps) {
  const [realEstateToken, setRe] = useState("")
  const [rentalToken, setRt] = useState("")
  const [type, setType] = useState<PropertyType>("departamento")
  const [address, setAddress] = useState("")
  const [rent, setRent] = useState("")
  const [surface, setSurface] = useState("")
  const [rooms, setRooms] = useState("")
  const [bathrooms, setBathrooms] = useState("")
  const [pets, setPets] = useState(false)
  const [garage, setGarage] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [touched, setTouched] = useState(false)

  const reValid = ADDR_RE.test(realEstateToken)
  const rtValid = ADDR_RE.test(rentalToken)
  const rentValid = Number(rent) > 0
  const addrValid = address.trim().length > 3
  const surfaceValid = Number(surface) > 0
  const roomsValid = Number(rooms) > 0
  const bathroomsValid = Number(bathrooms) > 0
  const valid = reValid && rtValid && rentValid && addrValid && surfaceValid && roomsValid && bathroomsValid

  function reset() {
    setRe("")
    setRt("")
    setType("departamento")
    setAddress("")
    setRent("")
    setSurface("")
    setRooms("")
    setBathrooms("")
    setPets(false)
    setGarage(false)
    setSelectedFiles([])
    setTouched(false)
  }

  function submit() {
    setTouched(true)
    if (!valid) return

    onSubmit({
      realEstateToken,
      rentalToken,
      type,
      address: address.trim(),
      monthlyRent: Number(rent),
      surface: Number(surface),
      rooms: Number(rooms),
      bathrooms: Number(bathrooms),
      pets,
      garage,
      images: selectedFiles,
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
          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
            <TextField
              label="Superficie"
              value={surface}
              onChange={(e) => setSurface(e.target.value.replace(/[^0-9]/g, ""))}
              error={touched && !surfaceValid}
              sx={{ flex: 1 }}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">m²</InputAdornment> } }}
            />
            <TextField
              label="Habitaciones"
              value={rooms}
              onChange={(e) => setRooms(e.target.value.replace(/[^0-9]/g, ""))}
              error={touched && !roomsValid}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Baños"
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value.replace(/[^0-9]/g, ""))}
              error={touched && !bathroomsValid}
              sx={{ flex: 1 }}
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-around", py: 0.5 }}>
            <FormControlLabel
              control={<Switch checked={pets} onChange={(e) => setPets(e.target.checked)} />}
              label="Permite mascotas"
            />
            <FormControlLabel
              control={<Switch checked={garage} onChange={(e) => setGarage(e.target.checked)} />}
              label="Garage/Cochera"
            />
          </Box>
          <Box sx={{ border: "2px dashed", borderColor: "divider", borderRadius: 2, p: 2.5, textAlign: "center", bgcolor: "background.paper" }}>
            <Button variant="contained" component="label" sx={{ mb: selectedFiles.length > 0 ? 1.5 : 0 }}>
              Seleccionar imágenes
              <input
                type="file"
                hidden
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) {
                    setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                  }
                }}
              />
            </Button>
            {selectedFiles.length > 0 && (
              <Stack spacing={0.5} sx={{ mt: 1, maxHeight: 120, overflowY: "auto", textAlign: "left" }}>
                {selectedFiles.map((file, i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.5, px: 1, bgcolor: "action.hover", borderRadius: 1 }}>
                    <Typography variant="caption" noWrap sx={{ maxWidth: "80%" }}>
                      {file.name}
                    </Typography>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => {
                        setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i));
                      }}
                      sx={{ minWidth: "auto", p: 0.5 }}
                    >
                      Eliminar
                    </Button>
                  </Box>
                ))}
              </Stack>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Subiremos las imágenes de manera segura a IPFS. Si no eliges ninguna, usaremos Google Maps.
            </Typography>
          </Box>
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
