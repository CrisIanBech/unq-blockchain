import { Avatar, Box, Rating, Typography } from "@mui/material"
import { dateLabel } from "@/lib/format"
import type { Review } from "@models/types"

interface ReviewItemProps {
  review: Review
}

export function ReviewItem({ review }: ReviewItemProps) {
  return (
    <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "surfaceContainer.main" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <Avatar sx={{ width: 28, height: 28, bgcolor: "secondaryContainer.main", color: "secondaryContainer.contrastText", fontSize: 12 }}>
          {review.author.slice(2, 4)}
        </Avatar>
        <Typography variant="caption" sx={{ fontFamily: "monospace", flex: 1 }}>
          {review.author}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {dateLabel(review.date)}
        </Typography>
      </Box>
      <Rating value={review.rating} readOnly size="small" />
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {review.comment}
      </Typography>
    </Box>
  )
}
