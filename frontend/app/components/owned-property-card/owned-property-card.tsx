import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material"
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded"
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import type { Property } from "@models/types"
import { dateLabel } from "@/lib/format"
import { PaymentHistory } from "@components/payment-history/payment-history"
import { PropertyCardHeader } from "./property-card-header"
import { PropertyDetails } from "./property-details"
import { PropertyMenu } from "./property-menu"
import { ManageContractDialog } from "./manage-contract-dialog"
import { ReviewDialog } from "@components/review-dialog/review-dialog"
import { CancelPropertyAgreementDialog } from "./cancel-property-agreement-dialog"
import { ReviewsService } from "@/lib/services/reviews-service"
import {
  getPropertyPayments,
  isPropertyOverdue,
  canPropertyWithdraw,
  getPropertyAvailableToWithdraw,
  getPropertyTenant,
  getPropertyTenantSince,
  getPropertyAgreementAddress,
  getPropertyNextChargeDate,
  getPropertyStatusDetails,
} from "@models/property-utils"

interface OwnedPropertyCardProps {
  property: Property
  onWithdrawRent: (id: string) => void
  onSignContract: (id: string) => void
  onCancelContract: (id: string) => void
  onUnlinkContract: (id: string) => void
}

export function OwnedPropertyCard({
  property,
  onWithdrawRent,
  onSignContract,
  onCancelContract,
  onUnlinkContract,
}: OwnedPropertyCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [manageContractOpen, setManageContractOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [menuEl, setMenuEl] = useState<null | HTMLElement>(null)
  const [ratingData, setRatingData] = useState({ average: 0, count: 0 })

  const isActive = property.contract?.status === "active"
  const propertyId = Number(property.propertyId ?? property.id.replace("own-", ""))

  const fetchReviews = () => {
    ReviewsService.getAllReviews(propertyId).then(reviews => {
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
  }, [propertyId])

  const payments = getPropertyPayments(property)
  const isOverdue = isPropertyOverdue(property)
  const canWithdraw = canPropertyWithdraw(property)
  const statusDetails = getPropertyStatusDetails(property)
  const tenant = getPropertyTenant(property)
  const tenantSince = getPropertyTenantSince(property)
  const agreementAddress = getPropertyAgreementAddress(property)

  function consultTenant() {
    setMenuEl(null)
    alert(
      tenant
        ? `Inquilino on-chain de "${property.name}":\n${tenant}\nDesde: ${dateLabel(tenantSince)}`
        : `"${property.name}" no tiene inquilino asignado.`,
    )
  }

  async function handleCancel() {
    setIsCancelling(true)
    try {
      await onCancelContract(property.id)
    } finally {
      setIsCancelling(false)
      setCancelOpen(false)
    }
  }

  return (
    <Card
      sx={{
        overflow: "hidden",
      }}
    >
      <PropertyCardHeader
        imageUrl={property.imageUrl || `/images/prop-${((property.propertyId || 0) % 5) + 1}.png`}
        name={property.name}
        type={property.type}
        isOverdue={isOverdue}
        statusColor={statusDetails.color}
        statusLabel={statusDetails.label}
        statusVariant={statusDetails.variant}
      />

      <CardContent>
        <PropertyDetails
          name={property.name}
          address={property.address ?? ""}
          monthlyRent={property.monthlyRent ?? 0}
          nextChargeDate={getPropertyNextChargeDate(property)}
          availableToWithdraw={getPropertyAvailableToWithdraw(property)}
          canWithdraw={canWithdraw}
          isActive={isActive}
          ratingData={ratingData}
          onOpenReview={() => setReviewOpen(true)}
          onOpenMenu={(e) => setMenuEl(e.currentTarget)}
        />

        <Box sx={{ display: "flex", gap: 1.5, mt: 2.5, alignItems: "center", flexWrap: "wrap" }}>
          <Tooltip title={canWithdraw ? "" : "No hay fondos disponibles"}>
            <span>
              <Button
                variant="contained"
                startIcon={<PaymentsRoundedIcon />}
                disabled={!canWithdraw}
                onClick={() => agreementAddress && onWithdrawRent(property.id)}
              >
                Retirar fondos
              </Button>
            </span>
          </Tooltip>

          <Button
            variant="text"
            startIcon={<HistoryRoundedIcon />}
            onClick={() => setExpanded(true)}
            sx={{ ml: "auto" }}
          >
            Historial de pagos
          </Button>
        </Box>
      </CardContent>

      <PropertyMenu
        property={property}
        menuEl={menuEl}
        onCloseMenu={() => setMenuEl(null)}
        onConsultTenant={consultTenant}
        onManageContract={() => setManageContractOpen(true)}
        onSignContract={onSignContract}
        onOpenCancelDialog={() => {
          setMenuEl(null)
          setCancelOpen(true)
        }}
        onUnlinkContract={onUnlinkContract}
      />

      {/* Drawer for Payment History (Side Sheet) */}
      <Drawer
        anchor="right"
        open={expanded}
        onClose={() => setExpanded(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "100%", sm: 400 },
              bgcolor: "background.default",
              p: 3,
            },
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Historial de pagos
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {property.name}
            </Typography>
          </Box>
          <IconButton onClick={() => setExpanded(false)} aria-label="cerrar">
            <CloseRoundedIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <PaymentHistory payments={payments} />
      </Drawer>

      <ManageContractDialog
        open={manageContractOpen}
        onClose={() => setManageContractOpen(false)}
        propertyId={propertyId}
        propertyName={property.name}
      />

      <ReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        propertyId={propertyId}
        propertyName={property.name}
        onReviewSubmitted={fetchReviews}
      />

      <CancelPropertyAgreementDialog
        property={property}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onCancel={handleCancel}
        isCancelling={isCancelling}
      />
    </Card>
  )
}
