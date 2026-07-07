import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Typography } from "@mui/material"
import EditDocumentIcon from "@mui/icons-material/EditDocument"
import EventRoundedIcon from "@mui/icons-material/EventRounded"
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded"
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import WalletRoundedIcon from "@mui/icons-material/WalletRounded"
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded"
import { usdc, dateLabel } from "@/lib/format"
import type { Rental } from "@models/types"

interface SignAgreementDialogProps {
  rental: Rental
  open: boolean
  onClose: () => void
  onSign: () => Promise<void>
  isSigning: boolean
}

export function SignAgreementDialog({
  rental,
  open,
  onClose,
  onSign,
  isSigning
}: SignAgreementDialogProps) {
  return (
    <Dialog open={open} onClose={() => !isSigning && onClose()} maxWidth="sm" fullWidth>
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
                {usdc(rental.baseRent ?? 0)}
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
                {usdc(rental.securityDeposit ?? 0)}
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
                  {rental.duration ? `${Math.floor(rental.duration / (86400 * 30))} meses` : "—"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Aumento por Inflación</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {rental.inflationBps !== undefined ? `${(rental.inflationBps / 100).toFixed(1)}%` : "—"}
                  {rental.inflationAdjustmentInterval !== undefined && rental.inflationAdjustmentInterval > 0 && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      (cada {rental.inflationAdjustmentInterval} periodos)
                    </Typography>
                  )}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Punitorios por mora</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {rental.lateFeeBps !== undefined ? `${(rental.lateFeeBps / 100).toFixed(1)}% mensual` : "—"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Período de Gracia</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {rental.gracePeriod ? `${Math.floor(rental.gracePeriod / 86400)} días` : "—"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Frecuencia de Pago</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {rental.paymentPeriod ? `${Math.floor(rental.paymentPeriod / 86400)} días` : "—"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Límite para Firmar</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {rental.deadline ? dateLabel(rental.deadline * 1000) : "—"}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Detalles Técnicos */}
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
                    {rental.id}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => navigator.clipboard.writeText(rental.id)}>
                  <ContentCopyRoundedIcon fontSize="small" color="action" />
                </IconButton>
              </Paper>

            </AccordionDetails>
          </Accordion>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} color="inherit" disabled={isSigning}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onSign}
          disabled={isSigning}
          startIcon={isSigning ? <CircularProgress size={20} color="inherit" /> : <EditDocumentIcon />}
        >
          {isSigning ? "Firmando..." : "Confirmar Firma"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
