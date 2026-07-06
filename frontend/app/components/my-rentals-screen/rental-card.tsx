import { useState } from "react"
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Paper,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  ListItemIcon,
} from "@mui/material"
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded"
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded"
import EventRoundedIcon from "@mui/icons-material/EventRounded"
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import EditDocumentIcon from "@mui/icons-material/EditDocument"
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import WalletRoundedIcon from "@mui/icons-material/WalletRounded"
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded"
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded"
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded"
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded"
import CancelRoundedIcon from "@mui/icons-material/CancelRounded"
import { usdc, dateLabel, TYPE_LABEL } from "@/lib/format"
import { getRentalAmountToPay } from "@/models/rental-utils"
import { PaymentHistory } from "@components/payment-history/payment-history"
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
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const wallet = useUserStore(s => s.wallet)

  const isMine = wallet && (rental.tenant?.toLowerCase() === wallet.toLowerCase() || rental.landlord.toLowerCase() === wallet.toLowerCase())
  
  const isLandlord = wallet && rental.landlord.toLowerCase() === wallet.toLowerCase()
  const isTenant = wallet && rental.tenant?.toLowerCase() === wallet.toLowerCase()
  
  const iHaveCancelled = (isLandlord && rental.contractDetails?.landlordCancelled) || (isTenant && rental.contractDetails?.tenantCancelled)
  const otherHasCancelled = (isLandlord && rental.contractDetails?.tenantCancelled) || (isTenant && rental.contractDetails?.landlordCancelled)

  const status = rental.contractDetails?.status ?? 2
  const isPendingSignatures = status === 1
  const isActive = status === 2
  const isCancelled = status === 4
  const isExpired = status === 6

  const isLate = rental.contractDetails?.isLate ?? false
  // Consider it paid up if rentPaidUntil (in ms) > current time
  const rentPaidUntil = (rental.contractDetails?.rentPaidUntil ?? 0) * 1000
  const isPaidUp = rentPaidUntil > Date.now()

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
        opacity: (!isMine || isCancelled || isExpired) ? 0.5 : 1,
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
            filter: (isCancelled || isExpired) ? "grayscale(100%)" : "none"
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

                {isPendingSignatures && !rental.contractDetails?.tenantApproved && (
                  <Chip size="small" label="Pendiente de firma" color="warning" sx={{ fontWeight: 600 }} />
                )}
                {isPendingSignatures && rental.contractDetails?.tenantApproved && (
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
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {rental.address}
            </Typography>

            {(isActive || isPaidUp) && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <EventRoundedIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.primary">
                  Próximo pago: <strong>{dateLabel(rental.nextPaymentDate)}</strong> · {usdc(getRentalAmountToPay(rental))}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Action Bar */}
          {(!isCancelled && !isExpired) && (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 2.5, flexWrap: "wrap" }}>

              {isPendingSignatures && !rental.contractDetails?.tenantApproved && (
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  startIcon={<EditDocumentIcon />}
                  onClick={() => setSignOpen(true)}
                >
                  Firmar Contrato
                </Button>
              )}

              {isActive && (
                <>
                  <Tooltip title="Smartlock">
                    <IconButton
                      size="small"
                      onClick={() => onNavigateToSmartlock(rental.id)}
                      sx={{
                        color: "primary.main",
                        p: 0.75,
                      }}
                    >
                      <LockOpenRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PaymentsRoundedIcon />}
                    onClick={() => onSetPayTarget(rental)}
                    disabled={isPaidUp}
                  >
                    Pagar periodo
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<HistoryRoundedIcon />}
                    onClick={() => onToggleExpand(rental.id)}
                    sx={{ ml: "auto" }}
                  >
                    Historial
                  </Button>
                </>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <Drawer
        anchor="right"
        open={isOpen}
        onClose={() => onToggleExpand(rental.id)}
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
              {rental.name}
            </Typography>
          </Box>
          <IconButton onClick={() => onToggleExpand(rental.id)} aria-label="cerrar">
            <CloseRoundedIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <PaymentHistory payments={rental.payments} />
      </Drawer>

      <Dialog open={signOpen} onClose={() => !isSigning && setSignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Firma del Contrato de Alquiler</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Estás a punto de firmar y aceptar los términos del contrato de alquiler para la propiedad <strong>{rental.name}</strong>. Por favor, revisá detenidamente las condiciones antes de confirmar.
            </Alert>

            {/* Valores Principales */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
              <Paper variant="outlined" sx={{ borderRadius: 1.5, p: 2, bgcolor: "surfaceContainerLowest.main" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <EventRoundedIcon fontSize="small" sx={{ color: "success.dark" }} />
                  <Typography variant="caption" sx={{ color: "success.dark", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Alquiler Mensual
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main" }}>
                  {usdc(rental.contractDetails?.baseRent ?? rental.monthlyRent)}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ borderRadius: 1.5, p: 2, bgcolor: "surfaceContainerLowest.main" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <ShieldRoundedIcon fontSize="small" sx={{ color: "success.dark" }} />
                  <Typography variant="caption" sx={{ color: "success.dark", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Depósito de Garantía
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main" }}>
                  {usdc(rental.contractDetails?.securityDeposit ?? 0)}
                </Typography>
              </Paper>
            </Box>

            {/* Términos del Contrato */}
            <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
              <Box sx={{ bgcolor: "surfaceContainerLow.main", p: 1.5, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 1 }}>
                <ReceiptLongRoundedIcon fontSize="small" color="action" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Condiciones del Contrato
                </Typography>
              </Box>
              <Box sx={{ p: 2, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2, bgcolor: "surfaceContainerLowest.main" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Duración</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {rental.contractDetails?.duration ? `${Math.floor(rental.contractDetails.duration / (86400 * 30))} meses` : "—"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Aumento por Inflación</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {rental.contractDetails?.inflationBps !== undefined ? `${(rental.contractDetails.inflationBps / 100).toFixed(1)}%` : "—"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Punitorios por mora</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {rental.contractDetails?.lateFeeBps !== undefined ? `${(rental.contractDetails.lateFeeBps / 100).toFixed(1)}% mensual` : "—"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Período de Gracia</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {rental.contractDetails?.gracePeriod ? `${Math.floor(rental.contractDetails.gracePeriod / 86400)} días` : "—"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Frecuencia de Pago</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {rental.contractDetails?.paymentPeriod ? `${Math.floor(rental.contractDetails.paymentPeriod / 86400)} días` : "—"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Límite para Firmar</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {rental.contractDetails?.deadline ? dateLabel(rental.contractDetails.deadline * 1000) : "—"}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Detalles Técnicos (Opcional) */}
          <Accordion disableGutters variant="outlined" sx={{ borderRadius: 1.5, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, '&.Mui-expanded': { minHeight: 48 }, '& .MuiAccordionSummary-content': { my: 1 }, '& .MuiAccordionSummary-content.Mui-expanded': { my: 1 } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <WalletRoundedIcon fontSize="small" color="action" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Direcciones (Blockchain)
                </Typography>
              </Box>
            </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>

                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ display: "block", mb: 0.5, fontWeight: 700, color: "text.primary" }}>Propietario</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 500, fontFamily: "monospace", display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {rental.landlord || "—"}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(rental.landlord || "")}>
                    <ContentCopyRoundedIcon fontSize="small" color="action" />
                  </IconButton>
                </Paper>



                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ display: "block", mb: 0.5, fontWeight: 700, color: "text.primary" }}>Inquilino</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 500, fontFamily: "monospace", display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {rental.tenant || "Pendiente"}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(rental.tenant || "")}>
                    <ContentCopyRoundedIcon fontSize="small" color="action" />
                  </IconButton>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ display: "block", mb: 0.5, fontWeight: 700, color: "text.primary" }}>Dirección del Contrato</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 500, fontFamily: "monospace", display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {rental.agreementAddress || rental.id}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(rental.agreementAddress || rental.id)}>
                    <ContentCopyRoundedIcon fontSize="small" color="action" />
                  </IconButton>
                </Paper>

              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setSignOpen(false)} color="inherit" disabled={isSigning}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSign}
            disabled={isSigning}
            startIcon={isSigning ? <CircularProgress size={20} color="inherit" /> : <EditDocumentIcon />}
          >
            {isSigning ? "Firmando..." : "Confirmar Firma"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={cancelOpen} onClose={() => !isCancelling && setCancelOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Cancelar Contrato de Alquiler</DialogTitle>
        <DialogContent sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {otherHasCancelled ? (
            <Alert severity="warning">
              La otra parte ya firmó y solicitó la cancelación. Si confirmás, el contrato se cancelará y revocará el uso de la propiedad inmediatamente.
            </Alert>
          ) : iHaveCancelled ? (
            <Alert severity="success">
              Ya firmaste la cancelación de este contrato. Estamos esperando a que la otra parte confirme.
            </Alert>
          ) : (
            <Alert severity="info">
              Estás a punto de solicitar la cancelación del contrato <strong>{rental.name}</strong>. Para que se efectivice, la otra parte también deberá firmar la cancelación desde su cuenta.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setCancelOpen(false)} color="inherit" disabled={isCancelling}>
            {iHaveCancelled && !otherHasCancelled ? "Entiendo" : "Volver"}
          </Button>
          {!(iHaveCancelled && !otherHasCancelled) && (
            <Button
              variant="contained"
              color="error"
              onClick={handleCancel}
              disabled={isCancelling}
              startIcon={isCancelling ? <CircularProgress size={20} color="inherit" /> : <CancelRoundedIcon />}
            >
              {isCancelling ? "Firmando..." : "Firmar Cancelación"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Card>
  )
}
