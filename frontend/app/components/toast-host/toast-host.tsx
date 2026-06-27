import { Snackbar, Alert, Typography, Box } from "@mui/material"
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
          autoHideDuration={4000}
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
                <Typography variant="caption" sx={{ fontFamily: "monospace", opacity: 0.85 }}>
                  tx {t.txHash}
                </Typography>
              )}
            </Box>
          </Alert>
        </Snackbar>
      ))}
    </>
  )
}
