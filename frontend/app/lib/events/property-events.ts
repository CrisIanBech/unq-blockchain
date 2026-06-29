export interface PropertyTransferEvent {
  tokenId: bigint;
  from: string;
  to: string;
  txHash: string;
}

export type PropertyTransferListener = (event: PropertyTransferEvent) => void;

export interface PropertyEvents {
  subscribeToTransfer(listener: PropertyTransferListener): () => void;
}
