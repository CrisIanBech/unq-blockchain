import { useState } from "react"
import {
  Drawer,
  Box,
  Typography,
  Chip,
  Rating,
  Divider,
  TextField,
  Button,
  IconButton,
  Avatar,
  Stack,
} from "@mui/material"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import BedRoundedIcon from "@mui/icons-material/BedRounded"
import BathtubRoundedIcon from "@mui/icons-material/BathtubRounded"
import SquareFootRoundedIcon from "@mui/icons-material/SquareFootRounded"
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded"
import type { Listing } from "@/models/types"
import { usdc, dateLabel, TYPE_LABEL } from "@/lib/format"
import { ReviewItem } from "./review-item"

function avgRating(listing: Listing) {
  if (!listing.reviews.length) return 0
  return listing.reviews.reduce((s, r) => s + r.rating, 0) / listing.reviews.length
}

interface ListingDetailProps {
  listing: Listing | null
  onClose: () => void
  onLeaveReview: (listingId: string, rating: number, comment: string) => void
  onRequestContract?: (listing: Listing) => void
  rating: number | null
  comment: string
  onRatingChange: (rating: number | null) => void
  onCommentChange: (comment: string) => void
}

export function ListingDetail({
  listing,
  onClose,
  onLeaveReview,
  onRequestContract,
  rating,
  comment,
  onRatingChange,
  onCommentChange,
}: ListingDetailProps) {
  if (!listing) return null
  const avg = avgRating(listing)

  function submitReview() {
    if (!listing || !rating || comment.trim().length < 3) return
    onLeaveReview(listing.id, rating, comment.trim())
  }

  return (
    <Drawer
      anchor="right"
      open={Boolean(listing)}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 440 }, bgcolor: "background.default" } } }}
    >
      <Box sx={{ position: "relative" }}>
        <Box component="img" src={listing.imageUrl} alt={listing.name} sx={{ width: "100%", height: 220, objectFit: "cover" }} />
        <IconButton
          onClick={onClose}
          aria-label="cerrar"
          sx={{ position: "absolute", top: 12, right: 12, bgcolor: "background.default", "&:hover": { bgcolor: "surfaceContainer.high" } }}
        >
          <CloseRoundedIcon />
        </IconButton>
        <Chip label={TYPE_LABEL[listing.type]} sx={{ position: "absolute", top: 12, left: 12, bgcolor: "background.default", fontWeight: 600 }} />
      </Box>

      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {listing.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {listing.address}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5 }}>
          <Rating value={avg} precision={0.5} readOnly size="small" />
          <Typography variant="body2" color="text.secondary">
            {avg ? avg.toFixed(1) : "Sin reviews"} {listing.reviews.length ? `(${listing.reviews.length})` : ""}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
          {listing.beds > 0 && (
            <Chip icon={<BedRoundedIcon />} label={`${listing.beds} amb.`} variant="outlined" />
          )}
          <Chip icon={<BathtubRoundedIcon />} label={`${listing.baths} baño${listing.baths > 1 ? "s" : ""}`} variant="outlined" />
          <Chip icon={<SquareFootRoundedIcon />} label={`${listing.m2} m²`} variant="outlined" />
        </Box>

        <Box
          sx={{
            mt: 2.5,
            p: 2,
            borderRadius: 4,
            bgcolor: "primaryContainer.main",
            color: "primaryContainer.contrastText",
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="body2">Alquiler mensual</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {usdc(listing.monthlyRent)}
          </Typography>
        </Box>

        <Button 
          variant="contained" 
          fullWidth 
          size="large" 
          sx={{ mt: 2 }}
          onClick={() => onRequestContract?.(listing)}
        >
          Solicitar contrato on-chain
        </Button>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Reviews
        </Typography>
        <Stack spacing={1.5}>
          {listing.reviews.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Todavía no hay reviews para esta propiedad.
            </Typography>
          )}
          {listing.reviews.map((r) => (
            <ReviewItem review={r} key={r.id} />
          ))}
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, fontWeight: 700 }}>
          <RateReviewRoundedIcon fontSize="small" /> Dejar una review
        </Typography>
        <Rating value={rating} onChange={(_, v) => onRatingChange(v)} sx={{ mb: 1 }} />
        <TextField
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="Contá tu experiencia como inquilino…"
          multiline
          rows={3}
          fullWidth
        />
        <Button
          variant="outlined"
          fullWidth
          sx={{ mt: 1.5 }}
          disabled={!rating || comment.trim().length < 3}
          onClick={submitReview}
        >
          Publicar review
        </Button>
      </Box>
    </Drawer>
  )
}
