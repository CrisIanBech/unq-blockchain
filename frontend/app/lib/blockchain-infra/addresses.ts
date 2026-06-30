interface BlockchainAddresses {
  propertyNft: string;
  rentalFactory: string;
  usdc: string;
  reviewSystem: string;
}

export const CONTRACT_ADDRESSES: BlockchainAddresses = {
  propertyNft: (import.meta.env.VITE_PROPERTY_NFT_ADDRESS as string) || "",
  rentalFactory: (import.meta.env.VITE_RENTAL_FACTORY_ADDRESS as string) || "",
  usdc: (import.meta.env.VITE_USDC_ADDRESS as string) || "",
  reviewSystem: (import.meta.env.VITE_REVIEW_SYSTEM_ADDRESS as string) || "",
};
