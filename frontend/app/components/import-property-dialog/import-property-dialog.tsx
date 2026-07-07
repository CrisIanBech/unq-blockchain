import { useState } from "react"
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
} from "@mui/material"
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded"

interface ImportPropertyDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (name: string, propertyId: number) => void
}

export function ImportPropertyDialog({ open, onClose, onSubmit }: ImportPropertyDialogProps) {
  const [name, setName] = useState("")
  const [propertyId, setPropertyId] = useState("")
  const [touched, setTouched] = useState(false)

  const nameValid = name.trim().length > 0
  const idValid = Number.isInteger(Number(propertyId)) && Number(propertyId) > 0
  const valid = nameValid && idValid

  function reset() {
    setName("")
    setPropertyId("")
    setTouched(false)
  }

  function submit() {
    setTouched(true)
    if (!valid) return
    onSubmit(name.trim(), Number(propertyId))
    reset()
    onClose()
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
          <DownloadRoundedIcon />
        </Box>
        Importar propiedad
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Ingresá el ID (token ID) de la propiedad que posees en la blockchain para importarla a tu panel.
        </Typography>
        <Stack>
          <TextField
            label="Nombre o alias"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Departamento en Belgrano"
            error={touched && !nameValid}
            helperText={touched && !nameValid ? "Este campo es requerido" : " "}
            fullWidth
          />
          <TextField
            label="ID de la propiedad"
            type="number"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            placeholder="Ej: 1"
            error={touched && !idValid}
            helperText={touched && !idValid ? "Debe ser un número de ID válido" : " "}
            fullWidth
            slotProps={{ htmlInput: { min: 1 } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={() => { reset(); onClose(); }}>Cancelar</Button>
        <Button onClick={submit} variant="contained" disableElevation disabled={touched && !valid}>
          Importar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
