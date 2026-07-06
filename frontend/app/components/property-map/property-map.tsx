import { useMemo } from "react"
import { GoogleMap, useJsApiLoader, MarkerF } from "@react-google-maps/api"
import { Box, CircularProgress, useTheme } from "@mui/material"
import type { Listing } from "@/models/types"
import { MAP_CENTER } from "@stores/search-store"

const MAP_STYLE_LIGHT = [
  { elementType: "geometry", stylers: [{ color: "#f6fbf3" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#414941" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#bfe9f8" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#d2e8d4" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
]

const MAP_STYLE_DARK = [
  { elementType: "geometry", stylers: [{ color: "#191c19" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#111411" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#e1e3dd" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#224d58" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#384b3c" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#272b27" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8b938a" }] },
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
]

export function PropertyMap({
  listings,
  selectedId,
  onSelect,
}: {
  listings: Listing[]
  selectedId: string | null
  onSelect: (l: Listing) => void
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyFakeKeyPlaceholder"
  const theme = useTheme()

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
  })

  const pinIcon = useMemo(() => {
    if (!isLoaded || typeof window === "undefined") return undefined
    return (selected: boolean) => ({
      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
      fillColor: selected ? "#006d3b" : "#3b6470",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
      scale: selected ? 2.1 : 1.7,
      anchor: new window.google.maps.Point(12, 22),
    })
  }, [isLoaded])

  const centerGPS = useMemo(() => {
    const isMercator = Math.abs(MAP_CENTER.lat) > 180 || Math.abs(MAP_CENTER.lng) > 180;
    if (isMercator) {
      const x = MAP_CENTER.lng;
      const y = MAP_CENTER.lat;
      const lngGPS = (x / 20037508.34) * 180;
      const latGPS = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360) / Math.PI - 90;
      return { lat: latGPS, lng: lngGPS };
    }
    return MAP_CENTER;
  }, []);

  if (!isLoaded) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", height: "100%" }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={centerGPS}
      zoom={12}
      options={{
        styles: theme.palette.mode === "dark" ? MAP_STYLE_DARK : MAP_STYLE_LIGHT,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
      }}
    >
      {listings.map((l) => {
        const isMercator = Math.abs(l.lat) > 180 || Math.abs(l.lng) > 180;
        let latGPS = l.lat;
        let lngGPS = l.lng;
        if (isMercator) {
          const x = l.lng;
          const y = l.lat;
          lngGPS = (x / 20037508.34) * 180;
          latGPS = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360) / Math.PI - 90;
        }

        return (
          <MarkerF
            key={l.id}
            position={{ lat: latGPS, lng: lngGPS }}
            icon={pinIcon ? pinIcon(l.id === selectedId) : undefined}
            onClick={() => onSelect(l)}
            title={l.name}
          />
        );
      })}
    </GoogleMap>
  )
}
