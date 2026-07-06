import { Snackbar, Alert, Typography, Box, IconButton, Tooltip } from "@mui/material"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import type { Toast } from "@models/types"

interface ToastHostProps {
  toasts: Toast[]
  onDismissToast: (id: number) => void
}

export function ToastHost({ toasts, onDismissToast }: ToastHostProps) {
  return (
    <>
      {toasts.map((t, i) => (
        <Snackbar
          key={t.id}
          open
          autoHideDuration={t.txHash ? null : 4000}
          onClose={() => onDismissToast(t.id)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          sx={{ bottom: { xs: 96 + i * 70, md: 24 + i * 70 } }}
        >
          <Alert
            onClose={() => onDismissToast(t.id)}
            severity={t.severity}
            variant="filled"
            sx={{ borderRadius: 3, alignItems: "center", maxWidth: 420 }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {t.message}
              </Typography>
              {t.txHash && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                  <Typography variant="caption" sx={{ fontFamily: "monospace", opacity: 0.85 }}>
                    tx {t.txHash.length > 14 ? `${t.txHash.slice(0, 8)}...${t.txHash.slice(-6)}` : t.txHash}
                  </Typography>
                  <Tooltip title="Copiar hash">
                    <IconButton 
                      size="small" 
                      color="inherit" 
                      onClick={() => navigator.clipboard.writeText(t.txHash!)}
                      sx={{ p: 0.5 }}
                    >
                      <ContentCopyIcon fontSize="small" sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>
          </Alert>
        </Snackbar>
      ))}
    </>
  )
}
