import { Box, Card, Chip, IconButton, Rating, Stack, Tooltip, Typography } from "@mui/material"
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded"
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded"
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded"
import { alpha } from "@mui/material/styles"
import { usdc, TYPE_LABEL } from "@/lib/format"
import type { Listing } from "@models/types"

interface ResultsListProps {
  filtered: Listing[]
  liveSelected: Listing | null
  onSelect: (l: Listing | null) => void
  onToggleList: (open: boolean) => void
}

function avg(l: Listing) {
  if (!l.reviews.length) return 0
  return l.reviews.reduce((s, r) => s + r.rating, 0) / l.reviews.length
}

// Private subcomponent for rendering list items as required by AGENTS.md guidelines
interface PropertyCardProps {
  l: Listing
  isSelected: boolean
  onSelect: (l: Listing) => void
}

function PropertyCard({ l, isSelected, onSelect }: PropertyCardProps) {
  return (
    <Card
      onClick={() => onSelect(l)}
      sx={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        minHeight: 135,
        cursor: "pointer",
        overflow: "hidden",
        borderRadius: "12px", // Slightly tighter corners for list item cards
        ...(isSelected && {
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
          boxShadow: 2,
          "&:hover": {
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
            boxShadow: 3,
          },
        }),
      }}
    >
      <Box
        component="img"
        src={l.imageUrl}
        alt={l.name}
        sx={{
          width: "100%",
          height: "100%",
          minHeight: 135,
          objectFit: "cover",
        }}
      />
      <Box sx={{ p: 1.5, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
            <Chip
              size="small"
              label={TYPE_LABEL[l.type]}
              sx={{
                bgcolor: "surfaceContainer.high",
                fontWeight: 600,
                fontSize: "0.75rem",
              }}
            />
          </Box>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, color: "text.primary", mb: 0.25 }}>
            {l.name}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
            <PlaceRoundedIcon sx={{ fontSize: 14 }} />
            <Typography variant="caption" noWrap>
              {l.address}
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", mt: 1 }}>
          <Typography variant="subtitle2" sx={{ color: "primary.main", fontWeight: 700 }}>
            {usdc(l.monthlyRent)}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Rating value={avg(l)} precision={0.5} readOnly size="small" />
            <Typography variant="caption" color="text.secondary">
              ({l.reviews.length})
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Card>
  )
}

export function ResultsList({ filtered, liveSelected, onSelect, onToggleList }: ResultsListProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {filtered.length} {filtered.length === 1 ? "propiedad" : "propiedades"}
        </Typography>
        <Tooltip title="Ocultar listado y agrandar el mapa">
          <IconButton onClick={() => onToggleList(false)} size="small">
            <ChevronRightRoundedIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflowY: "auto",
          px: 0.75, // Add horizontal padding for card shadows
          py: 1, // Add vertical padding to prevent top/bottom card clipping during hover translation
          m: -0.75, // Counteract horizontal margins to align scroll bar
          flex: 1,
        }}
      >
        {filtered.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 8,
              px: 2,
              textAlign: "center",
              gap: 2,
            }}
          >
            <SearchOffRoundedIcon sx={{ fontSize: 64, color: "text.secondary", opacity: 0.6 }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
                Sin resultados
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                No encontramos propiedades. Intenta cambiando las palabras clave o filtros.
              </Typography>
            </Box>
          </Box>
        ) : (
          filtered.map((l) => (
            <PropertyCard
              key={l.id}
              l={l}
              isSelected={liveSelected?.id === l.id}
              onSelect={onSelect}
            />
          ))
        )}
      </Box>
    </Box>
  )
}

