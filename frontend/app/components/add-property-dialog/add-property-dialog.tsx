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
  Chip,
} from "@mui/material"
import TokenRoundedIcon from "@mui/icons-material/TokenRounded"
import RoomRoundedIcon from "@mui/icons-material/RoomRounded"
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded"
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded"
import InsertPhotoRoundedIcon from "@mui/icons-material/InsertPhotoRounded"
import { useCreateProperty, PlaceOption } from "./use-create-property"

const PROPERTY_TYPES = [
  { value: "departamento", label: "Departamento" },
  { value: "casa", label: "Casa" },
  { value: "ph", label: "PH" },
  { value: "local", label: "Local" },
  { value: "oficina", label: "Oficina" },
] as const

interface AddPropertyDialogProps {
  open: boolean
  onClose: () => void
}

export function AddPropertyDialog({ open, onClose }: AddPropertyDialogProps) {
  const {
    tabIndex,
    setTabIndex,
    name,
    setName,
    touched,
    setTouched,
    options,
    inputValue,
    selectedCoords,
    loadingOptions,
    tokenURI,
    setTokenURI,
    propertyType,
    setPropertyType,
    surface,
    setSurface,
    rooms,
    setRooms,
    bathrooms,
    setBathrooms,
    pets,
    setPets,
    garage,
    setGarage,
    contact,
    setContact,
    selectedFiles,
    isUploading,
    fileInputRef,
    handleInputChange,
    handleChange,
    handleFileSelect,
    removeFile,
    nameValid,
    locationValid,
    surfaceValid,
    roomsValid,
    bathroomsValid,
    uriValid,
    submit,
    valid,
  } = useCreateProperty(onClose)

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
