import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material"
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded"
import AddCardRoundedIcon from "@mui/icons-material/AddCardRounded"
import HistoryEduRoundedIcon from "@mui/icons-material/HistoryEduRounded"
import CancelRoundedIcon from "@mui/icons-material/CancelRounded"
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded"
import type { Property } from "@models/types"
import {
  getPropertyContractStatus,
  isPropertyLandlordApproved,
  getPropertyAgreementAddress,
} from "@models/property-utils"

interface PropertyMenuProps {
  property: Property
  menuEl: HTMLElement | null
  onCloseMenu: () => void
  onConsultTenant: () => void
  onManageContract: () => void
  onSignContract: (id: string) => void
  onCancelContract: (id: string) => void
  onUnlinkContract: (id: string) => void
}

export function PropertyMenu({
  property,
  menuEl,
  onCloseMenu,
  onConsultTenant,
  onManageContract,
  onSignContract,
  onCancelContract,
  onUnlinkContract,
}: PropertyMenuProps) {
  const contractStatus = getPropertyContractStatus(property);
  const landlordApproved = isPropertyLandlordApproved(property);
  const agreementAddress = getPropertyAgreementAddress(property);

  return (
    <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={onCloseMenu}>
      {contractStatus === "active" && (
        <MenuItem onClick={onConsultTenant}>
          <ListItemIcon>
            <AccountCircleRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Consultar inquilino on-chain</ListItemText>
        </MenuItem>
      )}

      {agreementAddress && contractStatus && contractStatus !== "cancelled" && (
        <MenuItem
          onClick={() => {
            onCloseMenu()
            navigator.clipboard.writeText(agreementAddress)
          }}
        >
          <ListItemIcon>
            <ContentCopyRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copiar dir. del contrato</ListItemText>
        </MenuItem>
      )}

      {(!contractStatus || contractStatus === "cancelled") && (
        <MenuItem
          onClick={() => {
            onCloseMenu()
            onManageContract()
          }}
        >
          <ListItemIcon>
            <AddCardRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Gestionar Contrato</ListItemText>
        </MenuItem>
      )}

      {contractStatus === "draft" && (
        <MenuItem
          onClick={() => {
            onCloseMenu()
            onCancelContract(property.id)
          }}
        >
          <ListItemIcon>
            <CancelRoundedIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: "error.main" }}>Cancelar contrato (on-chain)</ListItemText>
        </MenuItem>
      )}

      {contractStatus === "draft" && (
        <MenuItem
          onClick={() => {
            onCloseMenu()
            onUnlinkContract(property.id)
          }}
        >
          <ListItemIcon>
            <CancelRoundedIcon fontSize="small" color="warning" />
          </ListItemIcon>
          <ListItemText sx={{ color: "warning.main" }}>Desvincular (sólo local)</ListItemText>
        </MenuItem>
      )}

      {contractStatus === "draft" && !landlordApproved && (
        <MenuItem
          onClick={() => {
            onCloseMenu()
            if (agreementAddress) {
              onSignContract(property.id)
            }
          }}
        >
          <ListItemIcon>
            <HistoryEduRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Firmar contrato (dueño)</ListItemText>
        </MenuItem>
      )}

      {contractStatus === "active" && (
        <MenuItem
          onClick={() => {
            onCloseMenu()
            if (agreementAddress) {
              onCancelContract(property.id)
            }
          }}
        >
          <ListItemIcon>
            <CancelRoundedIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: "error.main" }}>Finalizar contrato</ListItemText>
        </MenuItem>
      )}
    </Menu>
  )
}
