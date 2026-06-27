import {
  Box,
  TextField,
  InputAdornment,
  Button,
  Tooltip,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import SearchRoundedIcon from "@mui/icons-material/SearchRounded"
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded"
import { PropertyMap } from "@components/property-map/property-map"
import { ListingDetail } from "@components/listing-detail/listing-detail"
import type { UseSearchPageReturn } from "@hooks/use-search-page"
import { CategorySelector } from "./category-selector"
import { ResultsList } from "./results-list"

export function SearchScreen({
  query,
  cat,
  selected,
  listOpen,
  filtered,
  liveSelected,
  onSetQuery,
  onSetCat,
  onSelect,
  onToggleList,
  onLeaveReview,
  onRequestContract,
  rating,
  comment,
  onSetRating,
  onSetComment,
}: UseSearchPageReturn) {
  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* Top floating controls */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          zIndex: 100,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1.5,
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <Box sx={{ pointerEvents: "auto", width: { xs: "100%", sm: 360 } }}>
          <TextField
            value={query}
            onChange={(e) => onSetQuery(e.target.value)}
            placeholder="Buscar por nombre o zona…"
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 999,
                bgcolor: "secondaryContainer.main",
                boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                border: 0,
                transition: "background-color 0.2s ease-in-out",
                "& fieldset": { border: 0 },
                "&:hover": {
                  bgcolor: "primaryContainer.main",
                },
                "&.Mui-focused": {
                  bgcolor: "primaryContainer.main",
                  filter: "brightness(0.93)",
                },
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        <Box
          sx={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            maxWidth: "100%",
          }}
        >
          <CategorySelector cat={cat} onSetCat={onSetCat} />
        </Box>

        {!listOpen && (
          <Box sx={{ pointerEvents: "auto", ml: { sm: "auto" }, width: { xs: "100%", sm: "auto" } }}>
            <Tooltip title="Mostrar listado">
              <Button
                variant="contained"
                startIcon={<ViewListRoundedIcon />}
                onClick={() => onToggleList(true)}
                sx={{
                  borderRadius: 999,
                  boxShadow: 3,
                  px: 2.5,
                  py: 1.25,
                  width: { xs: "100%", sm: "auto" },
                  whiteSpace: "nowrap",
                }}
              >
                {filtered.length} resultados
              </Button>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Map (occupies 100% of container) */}
      <Box sx={{ width: "100%", height: "100%" }}>
        <PropertyMap listings={filtered} selectedId={liveSelected?.id ?? null} onSelect={onSelect} />
      </Box>

      {/* Floating Results List Panel (Right side) */}
      {listOpen && (
        <Box
          sx={{
            position: "absolute",
            top: 16, // Starts from the same vertical alignment as the top controls bar
            right: 16,
            bottom: 16,
            width: { xs: "calc(100% - 32px)", sm: 380 },
            zIndex: 100,
            bgcolor: "background.paper",
            borderRadius: "24px", // Fixed: Use explicit 24px instead of theme-multiplied 6 (which was 6 * 16px = 96px!)
            boxShadow: 4,
            p: 2.5,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <ResultsList
            filtered={filtered}
            liveSelected={liveSelected}
            onSelect={onSelect}
            onToggleList={onToggleList}
          />
        </Box>
      )}

      {/* Detail view */}
      <ListingDetail
        listing={liveSelected}
        onClose={() => onSelect(null)}
        onLeaveReview={onLeaveReview}
        onRequestContract={onRequestContract}
        rating={rating}
        comment={comment}
        onRatingChange={onSetRating}
        onCommentChange={onSetComment}
      />
    </Box>
  )
}
