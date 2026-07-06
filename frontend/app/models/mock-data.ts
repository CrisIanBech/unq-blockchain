import type { OwnedProperty, Rental, Listing } from "./types"

const now = new Date(2026, 5, 24) // June 24 2026

function isoMonth(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`
}

function shortAddr(seed: string) {
  return `0x${seed}…${seed.slice(0, 4)}`
}

export const initialOwnedProperties: OwnedProperty[] = [
  {
    id: "own-1",
    name: "Depto Palermo Soho",
    type: "departamento",
    address: "Honduras 4500, Palermo, CABA",
    imageUrl: "/images/prop-1.png",
    propertyId: 1,
    realEstateToken: "0x1f9a2bC4eE7d8F0a3B5c6D7e8F90123456789abc",
    rentalToken: "",
    agreementAddress: undefined,
    rentalNFTAddress: undefined,
    monthlyRent: 720,
    tenant: "0xMockTenant1",
    tenantSince: "2025-09-01",
    nextChargeDate: "2026-07-01",
    availableToWithdraw: 1440,
    contractStatus: "active",
    smartlock: { id: "lock-1", installed: true, nfcEnabled: false, unlocked: false },
    payments: [
      { month: isoMonth(2026, 5), amount: 720, status: "overdue" },
      { month: isoMonth(2026, 4), amount: 720, status: "paid", paidAt: "2026-05-03T10:21:00Z", txHash: "0x9a1f…44de" },
      { month: isoMonth(2026, 3), amount: 720, status: "paid", paidAt: "2026-04-02T09:05:00Z", txHash: "0x77bc…12aa" },
      { month: isoMonth(2026, 2), amount: 700, status: "paid", paidAt: "2026-03-01T14:30:00Z", txHash: "0x33de…98fa" },
    ],
  },
  {
    id: "own-2",
    name: "Casa Villa Crespo",
    type: "casa",
    address: "Aguirre 800, Villa Crespo, CABA",
    imageUrl: "/images/prop-2.png",
    propertyId: 2,
    realEstateToken: "0x2a8b3cD5fF8e9012345678901234567890abcdef",
    rentalToken: "",
    agreementAddress: undefined,
    rentalNFTAddress: undefined,
    monthlyRent: 1100,
    tenant: "0xMockTenant2",
    tenantSince: "2024-12-01",
    nextChargeDate: "2026-07-05",
    availableToWithdraw: 0,
    contractStatus: "active",
    smartlock: { id: "lock-2", installed: true, nfcEnabled: false, unlocked: false },
    payments: [
      { month: isoMonth(2026, 5), amount: 1100, status: "paid", paidAt: "2026-06-04T11:00:00Z", txHash: "0x55ab…77cd" },
      { month: isoMonth(2026, 4), amount: 1100, status: "paid", paidAt: "2026-05-05T08:15:00Z", txHash: "0x12cd…33ef" },
      { month: isoMonth(2026, 3), amount: 1100, status: "paid", paidAt: "2026-04-04T16:45:00Z", txHash: "0x88fa…21bc" },
    ],
  },
  {
    id: "own-3",
    name: "PH Caballito",
    type: "ph",
    address: "Rojas 150, Caballito, CABA",
    imageUrl: "/images/prop-3.png",
    propertyId: 3,
    realEstateToken: "0x3b9c4dE6001f2345678901234567890abcdef012",
    rentalToken: "",
    agreementAddress: undefined,
    rentalNFTAddress: undefined,
    monthlyRent: 560,
    tenant: null,
    nextChargeDate: undefined,
    availableToWithdraw: 280,
    contractStatus: "draft",
    smartlock: { id: "lock-3", installed: false, nfcEnabled: false, unlocked: false },
    payments: [
      { month: isoMonth(2026, 2), amount: 560, status: "paid", paidAt: "2026-03-02T10:00:00Z", txHash: "0xaa11…bb22" },
    ],
  },
]

export const initialRentals: Rental[] = [
  {
    id: "rent-1",
    name: "Loft Distrito Tecnológico",
    type: "departamento",
    address: "Av. Sáenz 400, Parque Patricios, CABA",
    imageUrl: "/images/prop-4.png",
    landlord: "0xMockLandlord1",
    monthlyRent: 640,
    nextPaymentDate: "2026-07-01",
    propertyId: 4,
    agreementAddress: "0x3A5B8c9dE01f2345678901234567890abcdeF456",
    rentalNFTAddress: "0x7F2a9B0cD4e5F6012345678901234567890abcDE",
    smartlockId: "lock-tenant-1",
    hasKey: true,
    payments: [
      { month: isoMonth(2026, 4), amount: 640, status: "paid", paidAt: "2026-05-01T09:00:00Z", txHash: "0x4d5e…6f70" },
      { month: isoMonth(2026, 3), amount: 640, status: "paid", paidAt: "2026-04-01T09:00:00Z", txHash: "0x7a8b…9c0d" },
      { month: isoMonth(2026, 2), amount: 620, status: "paid", paidAt: "2026-03-01T09:00:00Z", txHash: "0x1e2f…3a4b" },
    ],
  },
  {
    id: "rent-2",
    name: "Oficina Microcentro",
    type: "oficina",
    address: "San Martín 200, Microcentro, CABA",
    imageUrl: "/images/prop-6.png",
    landlord: "0xMockLandlord2",
    monthlyRent: 480,
    nextPaymentDate: "2026-06-30",
    propertyId: 5,
    agreementAddress: "0x9E8d7C6bA50f12345678901234567890abcDEF12",
    rentalNFTAddress: "0x4B1a2C3dE90f12345678901234567890abcDEF98",
    smartlockId: "lock-tenant-2",
    hasKey: false,
    payments: [
      { month: isoMonth(2026, 4), amount: 480, status: "paid", paidAt: "2026-05-02T12:00:00Z", txHash: "0xcc11…dd22" },
      { month: isoMonth(2026, 3), amount: 480, status: "paid", paidAt: "2026-04-02T12:00:00Z", txHash: "0xee33…ff44" },
    ],
  },
]

export const initialListings: Listing[] = [
  {
    id: "list-1",
    name: "Depto luminoso Recoleta",
    type: "departamento",
    address: "Av. Callao 1100, Recoleta, CABA",
    imageUrl: "/images/prop-1.png",
    monthlyRent: 850,
    lat: -34.5955,
    lng: -58.3936,
    beds: 2,
    baths: 1,
    m2: 65,
    reviews: [
      { id: "r1", author: "0xReviewer1", rating: 5, comment: "Excelente ubicación y el smartlock funcionó perfecto.", date: "2026-04-10" },
      { id: "r2", author: "0xReviewer2", rating: 4, comment: "Muy lindo, un poco ruidoso de noche.", date: "2026-02-22" },
    ],
  },
  {
    id: "list-2",
    name: "Casa con patio Saavedra",
    type: "casa",
    address: "Vidal 3500, Saavedra, CABA",
    imageUrl: "/images/prop-2.png",
    monthlyRent: 1300,
    lat: -34.5546,
    lng: -58.4783,
    beds: 3,
    baths: 2,
    m2: 140,
    reviews: [
      { id: "r3", author: "0xF12a...77Bc", rating: 5, comment: "Ideal para familia, contrato on-chain súper claro.", date: "2026-03-15" },
    ],
  },
  {
    id: "list-3",
    name: "PH reciclado Boedo",
    type: "ph",
    address: "Boedo 900, Boedo, CABA",
    imageUrl: "/images/prop-3.png",
    monthlyRent: 600,
    lat: -34.6266,
    lng: -58.4163,
    beds: 2,
    baths: 1,
    m2: 78,
    reviews: [
      { id: "r4", author: "0x88Ce...01Aa", rating: 4, comment: "Muy buen estado, pagos en stablecoin sin fricción.", date: "2026-05-01" },
      { id: "r5", author: "0x4D2e...8Bf1", rating: 5, comment: "El dueño responde rápido. Recomendado.", date: "2026-01-19" },
    ],
  },
  {
    id: "list-4",
    name: "Loft Puerto Madero",
    type: "departamento",
    address: "Olga Cossettini 700, Puerto Madero, CABA",
    imageUrl: "/images/prop-5.png",
    monthlyRent: 1600,
    lat: -34.6118,
    lng: -58.3626,
    beds: 1,
    baths: 1,
    m2: 55,
    reviews: [
      { id: "r6", author: "0x9C7a...2Df4", rating: 5, comment: "Vista increíble, vale cada USDC.", date: "2026-04-28" },
    ],
  },
  {
    id: "list-5",
    name: "Oficina Belgrano",
    type: "oficina",
    address: "Cabildo 2200, Belgrano, CABA",
    imageUrl: "/images/prop-6.png",
    monthlyRent: 700,
    lat: -34.5614,
    lng: -58.4566,
    beds: 0,
    baths: 1,
    m2: 90,
    reviews: [],
  },
  {
    id: "list-6",
    name: "Local comercial San Telmo",
    type: "local",
    address: "Defensa 900, San Telmo, CABA",
    imageUrl: "/images/prop-4.png",
    monthlyRent: 950,
    lat: -34.6189,
    lng: -58.3717,
    beds: 0,
    baths: 1,
    m2: 110,
    reviews: [
      { id: "r7", author: "0xF12a...77Bc", rating: 3, comment: "Buena zona, la cerradura NFC tardó en sincronizar.", date: "2026-02-08" },
    ],
  },
]

export const MAP_CENTER = { lat: -34.6037, lng: -58.4 }

export { shortAddr, now }
