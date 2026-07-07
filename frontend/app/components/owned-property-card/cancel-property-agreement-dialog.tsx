import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material"
import CancelRoundedIcon from "@mui/icons-material/CancelRounded"
import type { Property } from "@models/types"

interface CancelPropertyAgreementDialogProps {
  property: Property
  open: boolean
  onClose: () => void
  onCancel: () => Promise<void>
  isCancelling: boolean
}

export function CancelPropertyAgreementDialog({
  property,
  open,
  onClose,
  onCancel,
  isCancelling,
}: CancelPropertyAgreementDialogProps) {
  const iHaveCancelled = property.contract?.landlordCancelled ?? false;
  const otherHasCancelled = property.contract?.tenantCancelled ?? false;
  const isDraft = property.contract?.status === "draft";

  return (
    <Dialog open={open} onClose={() => !isCancelling && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {isDraft ? "Cancelar Contrato (Borrador)" : "Finalizar Contrato de Alquiler"}
      </DialogTitle>
      <DialogContent sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {isDraft ? (
          <Alert severity="info">
            Estás a punto de cancelar este contrato en estado borrador de la blockchain. Se eliminará el contrato y no podrá ser firmado por el inquilino.
          </Alert>
        ) : otherHasCancelled ? (
          <Alert severity="warning">
            El inquilino ya solicitó la cancelación del contrato. Si confirmás, el contrato se finalizará y revocará el uso de la propiedad inmediatamente.
          </Alert>
        ) : iHaveCancelled ? (
          <Alert severity="success">
            Ya firmaste la cancelación de este contrato. Estamos esperando a que el inquilino confirme desde su cuenta.
          </Alert>
        ) : (
          <Alert severity="info">
            Estás a punto de solicitar la cancelación del contrato de <strong>{property.name}</strong>. Para que se efectivice, el inquilino también deberá firmar la cancelación desde su cuenta.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} color="inherit" disabled={isCancelling}>
          {iHaveCancelled && !otherHasCancelled && !isDraft ? "Entiendo" : "Volver"}
        </Button>
        {!(iHaveCancelled && !otherHasCancelled && !isDraft) && (
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
