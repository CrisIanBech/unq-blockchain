import { useState, useRef, useCallback } from "react"
import { usePropertiesStore } from "@/stores/properties-store"

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""
const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete"
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
const IPFS_RE = /^(ipfs:\/\/.+|https?:\/\/.+|data:.+)$/

export interface PlaceOption {
  placeId: string
  label: string
}

export interface CoordResult {
  description: string
  latMercator: number
  lngMercator: number
}

/** Convert WGS84 degrees → Web Mercator meters */
function toMercator(latDeg: number, lngDeg: number) {
  const x = Math.round((lngDeg * 20037508.34) / 180)
  const y = Math.round(
    (Math.log(Math.tan(((90 + latDeg) * Math.PI) / 360)) / Math.PI) * 20037508.34
  )
  return { x, y }
}

export function useCreateProperty(onClose: () => void) {
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

  const uriValid = IPFS_RE.test(tokenURI.trim())
  const manualValid = nameValid && uriValid && locationValid

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
      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append("name", name.trim())
        formData.append("type", propertyType)
        formData.append("address", selectedCoords.description)
        formData.append("surface", surface)
        formData.append("rooms", rooms)
        formData.append("bathrooms", bathrooms)
        formData.append("pets", String(pets))
        formData.append("garage", String(garage))
        formData.append("contact", contact.trim())
        
        selectedFiles.forEach((file) => {
          formData.append("files", file)
        })

        const response = await fetch(`${BACKEND_URL}/properties/metadata`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Error al subir metadata al backend")
        }

        const data = await response.json()
        const resolvedTokenURI = data.tokenURI

        usePropertiesStore.getState().mintAndLoadProperty({
          name: name.trim(),
          tokenURI: resolvedTokenURI,
          latitude: selectedCoords.latMercator,
          longitude: selectedCoords.lngMercator,
        })

        reset()
        onClose()
      } catch (err) {
        console.error("Failed to upload metadata to IPFS via backend:", err)
        setIsUploading(false)
      }
    } else {
      usePropertiesStore.getState().mintAndLoadProperty({
        name: name.trim(),
        tokenURI: tokenURI.trim(),
        latitude: selectedCoords.latMercator,
        longitude: selectedCoords.lngMercator,
      })
      reset()
      onClose()
    }
  }

  return {
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
  }
}
