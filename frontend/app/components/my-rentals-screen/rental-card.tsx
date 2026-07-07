import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  ListItemText,
  Menu,
  MenuItem,
  ListItemIcon,
  Rating,
} from "@mui/material"
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded"
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded"
import EventRoundedIcon from "@mui/icons-material/EventRounded"
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded"
import EditDocumentIcon from "@mui/icons-material/EditDocument"
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded"
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded"
import CancelRoundedIcon from "@mui/icons-material/CancelRounded"
import { usdc, dateLabel, TYPE_LABEL } from "@/lib/format"
import {
  getRentalAmountToPay,
  getRentalPeriodStart,
  isRentalTenant,
  hasUserCancelled,
  hasOtherCancelled,
  isRentalPendingSignatures,
  isRentalActive,
  isRentalCancelled,
  isRentalExpired,
  isRentalLate,
  isRentalPaidUp
} from "@/models/rental-utils"
import { PaymentHistoryDrawer } from "./payment-history-drawer"
import { SignAgreementDialog } from "./sign-agreement-dialog"
import { CancelAgreementDialog } from "./cancel-agreement-dialog"
import { ReviewDialog } from "@components/review-dialog/review-dialog"
import { ReviewsService } from "@/lib/services/reviews-service"
import { useUserStore } from "@/stores/user-store"
import type { Rental } from "@models/types"

interface RentalCardProps {
  rental: Rental
  isOpen: boolean
  onSetPayTarget: (r: Rental) => void
  onSignAgreement: (id: string) => Promise<void>
  onCancelAgreement: (id: string) => Promise<void>
  onNavigateToSmartlock: (id: string) => void
  onToggleExpand: (id: string) => void
  onRemoveRental: (id: string) => void
}

export function RentalCard({
  rental,
  isOpen,
  onSetPayTarget,
  onSignAgreement,
  onCancelAgreement,
  onNavigateToSmartlock,
  onToggleExpand,
  onRemoveRental,
}: RentalCardProps) {
  const [signOpen, setSignOpen] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [ratingData, setRatingData] = useState({ average: 0, count: 0 })
  const wallet = useUserStore(s => s.wallet)

  const fetchReviews = () => {
    ReviewsService.getAllReviews(rental.propertyId).then(reviews => {
      if (reviews.length === 0) {
        setRatingData({ average: 0, count: 0 })
      } else {
        const sum = reviews.reduce((acc, r) => acc + Number(r.rating), 0)
        setRatingData({ average: sum / reviews.length, count: reviews.length })
      }
    }).catch(console.error)
  }

  useEffect(() => {
    fetchReviews()
  }, [rental.propertyId])

  const isMine = isRentalTenant(rental, wallet)

  const iHaveCancelled = hasUserCancelled(rental, wallet)
  const otherHasCancelled = hasOtherCancelled(rental, wallet)

  const isPendingSignatures = isRentalPendingSignatures(rental)
  const isActive = isRentalActive(rental)
  const isCancelled = isRentalCancelled(rental)
  const isExpired = isRentalExpired(rental)

  const isLate = isRentalLate(rental)
  const isPaidUp = isRentalPaidUp(rental)

  const handleSign = async () => {
    setIsSigning(true)
    try {
      await onSignAgreement(rental.id)
    } finally {
      setIsSigning(false)
      setSignOpen(false)
    }
  }

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      await onCancelAgreement(rental.id)
    } finally {
      setIsCancelling(false)
      setCancelOpen(false)
    }
  }

  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: "column",
        opacity: !isMine ? 0.5 : 1,
        pointerEvents: !isMine ? "none" : "auto",
        transition: "opacity 0.2s ease-in-out",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, flex: 1 }}>
        <Box
          component="img"
          src={rental.imageUrl}
          alt={rental.name}
          sx={{
            width: { xs: "100%", sm: 160 },
            height: { xs: 160, sm: "auto" },
            objectFit: "cover",
          }}
        />
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, p: 2.5 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                <Chip
                  size="small"
                  label={TYPE_LABEL[rental.type]}
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />

                {isActive && isPaidUp && (
                  <Chip size="small" label="Al día" color="success" sx={{ fontWeight: 600 }} />
                )}

                {isPendingSignatures && !rental.tenantApproved && (
                  <Chip size="small" label="Pendiente de firma" color="warning" sx={{ fontWeight: 600 }} />
                )}
                {isPendingSignatures && rental.tenantApproved && (
                  <Chip size="small" label="Esperando al propietario" color="info" sx={{ fontWeight: 600 }} />
                )}
                {isExpired && (
                  <Chip size="small" label="Vencido" color="error" sx={{ fontWeight: 600 }} />
                )}
                {isCancelled && (
                  <Chip size="small" label="Cancelado" color="error" sx={{ fontWeight: 600 }} />
                )}
                {isActive && isLate && (
                  <Chip size="small" label="Pago moroso" color="error" sx={{ fontWeight: 600 }} />
                )}
              </Box>

              <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ ml: 1, mt: -0.5, mr: -1 }}>
                <MoreVertRoundedIcon fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              >
                {isActive && (
                  <MenuItem
                    onClick={() => {
                      setMenuAnchor(null)
                      setCancelOpen(true)
                    }}
                  >
                    <ListItemIcon sx={{ color: "inherit" }}>
                      <CancelRoundedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Cancelar contrato" />
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => {
                    setMenuAnchor(null)
                    onRemoveRental(rental.id)
                  }}
                  sx={{ color: "error.main" }}
                >
                  <ListItemIcon sx={{ color: "inherit" }}>
                    <DeleteRoundedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Eliminar alquiler" />
                </MenuItem>
              </Menu>
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              {rental.name}
            </Typography>

            <Box 
              sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.5, cursor: isActive ? "pointer" : "default" }}
              onClick={() => isActive && setReviewOpen(true)}
            >
              <Rating value={ratingData.average} readOnly precision={0.5} size="small" />
              <Typography variant="body2" color="text.secondary">
                ({ratingData.count}) {isActive && "· Dejar reseña"}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {rental.address}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, visibility: (!isCancelled && !isExpired && (isActive || isPaidUp)) ? "visible" : "hidden" }}>
              <EventRoundedIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.primary">
                Próximo pago: <strong>{dateLabel(getRentalPeriodStart(rental).getTime())}</strong> · {usdc(getRentalAmountToPay(rental))}
              </Typography>
            </Box>
          </Box>

          {/* Action Bar */}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 2.5, flexWrap: "wrap" }}>
            {isPendingSignatures && !rental.tenantApproved ? (
              <Button
                size="small"
                variant="contained"
                color="warning"
                startIcon={<EditDocumentIcon />}
                onClick={() => setSignOpen(true)}
              >
                Firmar Contrato
              </Button>
            ) : (
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", width: "100%", visibility: isActive ? "visible" : "hidden" }}>
                <Tooltip title="Smartlock">
                  <IconButton
                    size="small"
                    onClick={() => onNavigateToSmartlock(rental.id)}
                    sx={{
                      color: "primary.main",
                      p: 0.75,
                    }}
                    disabled={!isActive}
                    tabIndex={isActive ? 0 : -1}
                  >
                    <LockOpenRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<PaymentsRoundedIcon />}
                  onClick={() => onSetPayTarget(rental)}
                  disabled={isPaidUp || !isActive}
                  tabIndex={isActive ? 0 : -1}
                >
                  Pagar periodo
                </Button>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<HistoryRoundedIcon />}
                  onClick={() => onToggleExpand(rental.id)}
                  sx={{ ml: "auto" }}
                  disabled={!isActive}
                  tabIndex={isActive ? 0 : -1}
                >
                  Historial
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <PaymentHistoryDrawer
        rental={rental}
        isOpen={isOpen}
        onClose={() => onToggleExpand(rental.id)}
      />

      <SignAgreementDialog
        rental={rental}
        open={signOpen}
        onClose={() => setSignOpen(false)}
        onSign={handleSign}
        isSigning={isSigning}
      />

      <CancelAgreementDialog
        rental={rental}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onCancel={handleCancel}
        isCancelling={isCancelling}
        iHaveCancelled={iHaveCancelled}
        otherHasCancelled={otherHasCancelled}
      />

      <ReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        propertyId={rental.propertyId}
        propertyName={rental.name}
        onReviewSubmitted={fetchReviews}
      />
    </Card>
  )
}
