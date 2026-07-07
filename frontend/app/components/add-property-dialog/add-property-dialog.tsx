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
  Tabs,
  Tab,
  MenuItem,
  FormControlLabel,
  Switch,
  IconButton,
  Chip,
} from "@mui/material"
import TokenRoundedIcon from "@mui/icons-material/TokenRounded"
import RoomRoundedIcon from "@mui/icons-material/RoomRounded"
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded"
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded"
import InsertPhotoRoundedIcon from "@mui/icons-material/InsertPhotoRounded"
import type { AddPropertyInput } from "@/lib/services/property-dashboard-service"
import { PropertyDashboardService } from "@/lib/services/property-dashboard-service"

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""
const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete"
const IPFS_RE = /^(ipfs:\/\/.+|https?:\/\/.+|data:.+)$/

const PROPERTY_TYPES = [
  { value: "departamento", label: "Departamento" },
  { value: "casa", label: "Casa" },
  { value: "ph", label: "PH" },
  { value: "local", label: "Local" },
  { value: "oficina", label: "Oficina" },
] as const

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

const dashboardService = new PropertyDashboardService()

export function AddPropertyDialog({ open, onClose, onSubmit }: AddPropertyDialogProps) {
  // ── Tab mode ──────────────────────────────────────────────────────────────
  const [tabIndex, setTabIndex] = useState(0)

  // ── Common fields ─────────────────────────────────────────────────────────
  const [name, setName] = useState("")
  const [touched, setTouched] = useState(false)

  // ── Location (shared by both tabs) ────────────────────────────────────────
  const [options, setOptions] = useState<PlaceOption[]>([])
  const [inputValue, setInputValue] = useState("")
  const [selectedCoords, setSelectedCoords] = useState<CoordResult | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const detailsAbortRef = useRef<AbortController | null>(null)

  // ── Manual URI tab ────────────────────────────────────────────────────────
  const [tokenURI, setTokenURI] = useState("")

  // ── Upload metadata tab ───────────────────────────────────────────────────
  const [propertyType, setPropertyType] = useState("departamento")
  const [surface, setSurface] = useState("")
  const [rooms, setRooms] = useState("")
  const [bathrooms, setBathrooms] = useState("")
  const [pets, setPets] = useState(false)
  const [garage, setGarage] = useState(false)
  const [contact, setContact] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // ── File handling ─────────────────────────────────────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setSelectedFiles((prev) => [...prev, ...files])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const nameValid = name.trim().length > 1
  const locationValid = selectedCoords !== null

  // Manual tab validation
  const uriValid = IPFS_RE.test(tokenURI.trim())
  const manualValid = nameValid && uriValid && locationValid

  // Upload tab validation
  const surfaceValid = Number(surface) > 0 && !isNaN(Number(surface))
  const roomsValid = Number(rooms) > 0 && Number.isInteger(Number(rooms))
  const bathroomsValid = bathrooms !== "" && Number(bathrooms) >= 0 && Number.isInteger(Number(bathrooms))
  const uploadValid = nameValid && locationValid && surfaceValid && roomsValid && bathroomsValid

  const valid = tabIndex === 0 ? uploadValid : manualValid

  function reset() {
    setName("")
    setTokenURI("")
    setInputValue("")
    setOptions([])
    setSelectedCoords(null)
    setTouched(false)
    setPropertyType("departamento")
    setSurface("")
    setRooms("")
    setBathrooms("")
    setPets(false)
    setGarage(false)
    setContact("")
    setSelectedFiles([])
    setIsUploading(false)
  }

  async function submit() {
    setTouched(true)
    if (!valid || !selectedCoords) return

    if (tabIndex === 0) {
      // Upload metadata to IPFS via backend, then mint
      setIsUploading(true)
      try {
        const resolvedTokenURI = await dashboardService.preparePropertyMetadata({
          name: name.trim(),
          type: propertyType,
          address: selectedCoords.description,
          surface: Number(surface),
          rooms: Number(rooms),
          bathrooms: Number(bathrooms),
          pets,
          garage,
          contact: contact.trim(),
          images: selectedFiles,
        })
        onSubmit({
          name: name.trim(),
          tokenURI: resolvedTokenURI,
          latitude: selectedCoords.latMercator,
          longitude: selectedCoords.lngMercator,
        })
        reset()
        onClose()
      } catch (err) {
        console.error("Failed to upload metadata to IPFS:", err)
        setIsUploading(false)
      }
    } else {
      // Manual URI mode — existing behavior
      onSubmit({
        name: name.trim(),
        tokenURI: tokenURI.trim(),
        latitude: selectedCoords.latMercator,
        longitude: selectedCoords.lngMercator,
      })
      reset()
      onClose()
    }
  }

  // ── Location Autocomplete (shared between both tabs) ──────────────────────
  const locationAutocomplete = (
    <Autocomplete<PlaceOption>
      sx={{ mt: 1 }}
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
  )

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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Se minteará un PropertyNFT a tu wallet. Podés subir la metadata vía IPFS o pegar una URI existente.
        </Typography>

        <Tabs
          value={tabIndex}
          onChange={(_, v) => { setTabIndex(v); setTouched(false) }}
          sx={{ mb: 2, minHeight: 36 }}
          variant="fullWidth"
        >
          <Tab
            icon={<CloudUploadRoundedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Subir metadata"
            sx={{ minHeight: 36, textTransform: "none" }}
          />
          <Tab
            icon={<TokenRoundedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="URI manual"
            sx={{ minHeight: 36, textTransform: "none" }}
          />
        </Tabs>

        <Stack spacing={0}>
          {/* Name — shared */}
          <TextField
            label="Nombre de la propiedad"
            placeholder="Ej: Depto Palermo, Local Centro…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={touched && !nameValid}
            helperText={touched && !nameValid ? "Ingresá un nombre de al menos 2 caracteres" : " "}
            fullWidth
          />

          {/* ── Tab 0: Upload metadata ─────────────────────────────────── */}
          {tabIndex === 0 && (
            <>
              <TextField
                select
                label="Tipo de propiedad"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                fullWidth
                helperText=" "
              >
                {PROPERTY_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                ))}
              </TextField>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Superficie (m²)"
                  type="number"
                  value={surface}
                  onChange={(e) => setSurface(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e") e.preventDefault()
                  }}
                  slotProps={{ htmlInput: { min: 1 } }}
                  error={touched && !surfaceValid}
                  helperText={touched && !surfaceValid ? "Requerido y mayor a 0" : " "}
                  fullWidth
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Ambientes"
                  type="number"
                  value={rooms}
                  onChange={(e) => setRooms(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e" || e.key === ".") e.preventDefault()
                  }}
                  slotProps={{ htmlInput: { min: 1 } }}
                  error={touched && !roomsValid}
                  helperText={touched && !roomsValid ? "Requerido (entero mayor a 0)" : " "}
                  fullWidth
                />
                <TextField
                  label="Baños"
                  type="number"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e" || e.key === ".") e.preventDefault()
                  }}
                  slotProps={{ htmlInput: { min: 0 } }}
                  error={touched && !bathroomsValid}
                  helperText={touched && !bathroomsValid ? "Requerido (0 o más)" : " "}
                  fullWidth
                />
              </Stack>

              <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                <FormControlLabel
                  control={<Switch checked={pets} onChange={(_, v) => setPets(v)} size="small" />}
                  label="Acepta mascotas"
                />
                <FormControlLabel
                  control={<Switch checked={garage} onChange={(_, v) => setGarage(v)} size="small" />}
                  label="Cochera"
                />
              </Stack>

              <TextField
                label="Contacto"
                placeholder="Ej: +54 11 1234-5678 · propietario@email.com"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                fullWidth
                helperText="Teléfono, email o WhatsApp para que el interesado te contacte"
              />

              {/* Image upload */}
              <Box>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={handleFileSelect}
                />
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<InsertPhotoRoundedIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ mb: 1 }}
                >
                  Agregar fotos
                </Button>
                {selectedFiles.length > 0 && (
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, mt: 0.5 }}>
                    {selectedFiles.map((file, i) => (
                      <Chip
                        key={i}
                        label={file.name.length > 20 ? file.name.slice(0, 17) + "…" : file.name}
                        size="small"
                        onDelete={() => removeFile(i)}
                        deleteIcon={<DeleteRoundedIcon />}
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            </>
          )}

          {/* ── Tab 1: Manual URI ───────────────────────────────────────── */}
          {tabIndex === 1 && (
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
          )}

          {/* Location — shared */}
          {locationAutocomplete}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={!valid || isUploading}
          startIcon={isUploading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isUploading ? "Subiendo a IPFS…" : "Crear propiedad"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
