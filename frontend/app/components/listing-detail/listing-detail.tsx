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
  Stack,
  CircularProgress,
} from "@mui/material"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import BedRoundedIcon from "@mui/icons-material/BedRounded"
import BathtubRoundedIcon from "@mui/icons-material/BathtubRounded"
import SquareFootRoundedIcon from "@mui/icons-material/SquareFootRounded"
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded"
import PetsRoundedIcon from "@mui/icons-material/PetsRounded"
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded"
import type { Listing, Review } from "@/models/types"
import { TYPE_LABEL, resolveIpfsUrl } from "@/lib/format"
import { ReviewItem } from "./review-item"
import { useUserStore } from "@/stores/user-store"
import { useReviewSystem } from "@/hooks/use-review-system"
import { useState, useEffect } from "react"

function avgRating(reviews: Review[]) {
  if (!reviews.length) return 0
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
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
  const wallet = useUserStore((s) => s.wallet)
  const isConnected = wallet !== "0x7A3f...91Cd"
  const numericId = listing?.id ? parseInt(listing.id.replace(/\D/g, ""), 10) : 0
  const onChainPropertyId = numericId > 0 ? numericId : 0
  const onChain = useReviewSystem(onChainPropertyId)

  const [onChainReviews, setOnChainReviews] = useState<Review[]>([])
  const [activeImg, setActiveImg] = useState<string | null>(null)

  useEffect(() => {
    if (listing) {
      setActiveImg(listing.imageUrl)
    } else {
      setActiveImg(null)
    }
  }, [listing])

  useEffect(() => {
    if (!isConnected || !onChain.reviews.length) {
      setOnChainReviews([])
      return
    }
    const mapped: Review[] = onChain.reviews.map((r, i) => ({
      id: `ocr-${i}`,
      author: r.author,
      rating: r.rating,
      comment: r.comment,
      date: new Date(Number(r.timestamp) * 1000).toISOString().slice(0, 10),
    }))
    setOnChainReviews(mapped)
  }, [isConnected, onChain.reviews])

  const displayReviews = isConnected ? onChainReviews : (listing?.reviews ?? [])
  const avg = avgRating(displayReviews)

  function submitReview() {
    if (!listing || !rating || comment.trim().length < 3) return
    if (isConnected) {
      onChain.postReview(rating, comment.trim())
    } else {
      onLeaveReview(listing.id, rating, comment.trim())
    }
  }

  const isSubmitting = onChain.isWriting || onChain.isConfirming

  return (
    <Drawer
      anchor="right"
      open={Boolean(listing)}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 440 }, bgcolor: "background.default" } } }}
    >
      <Box sx={{ position: "relative" }}>
        <Box component="img" src={activeImg || ""} alt={listing?.name} sx={{ width: "100%", height: 220, objectFit: "cover" }} />
        <IconButton
          onClick={onClose}
          aria-label="cerrar"
          sx={{ position: "absolute", top: 12, right: 12, bgcolor: "background.default", "&:hover": { bgcolor: "surfaceContainer.high" } }}
        >
          <CloseRoundedIcon />
        </IconButton>
        {listing && <Chip label={TYPE_LABEL[listing.type]} sx={{ position: "absolute", top: 12, left: 12, bgcolor: "background.default", fontWeight: 600 }} />}
      </Box>

      {listing && listing.images && listing.images.length > 1 && (
        <Stack direction="row" spacing={1} sx={{ px: 3, pt: 2, overflowX: "auto", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
          {listing.images.map((imgUri, index) => {
            const httpUrl = resolveIpfsUrl(imgUri);
            const isSelected = activeImg === httpUrl;
            return (
              <Box
                key={index}
                component="img"
                src={httpUrl}
                onClick={() => setActiveImg(httpUrl)}
                sx={{
                  width: 60,
                  height: 45,
                  borderRadius: 1,
                  objectFit: "cover",
                  cursor: "pointer",
                  border: "2px solid",
                  borderColor: isSelected ? "primary.main" : "divider",
                  opacity: isSelected ? 1 : 0.7,
                  transition: "all 0.2s",
                  "&:hover": { opacity: 1, borderColor: "primary.light" }
                }}
              />
            );
          })}
        </Stack>
      )}

      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {listing?.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {listing?.address}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5 }}>
          <Rating value={avg} precision={0.5} readOnly size="small" />
          <Typography variant="body2" color="text.secondary">
            {avg ? avg.toFixed(1) : "Sin reviews"} {displayReviews.length ? `(${displayReviews.length})` : ""}
          </Typography>
          {isConnected && <Chip label="on-chain" size="small" color="primary" variant="outlined" />}
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, mt: 2, flexWrap: "wrap" }}>
          {listing && listing.beds > 0 && (
            <Chip icon={<BedRoundedIcon />} label={`${listing.beds} amb.`} variant="outlined" />
          )}
          {listing && (
            <>
              <Chip icon={<BathtubRoundedIcon />} label={`${listing.baths} baño${listing.baths > 1 ? "s" : ""}`} variant="outlined" />
              <Chip icon={<SquareFootRoundedIcon />} label={`${listing.m2} m²`} variant="outlined" />
              <Chip
                icon={<PetsRoundedIcon />}
                label={listing.pets ? "Acepta mascotas" : "No permite mascotas"}
                color={listing.pets ? "success" : "default"}
                variant="outlined"
              />
              <Chip
                icon={<DirectionsCarRoundedIcon />}
                label={listing.garage ? "Cochera disponible" : "Sin cochera"}
                color={listing.garage ? "success" : "default"}
                variant="outlined"
              />
            </>
          )}
        </Box>

        <Button 
          variant="contained" 
          fullWidth 
          size="large" 
          sx={{ mt: 3 }}
          onClick={() => listing && onRequestContract?.(listing)}
        >
          Solicitar contrato on-chain
        </Button>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Reviews
        </Typography>
        <Stack spacing={1.5}>
          {displayReviews.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Todavía no hay reviews para esta propiedad.
            </Typography>
          )}
          {displayReviews.map((r) => (
            <ReviewItem review={r} key={r.id} />
          ))}
        </Stack>

        {isConnected && !onChain.canPostReview && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 3 }}>
            Solo inquilinos con contrato activo pueden dejar review
          </Typography>
        )}
        {(!isConnected || onChain.canPostReview) && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle1" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, fontWeight: 700 }}>
              <RateReviewRoundedIcon fontSize="small" /> Dejar una review
            </Typography>
            {!isConnected && (
              <Typography variant="caption" color="warning.main" sx={{ display: "block", mb: 1 }}>
                Conectá tu wallet para publicar reviews on-chain
              </Typography>
            )}
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
              disabled={!rating || comment.trim().length < 3 || isSubmitting}
              onClick={submitReview}
            >
              {isSubmitting ? <CircularProgress size={20} /> : "Publicar review"}
            </Button>
            {onChain.isConfirmed && (
              <Typography variant="caption" color="success.main" sx={{ mt: 1, display: "block" }}>
                Review confirmada on-chain
              </Typography>
            )}
            {onChain.writeError && (
              <Typography variant="caption" color="error.main" sx={{ mt: 1, display: "block" }}>
                Error: {(onChain.writeError as Error).message.slice(0, 100)}
              </Typography>
            )}
          </>
        )}
      </Box>
    </Drawer>
  )
}
