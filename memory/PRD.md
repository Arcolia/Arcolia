# Arcolia Landing Page - PRD

## Original Problem Statement
Build a landing page that looks exactly like the provided image showing a medieval fantasy gate with "Arcolia" title, "Access Without Permission" subtitle, and "Enter Arcolia" button. Add wallet connect for cryptocurrency wallets like MetaMask. Static landing page for now, with door animation planned for future.

## Architecture
- **Type**: Static HTML/CSS/JS landing page
- **Stack**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **External Libraries**: ethers.js (CDN) for Web3 wallet connection

## User Personas
1. **Crypto/Web3 Users**: Want to connect MetaMask wallet to access Arcolia
2. **General Visitors**: Curious about Arcolia, see the landing page

## Core Requirements (Static)
- [x] Landing page matches provided design image exactly
- [x] Background uses provided medieval gate image
- [x] "Enter Arcolia" button triggers wallet connect flow
- [x] MetaMask wallet connection support
- [x] Error handling for missing MetaMask extension
- [x] Responsive design

## What's Been Implemented (Jan 2026)
- [x] Landing page with exact design match
- [x] Full-screen background image with medieval gate
- [x] Transparent clickable "Enter Arcolia" button overlay
- [x] Wallet connect section with MetaMask integration
- [x] Connect/disconnect wallet functionality
- [x] Display wallet address, balance, and network
- [x] Error handling and messaging
- [x] Multi-network support (Ethereum, Polygon, Arbitrum, etc.)
- [x] Account/network change event listeners

## Prioritized Backlog

### P0 (Next Phase)
- [ ] Door opening animation when entering
- [ ] Backend API for wallet authentication
- [ ] JWT token generation after wallet verification

### P1 (Future)
- [ ] Signature verification for secure auth
- [ ] Protected content area after wallet connect
- [ ] User session management
- [ ] WalletConnect protocol support (beyond MetaMask)

### P2 (Nice to Have)
- [ ] Multiple wallet provider support
- [ ] NFT-gated access
- [ ] Transaction history display

## Next Tasks
1. Implement door opening animation (CSS/JS)
2. Add backend FastAPI for wallet authentication
3. Implement signature verification flow
