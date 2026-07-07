import { Box, Chip } from "@mui/material"
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded"
import { TYPE_LABEL } from "@/lib/format"
import type { PropertyType } from "@models/types"

interface PropertyCardHeaderProps {
  imageUrl: string;
  name: string;
  type: PropertyType;
  isOverdue: boolean;
  statusColor: "success" | "warning" | "default" | "error";
  statusLabel: string;
  statusVariant?: "filled" | "outlined";
}

export function PropertyCardHeader({
  imageUrl,
  name,
  type,
  isOverdue,
  statusColor,
  statusLabel,
  statusVariant = "filled",
}: PropertyCardHeaderProps) {
  return (
    <Box sx={{ position: "relative", height: 160 }}>
      <Box
        component="img"
        src={imageUrl}
        alt={name}
        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <Box sx={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 1 }}>
        <Chip size="small" label={TYPE_LABEL[type]} sx={{ bgcolor: "background.default", fontWeight: 600 }} />
        <Chip 
          size="small" 
          color={statusColor} 
          variant={statusVariant} 
          label={statusLabel} 
          sx={{ 
            fontWeight: 600,
            ...(statusVariant === "outlined" && { bgcolor: "background.paper" })
          }} 
        />
      </Box>
      {isOverdue && (
        <Chip
          size="small"
          color="error"
          icon={<WarningAmberRoundedIcon />}
          label="Pago moroso"
          sx={{ position: "absolute", top: 12, right: 12, fontWeight: 700 }}
        />
      )}
    </Box>
  )
}
