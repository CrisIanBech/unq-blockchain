import { ListItemIcon, Menu, MenuItem } from "@mui/material"
import PersonSearchRoundedIcon from "@mui/icons-material/PersonSearchRounded"
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded"
import DrawRoundedIcon from "@mui/icons-material/DrawRounded"
import CancelRoundedIcon from "@mui/icons-material/CancelRounded"
import type { OwnedProperty } from "@models/types"

interface PropertyMenuProps {
  property: OwnedProperty
  menuEl: HTMLElement | null
  onCloseMenu: () => void
  onConsultTenant: () => void
  onCreateContract: (id: string, tenant: string, rent: number) => void
  onSignContract: (id: string) => void
  onCancelContract: (id: string) => void
}

export function PropertyMenu({
  property,
  menuEl,
  onCloseMenu,
  onConsultTenant,
  onCreateContract,
  onSignContract,
  onCancelContract,
}: PropertyMenuProps) {
  return (
    <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={onCloseMenu}>
      <MenuItem onClick={onConsultTenant}>
        <ListItemIcon>
          <PersonSearchRoundedIcon fontSize="small" />
        </ListItemIcon>
        Consultar inquilino
      </MenuItem>
      {property.contractStatus !== "active" && (
        <MenuItem
          onClick={() => {
            onCloseMenu()
            onCreateContract(property.id, "0x000a...New1", property.monthlyRent)
          }}
        >
          <ListItemIcon>
            <DescriptionRoundedIcon fontSize="small" />
          </ListItemIcon>
          Crear contrato
        </MenuItem>
      )}
      {property.contractStatus === "draft" && (
        <MenuItem
          onClick={() => {
            onCloseMenu()
            onSignContract(property.id)
          }}
        >
          <ListItemIcon>
            <DrawRoundedIcon fontSize="small" />
          </ListItemIcon>
          Firmar contrato
        </MenuItem>
      )}
      {property.contractStatus === "active" && (
        <MenuItem
          onClick={() => {
            onCloseMenu()
            onCancelContract(property.id)
          }}
        >
          <ListItemIcon>
            <CancelRoundedIcon fontSize="small" />
          </ListItemIcon>
          Cancelar cooperativamente
        </MenuItem>
      )}
    </Menu>
  )
}
