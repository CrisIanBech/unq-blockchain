import { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Collapse,
  IconButton,
  Tooltip,
} from "@mui/material"
import DriveFileRenameOutlineRoundedIcon from "@mui/icons-material/DriveFileRenameOutlineRounded"
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded"
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded"
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded"
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded"
import CheckRoundedIcon from "@mui/icons-material/CheckRounded"
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded"
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded"
import InfoRoundedIcon from "@mui/icons-material/InfoRounded"
import type { Rental } from "@/models/types"
import { usdc } from "@/lib/format"

interface SignAgreementDialogProps {
  rental: Rental | null
  open: boolean
  onClose: () => void
  onSign: (agreementAddress: string, securityDeposit: number) => void
  balance: number
}

interface AddressRowProps {
  label: string
  address: string
  copiedAddress: string | null
  onCopy: (addr: string) => void
}

function AddressRow({ label, address, copiedAddress, onCopy }: AddressRowProps) {
  const isCopied = copiedAddress === address

  function truncateAddress(addr: string) {
    if (!addr) return ""
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        py: 1.25,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": {
          borderBottom: "none",
          pb: 0
        },
        "&:first-of-type": {
          pt: 0
        }
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography
          variant="body2"
          sx={{
            fontFamily: "monospace",
            fontWeight: 600,
            bgcolor: "surfaceContainer.low",
            px: 1,
            py: 0.5,
            borderRadius: 1,
            fontSize: "0.8rem",
            color: "text.primary"
          }}
        >
          {truncateAddress(address)}
        </Typography>
        <Tooltip title={isCopied ? "¡Copiado!" : "Copiar dirección"} placement="top">
          <IconButton
            size="small"
            onClick={() => onCopy(address)}
            sx={{
              color: isCopied ? "success.main" : "text.secondary",
              "&:hover": {
                bgcolor: "surfaceContainer.high"
              }
            }}
          >
            {isCopied ? (
              <CheckRoundedIcon fontSize="small" />
            ) : (
              <ContentCopyRoundedIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

export function SignAgreementDialog({
  rental,
  open,
  onClose,
  onSign,
  balance,
}: SignAgreementDialogProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [hasReadTerms, setHasReadTerms] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setHasReadTerms(false)
      // Check if content fits without scrolling after DOM settles
      const timer = setTimeout(() => {
        if (contentRef.current) {
          const el = contentRef.current
          if (el.scrollHeight <= el.clientHeight) {
            setHasReadTerms(true)
          }
        }
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [open, rental])

  if (!rental) return null

  const details = rental.contractDetails

  if (!details) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Cargando...</DialogTitle>
        <DialogContent>Obteniendo detalles del contrato...</DialogContent>
      </Dialog>
    )
  }

  const durationMonths = Math.round(details.duration / (30 * 86400))
  const gracePeriodDays = Math.round(details.gracePeriod / 86400)
  const paymentPeriodDays = Math.round(details.paymentPeriod / 86400)

  const deadlineDate = new Date(details.deadline * 1000)
  const dateOpts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
  const deadlineLabel = deadlineDate.toLocaleDateString("es-ES", dateOpts)

  const enoughBalance = balance >= details.securityDeposit

  function handleConfirm() {
    if (!rental || !details) return
    onSign(rental.agreementAddress, details.securityDeposit)
    onClose()
  }

  function handleCopy(address: string) {
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => {
      setCopiedAddress(null)
    }, 2000)
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const { scrollHeight, scrollTop, clientHeight } = e.currentTarget
    // Unlocks when scrolled to within 45px of the bottom (approx. 95% scrolled)
    if (scrollHeight - scrollTop <= clientHeight + 45) {
      setHasReadTerms(true)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 3,
            bgcolor: "primaryContainer.main",
            color: "primaryContainer.contrastText",
            display: "grid",
            placeItems: "center",
          }}
        >
          <DriveFileRenameOutlineRoundedIcon />
        </Box>
        Firmar Contrato de Alquiler
      </DialogTitle>

      <DialogContent ref={contentRef} onScroll={handleScroll} sx={{ pt: "12px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            bgcolor: "rgba(2, 136, 209, 0.08)",
            p: 1.5,
            borderRadius: 2,
            mt: 1.5,
            mb: 1.5,
            border: "1px solid",
            borderColor: "rgba(2, 136, 209, 0.2)",
          }}
        >
          <InfoRoundedIcon fontSize="small" color="info" />
          <Typography variant="body2" sx={{ color: "info.main", fontWeight: 600 }}>
            Revisá y confirma las condiciones de tu alquiler para firmar.
          </Typography>
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "text.primary" }}>
          Términos Económicos y Plazos
        </Typography>

        {/* Bento Grid Top Section: High-Emphasis Financial Summary */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
            mb: 2
          }}
        >
          {/* Card A: Alquiler Mensual */}
          <Box
            sx={{
              bgcolor: "surfaceContainer.low",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              p: 2.5,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 1.5,
              transition: "background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
              "&:hover": {
                bgcolor: "surfaceContainer.main",
                boxShadow: "0 4px 12px rgba(0,0,0,0.04)"
              }
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Alquiler Mensual
              </Typography>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  bgcolor: "secondaryContainer.main",
                  color: "secondaryContainer.contrastText",
                  display: "grid",
                  placeItems: "center"
                }}
              >
                <AttachMoneyRoundedIcon fontSize="small" />
              </Box>
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary" }}>
                {usdc(details.baseRent)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                Frecuencia de pago regular
              </Typography>
            </Box>
          </Box>

          {/* Card B: Depósito en Garantía */}
          <Box
            sx={{
              bgcolor: "primaryContainer.main",
              color: "primaryContainer.contrastText",
              border: "1px solid",
              borderColor: "primary.main",
              borderRadius: 2,
              p: 2.5,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 1.5,
              transition: "box-shadow 0.2s ease-in-out",
              "&:hover": {
                boxShadow: "0 4px 16px rgba(0, 109, 59, 0.12)"
              }
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, opacity: 0.9 }}>
                Depósito en Garantía
              </Typography>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  bgcolor: "rgba(0,0,0,0.06)",
                  color: "inherit",
                  display: "grid",
                  placeItems: "center"
                }}
              >
                <SecurityRoundedIcon fontSize="small" />
              </Box>
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {usdc(details.securityDeposit)}
              </Typography>
              <Typography variant="caption" sx={{ mt: 0.5, display: "block", opacity: 0.85 }}>
                Retornado al finalizar contrato
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Bento Grid Bottom Section: Unified parameters block */}
        <Box
          sx={{
            bgcolor: "surfaceContainer.low",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            p: 2.5,
            mb: 3,
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr" },
            gap: 2.5,
            transition: "background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
            "&:hover": {
              bgcolor: "surfaceContainer.main",
              boxShadow: "0 4px 12px rgba(0,0,0,0.04)"
            }
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>
              Duración
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {durationMonths} Meses
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>
              Ajuste Inflación
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {details.inflationBps / 100}% anual
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>
              Frecuencia Pago
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              Cada {paymentPeriodDays} días
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>
              Período Gracia
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {gracePeriodDays} días
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>
              Interés por Mora
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {details.lateFeeBps / 100}%
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>
              Límite Firma
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, color: "warning.main" }}>
              {deadlineLabel}
            </Typography>
          </Box>
        </Box>

        {/* Collapsible Technical Details / Blockchain Addresses */}
        <Box
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            py: 1.5,
            px: 2.5,
            borderRadius: 2,
            bgcolor: "surfaceContainer.low",
            border: "1px solid",
            borderColor: "divider",
            mb: 2,
            userSelect: "none",
            transition: "background-color 0.2s ease-in-out",
            "&:hover": {
              bgcolor: "surfaceContainer.main"
            }
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
            Direcciones de Contrato inteligente
          </Typography>
          {showTechnicalDetails ? (
            <ExpandLessRoundedIcon color="action" />
          ) : (
            <ExpandMoreRoundedIcon color="action" />
          )}
        </Box>

        <Collapse in={showTechnicalDetails} sx={{ mb: 2 }}>
          <Box
            sx={{
              bgcolor: "background.default",
              p: 2.5,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
            }}
          >
            <AddressRow
              label="Dirección del Acuerdo"
              address={rental.agreementAddress}
              copiedAddress={copiedAddress}
              onCopy={handleCopy}
            />
            <AddressRow
              label="USDC Token"
              address={details.usdcToken || ""}
              copiedAddress={copiedAddress}
              onCopy={handleCopy}
            />
            <AddressRow
              label="Property NFT"
              address={details.propertyNFT || ""}
              copiedAddress={copiedAddress}
              onCopy={handleCopy}
            />
            <AddressRow
              label="Rental NFT"
              address={details.rentalNFT || ""}
              copiedAddress={copiedAddress}
              onCopy={handleCopy}
            />
          </Box>
        </Collapse>

        {!enoughBalance && (
          <Chip
            color="error"
            variant="filled"
            icon={<ErrorRoundedIcon />}
            label={`Saldo insuficiente para cubrir la garantía de ${usdc(details.securityDeposit)} (Tu saldo: ${usdc(balance)})`}
            sx={{
              width: "100%",
              color: "error.contrastText",
              fontWeight: 600,
              justifyContent: "flex-start",
              px: 1,
              py: 0.5,
              borderRadius: 2,
            }}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, display: "flex", gap: 1.5, alignItems: "center" }}>
        <Button onClick={onClose} color="inherit" sx={{ ml: "auto" }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={!enoughBalance || !hasReadTerms}
          onClick={handleConfirm}
        >
          Firmar y Bloquear Depósito
        </Button>
      </DialogActions>
    </Dialog>
  )
}
