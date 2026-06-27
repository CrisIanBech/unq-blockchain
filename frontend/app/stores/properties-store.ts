import { create } from "zustand"
import type { OwnedProperty, Rental, PaymentRecord } from "@models/types"
import { initialOwnedProperties, initialRentals } from "@models/mock-data"
import { useUserStore } from "./user-store"

const fakeTx = () => `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`

export interface AddPropertyInput {
  name: string
  type: "departamento" | "casa" | "ph" | "local" | "oficina"
  address: string
  monthlyRent: number
  realEstateToken: string
  rentalToken: string
}

interface PropertiesState {
  ownedProperties: OwnedProperty[]
  rentals: Rental[]
  mintAndLoadProperty: (input: AddPropertyInput) => void
  withdrawRent: (propertyId: string) => void
  payMonthlyRent: (rentalId: string, month: string) => void
  createContract: (propertyId: string, tenant: string, rent: number) => void
  signContract: (propertyId: string) => void
  cancelContract: (propertyId: string) => void
}

export const usePropertiesStore = create<PropertiesState>((set, get) => ({
  ownedProperties: initialOwnedProperties,
  rentals: initialRentals,

  mintAndLoadProperty: (input) => {
    const tx = fakeTx()
    const newProp: OwnedProperty = {
      id: `own-${Date.now()}`,
      name: input.name,
      type: input.type,
      address: input.address,
      imageUrl: "/images/prop-5.png",
      realEstateToken: input.realEstateToken,
      rentalToken: input.rentalToken,
      monthlyRent: input.monthlyRent,
      tenant: null,
      availableToWithdraw: 0,
      contractStatus: "draft",
      smartlock: { id: `lock-${Date.now()}`, installed: false, nfcEnabled: false, unlocked: false },
      payments: [],
    }
    set((state) => ({
      ownedProperties: [newProp, ...state.ownedProperties]
    }))
    useUserStore.getState().pushToast({
      message: `Tokens minteados y propiedad "${input.name}" cargada on-chain`,
      severity: "success",
      txHash: tx,
    })
  },

  withdrawRent: (propertyId) => {
    let message = ""
    let tx = ""
    let addedBalance = 0
    set((state) => {
      const updated = state.ownedProperties.map((p) => {
        if (p.id !== propertyId) return p
        if (p.availableToWithdraw <= 0) return p
        addedBalance = p.availableToWithdraw
        tx = fakeTx()
        message = `Retiraste ${p.availableToWithdraw} USDC de "${p.name}"`
        return { ...p, availableToWithdraw: 0 }
      })
      return {
        ownedProperties: updated,
      }
    })
    if (addedBalance > 0) {
      useUserStore.getState().adjustBalance(addedBalance)
    }
    if (message) {
      useUserStore.getState().pushToast({ message, severity: "success", txHash: tx })
    }
  },

  payMonthlyRent: (rentalId, month) => {
    const r = get().rentals.find(x => x.id === rentalId)
    if (!r) return

    const already = r.payments.find((p) => p.month === month && p.status === "paid")
    if (already) {
      useUserStore.getState().pushToast({ message: `El mes ${month} ya estaba pagado`, severity: "warning" })
      return
    }
    
    const balance = useUserStore.getState().balance
    if (balance < r.monthlyRent) {
      useUserStore.getState().pushToast({ message: "Saldo USDC insuficiente", severity: "error" })
      return
    }

    const tx = fakeTx()
    const record: PaymentRecord = {
      month,
      amount: r.monthlyRent,
      status: "paid",
      paidAt: new Date().toISOString(),
      txHash: tx,
    }

    useUserStore.getState().adjustBalance(-r.monthlyRent)
    set((s) => ({
      rentals: s.rentals.map((item) => {
        if (item.id !== rentalId) return item
        const others = item.payments.filter((p) => p.month !== month)
        return {
          ...item,
          payments: [record, ...others].sort((a, b) => b.month.localeCompare(a.month))
        }
      })
    }))

    useUserStore.getState().pushToast({
      message: `Pagaste ${r.monthlyRent} USDC — ${r.name} (${month})`,
      severity: "success",
      txHash: tx,
    })
  },

  createContract: (propertyId, tenant, rent) => {
    set((s) => ({
      ownedProperties: s.ownedProperties.map((p) =>
        p.id === propertyId ? { ...p, contractStatus: "draft", tenant, monthlyRent: rent } : p
      )
    }))
    useUserStore.getState().pushToast({ message: "Contrato de alquiler creado (borrador on-chain)", severity: "info", txHash: fakeTx() })
  },

  signContract: (propertyId) => {
    set((s) => ({
      ownedProperties: s.ownedProperties.map((p) =>
        p.id === propertyId
          ? {
              ...p,
              contractStatus: "active",
              tenantSince: new Date().toISOString().slice(0, 10),
              nextChargeDate: "2026-08-01",
            }
          : p
      )
    }))
    useUserStore.getState().pushToast({ message: "Contrato firmado y activado", severity: "success", txHash: fakeTx() })
  },

  cancelContract: (propertyId) => {
    set((s) => ({
      ownedProperties: s.ownedProperties.map((p) =>
        p.id === propertyId ? { ...p, contractStatus: "cancelled", tenant: null, nextChargeDate: undefined } : p
      )
    }))
    useUserStore.getState().pushToast({ message: "Contrato cancelado cooperativamente", severity: "info", txHash: fakeTx() })
  }
}))
export type UsePropertiesStoreReturn = ReturnType<typeof usePropertiesStore>
