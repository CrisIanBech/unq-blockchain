import { createConfig, http, injected } from "wagmi"
import { localhost } from "wagmi/chains"

export const localhostChain = {
  ...localhost,
  rpcUrls: {
    ...localhost.rpcUrls,
    default: { http: ["http://127.0.0.1:8545"] },
  },
}

export const config = createConfig({
  chains: [localhostChain],
  connectors: [injected()],
  transports: {
    [localhostChain.id]: http(),
  },
  ssr: false,
})

declare module "wagmi" {
  interface Register {
    config: typeof config
  }
}
