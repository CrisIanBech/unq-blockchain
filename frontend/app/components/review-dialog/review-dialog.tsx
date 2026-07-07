import { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Rating,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material"
import StarRoundedIcon from "@mui/icons-material/StarRounded"
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded"
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded"
import { ReviewsService } from "@/lib/services/reviews-service"
import { useUserStore } from "@/stores/user-store"

interface ReviewDialogProps {
  open: boolean
  onClose: () => void
  propertyId: number
  propertyName: string
  onReviewSubmitted?: () => void
}

type DialogState = "loading" | "can-review" | "already-reviewed" | "submitted" | "error"

const MAX_CHARS = 280

export function ReviewDialog({ open, propertyId, propertyName, onClose, onReviewSubmitted }: ReviewDialogProps) {
  const wallet = useUserStore((s) => s.wallet)

  const [dialogState, setDialogState] = useState<DialogState>("loading")
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // Check canPostReview whenever dialog opens
  useEffect(() => {
    if (!open) return
    setDialogState("loading")
    setRating(null)
    setComment("")
    setErrorMsg("")

    if (!wallet) {
      setDialogState("error")
      setErrorMsg("Necesitás conectar tu wallet para dejar una reseña.")
      return
    }

    ReviewsService.canPostReview(propertyId, wallet)
      .then((can) => setDialogState(can ? "can-review" : "already-reviewed"))
      .catch(() => {
        setDialogState("error")
        setErrorMsg("No se pudo verificar si podés dejar una reseña. Intentá de nuevo.")
      })
  }, [open, propertyId, wallet])

  async function handleSubmit() {
    if (!rating) return
    setIsSubmitting(true)
    setErrorMsg("")
    try {
      await ReviewsService.postReview(propertyId, rating, comment.trim() || "Sin comentario.")
      setDialogState("submitted")
      onReviewSubmitted?.()
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Error al publicar la reseña.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleClose() {
    if (isSubmitting) return
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: 4, p: 0.5 },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
        Dejar reseña
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {propertyName}
        </Typography>

        {/* Loading */}
        {dialogState === "loading" && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={36} />
          </Box>
        )}

        {/* Already reviewed */}
        {dialogState === "already-reviewed" && (
          <Alert severity="info" icon={<CheckCircleRoundedIcon />} sx={{ borderRadius: 2 }}>
            Ya dejaste una reseña para esta propiedad en este contrato.
          </Alert>
        )}

        {/* Success */}
        {dialogState === "submitted" && (
          <Alert severity="success" icon={<CheckCircleRoundedIcon />} sx={{ borderRadius: 2 }}>
            ¡Reseña publicada on-chain correctamente!
          </Alert>
        )}

        {/* Error */}
        {dialogState === "error" && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {errorMsg}
          </Alert>
        )}

        {/* Review form */}
        {dialogState === "can-review" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Calificación *
              </Typography>
              <Rating
                value={rating}
                onChange={(_, val) => setRating(val)}
                size="large"
                icon={<StarRoundedIcon fontSize="inherit" />}
                emptyIcon={<StarBorderRoundedIcon fontSize="inherit" />}
              />
            </Box>

            <TextField
              label="Comentario (opcional)"
              multiline
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, MAX_CHARS))}
              helperText={`${comment.length}/${MAX_CHARS}`}
              slotProps={{ htmlInput: { maxLength: MAX_CHARS } }}
              fullWidth
            />

            {errorMsg && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {errorMsg}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={handleClose} disabled={isSubmitting} color="inherit">
          {dialogState === "submitted" ? "Cerrar" : "Cancelar"}
        </Button>

        {dialogState === "can-review" && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!rating || isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {isSubmitting ? "Publicando…" : "Publicar reseña"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
