import { useState, useRef, useCallback } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
  Autocomplete,
  CircularProgress,
  Box,
} from "@mui/material"
import TokenRoundedIcon from "@mui/icons-material/TokenRounded"
import RoomRoundedIcon from "@mui/icons-material/RoomRounded"
import type { AddPropertyInput } from "@/lib/services/property-dashboard-service"

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""
const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete"
const IPFS_RE = /^(ipfs:\/\/.+|https?:\/\/.+|data:.+)$/

/** Convert WGS84 degrees → Web Mercator meters */
function toMercator(latDeg: number, lngDeg: number) {
  const x = Math.round((lngDeg * 20037508.34) / 180)
  const y = Math.round(
    (Math.log(Math.tan(((90 + latDeg) * Math.PI) / 360)) / Math.PI) * 20037508.34
  )
  return { x, y }
}

interface PlaceOption {
  placeId: string
  label: string
}

interface CoordResult {
  description: string
  latMercator: number
  lngMercator: number
}

interface AddPropertyDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: AddPropertyInput) => void
}

export function AddPropertyDialog({ open, onClose, onSubmit }: AddPropertyDialogProps) {
  const [name, setName] = useState("")
  const [tokenURI, setTokenURI] = useState("")

  const [options, setOptions] = useState<PlaceOption[]>([])
  const [inputValue, setInputValue] = useState("")
  const [selectedCoords, setSelectedCoords] = useState<CoordResult | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(false)

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const detailsAbortRef = useRef<AbortController | null>(null)
  const [touched, setTouched] = useState(false)

  // ── Places API (New) – Autocomplete ──────────────────────────────────────
  const fetchOptions = useCallback(async (input: string) => {
    if (input.trim().length < 3) {
      setOptions([])
      return
    }
    setLoadingOptions(true)
    try {
      const res = await fetch(AUTOCOMPLETE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask":
            "suggestions.placePrediction.placeId,suggestions.placePrediction.text",
        },
        body: JSON.stringify({ input, languageCode: "es" }),
      })
      const data = await res.json()
      const suggestions: PlaceOption[] = (data.suggestions ?? []).map((s: any) => ({
        placeId: s.placePrediction.placeId,
        label: s.placePrediction.text.text,
      }))
      setOptions(suggestions)
    } catch (e) {
      console.error("Places autocomplete error", e)
      setOptions([])
    } finally {
      setLoadingOptions(false)
    }
  }, [])

  function handleInputChange(_: React.SyntheticEvent, value: string) {
    setInputValue(value)
    // Cancel any in-flight place-details request so stale coords never land
    if (detailsAbortRef.current) {
      detailsAbortRef.current.abort()
      detailsAbortRef.current = null
    }
    setSelectedCoords(null)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => fetchOptions(value), 300)
  }

  // ── Places API (New) – Place Details ─────────────────────────────────────
  async function handleChange(_: React.SyntheticEvent, option: PlaceOption | null) {
    if (!option) {
      setSelectedCoords(null)
      return
    }
    // Abort any previous in-flight details request
    if (detailsAbortRef.current) detailsAbortRef.current.abort()
    const controller = new AbortController()
    detailsAbortRef.current = controller
    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${option.placeId}`,
        {
          signal: controller.signal,
          headers: {
            "X-Goog-Api-Key": API_KEY,
            "X-Goog-FieldMask": "location",
          },
        }
      )
      const data = await res.json()
      const lat: number = data.location?.latitude
      const lng: number = data.location?.longitude
      if (lat !== undefined && lng !== undefined) {
        const { x, y } = toMercator(lat, lng)
        setSelectedCoords({ description: option.label, latMercator: y, lngMercator: x })
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error("Place details error", e)
    } finally {
      if (detailsAbortRef.current === controller) detailsAbortRef.current = null
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const nameValid = name.trim().length > 1
  const uriValid = IPFS_RE.test(tokenURI.trim())
  const locationValid = selectedCoords !== null
  const valid = nameValid && uriValid && locationValid

  function reset() {
    setName("")
    setTokenURI("")
    setInputValue("")
    setOptions([])
    setSelectedCoords(null)
    setTouched(false)
  }

  function submit() {
    setTouched(true)
    if (!valid || !selectedCoords) return
    onSubmit({
      name: name.trim(),
      tokenURI: tokenURI.trim(),
      latitude: selectedCoords.latMercator,
      longitude: selectedCoords.lngMercator,
    })
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 0.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 3,
            bgcolor: "primaryContainer.main",
            color: "primaryContainer.contrastText",
            display: "grid",
            placeItems: "center",
          }}
        >
          <TokenRoundedIcon />
        </Box>
        Registrar propiedad on-chain
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Se minteará un PropertyNFT a tu wallet. Los metadatos deben estar publicados en IPFS.
        </Typography>

        <Stack spacing={0}>
          {/* Name */}
          <TextField
            label="Nombre de la propiedad"
            placeholder="Ej: Depto Palermo, Local Centro…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={touched && !nameValid}
            helperText={touched && !nameValid ? "Ingresá un nombre de al menos 2 caracteres" : " "}
            fullWidth
          />

          {/* Token URI */}
          <TextField
            label="Token URI (IPFS)"
            placeholder="ipfs://Qm..."
            value={tokenURI}
            onChange={(e) => setTokenURI(e.target.value)}
            error={touched && !uriValid}
            helperText={
              touched && !uriValid
                ? "Debe ser ipfs://…, https://… o data:…"
                : "URI de los metadatos JSON en IPFS"
            }
            fullWidth
            slotProps={{ htmlInput: { style: { fontFamily: "monospace", fontSize: "0.85em" } } }}
          />

          {/* Location — MUI Autocomplete renders the listbox via Popper (portal),
              so it floats outside the dialog and never causes inner scroll */}
          <Autocomplete<PlaceOption>
            sx={{ mt: 2 }}
            options={options}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onChange={handleChange}
            filterOptions={(x) => x}
            loading={loadingOptions}
            noOptionsText={
              inputValue.length < 3
                ? "Escribí al menos 3 caracteres…"
                : "Sin resultados"
            }
            isOptionEqualToValue={(a, b) => a.placeId === b.placeId}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Ubicación"
                placeholder="Buscá la dirección de la propiedad…"
                error={touched && !locationValid}
                helperText={
                  touched && !locationValid
                    ? "Seleccioná una ubicación de la lista"
                    : "Buscá con Google Places"
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                {...({
                  InputProps: {
                    ...(params as any).InputProps,
                    startAdornment: (
                      <RoomRoundedIcon
                        fontSize="small"
                        color={selectedCoords ? "success" : "action"}
                        sx={{ mr: 1 }}
                      />
                    ),
                    endAdornment: (
                      <>
                        {loadingOptions ? <CircularProgress size={16} /> : null}
                        {(params as any).InputProps?.endAdornment}
                      </>
                    ),
                  },
                } as any)}
              />
            )}
          />


        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={submit} disabled={!valid}>
          Crear propiedad
        </Button>
      </DialogActions>
    </Dialog>
  )
}
