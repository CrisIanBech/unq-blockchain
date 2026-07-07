import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material"
import CancelRoundedIcon from "@mui/icons-material/CancelRounded"
import type { Rental } from "@models/types"

interface CancelAgreementDialogProps {
  rental: Rental
  open: boolean
  onClose: () => void
  onCancel: () => Promise<void>
  isCancelling: boolean
  iHaveCancelled: boolean
  otherHasCancelled: boolean
}

export function CancelAgreementDialog({
  rental,
  open,
  onClose,
  onCancel,
  isCancelling,
  iHaveCancelled,
  otherHasCancelled
}: CancelAgreementDialogProps) {
  return (
    <Dialog open={open} onClose={() => !isCancelling && onClose()} maxWidth="sm" fullWidth>
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
        <Button onClick={onClose} color="inherit" disabled={isCancelling}>
          {iHaveCancelled && !otherHasCancelled ? "Entiendo" : "Volver"}
        </Button>
        {!(iHaveCancelled && !otherHasCancelled) && (
          <Button
            variant="contained"
            color="error"
            onClick={onCancel}
            disabled={isCancelling}
            startIcon={isCancelling ? <CircularProgress size={20} color="inherit" /> : <CancelRoundedIcon />}
          >
            {isCancelling ? "Firmando..." : "Firmar Cancelación"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
