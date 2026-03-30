import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { polygon } from 'wagmi/chains'

// Get project ID from environment or use a placeholder
// You'll need to get a real project ID from https://cloud.walletconnect.com/
const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'demo'

const metadata = {
  name: 'Arcolia',
  description: 'Access Without Permission - Token-gated guild access',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://arcolia.app',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// Configure chains - Polygon only for ARCO token
const chains = [polygon]

// Create wagmi config
export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  enableWalletConnect: true,
  enableInjected: true,
  enableEIP6963: true,
  enableCoinbase: false,
})

// Create modal
createWeb3Modal({
  wagmiConfig,
  projectId,
  chains,
  defaultChain: polygon,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#c9a962',
    '--w3m-border-radius-master': '8px',
  }
})

export { projectId, chains }
