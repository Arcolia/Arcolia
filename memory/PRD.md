# Arcolia Landing Page - PRD

## Original Problem Statement
Build a landing page matching provided image with medieval gate, "Arcolia" title, "Access Without Permission" subtitle, and "Enter Arcolia" button. Wallet connect should only appear AFTER clicking Enter Arcolia. Token-gated access requiring ARCO token to enter.

## Architecture
- **Type**: Static HTML/CSS/JS landing page
- **Stack**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **External Libraries**: ethers.js (CDN) for Web3 wallet connection

## User Personas
1. **ARCO Token Holders**: Can connect wallet and enter Arcolia
2. **Non-holders**: See access denied message, prompted to acquire ARCO tokens

## Core Requirements (Static)
- [x] Landing page matches provided design image exactly
- [x] Background uses provided medieval gate image
- [x] Wallet connect only appears AFTER clicking "Enter Arcolia"
- [x] MetaMask wallet connection support
- [x] ARCO token gating - must hold tokens to enter
- [x] Error handling for missing MetaMask extension

## What's Been Implemented (Jan 2026)
- [x] Landing page with exact design match
- [x] Full-screen background image with medieval gate
- [x] Invisible clickable "Enter Arcolia" button overlay (aligns with image button)
- [x] Wallet connect section appears only after clicking button
- [x] Dark gradient covers image button when wallet section shown
- [x] ARCO token balance checking via ERC20 contract
- [x] Access granted/denied states based on token holdings
- [x] Demo mode when token address not configured
- [x] Multi-network support (Ethereum, Sepolia, Polygon)
- [x] Account/network change event listeners

## Token Gating Configuration
```javascript
// Update ARCO_TOKEN_CONFIG in wallet.js with actual token addresses:
const ARCO_TOKEN_CONFIG = {
    1: '0x...', // Ethereum Mainnet
    137: '0x...', // Polygon
    11155111: '0x...', // Sepolia Testnet
};
const MIN_ARCO_REQUIRED = 1; // Minimum tokens needed
```

## Prioritized Backlog

### P0 (Next Phase)
- [ ] Configure actual ARCO token contract addresses
- [ ] Door opening animation when access granted
- [ ] Backend API for additional verification

### P1 (Future)
- [ ] Signature verification for secure auth
- [ ] Protected content area after wallet connect
- [ ] WalletConnect protocol support

### P2 (Nice to Have)
- [ ] Multiple wallet provider support
- [ ] NFT-based access tiers
- [ ] Transaction history display

## Next Tasks
1. Get actual ARCO token contract addresses and configure
2. Implement door opening animation
3. Add protected content that loads after access granted
