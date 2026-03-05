# Arcolia Landing Page - PRD

## Original Problem Statement
Build a landing page matching provided image with medieval gate, "Arcolia" title, "Access Without Permission" subtitle, and "Enter Arcolia" button. Token-gated access requiring ARCO token on Polygon to enter.

## Architecture
- **Type**: Static HTML/CSS/JS landing page
- **Stack**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **External Libraries**: ethers.js (CDN) for Web3 wallet connection

## Token Gating Configuration
- **Network**: Polygon (Chain ID: 137)
- **ARCO Contract**: `0x6a931530fb7946dC95fd9d7245157661D7B0B375`
- **Minimum Required**: 1 ARCO token

## What's Been Implemented (Jan 2026)
- [x] Landing page matching design with medieval gate
- [x] Visible "Enter Arcolia" button (works on mobile)
- [x] Wallet connect appears only after clicking button
- [x] Real ARCO token gating on Polygon
- [x] Access granted/denied states based on holdings
- [x] Brighter bottom section showing cobblestone
- [x] MetaMask integration with error handling
- [x] Multi-network support with Polygon as primary

## Files
- `/app/index.html` - Main landing page
- `/app/style.css` - Styling
- `/app/wallet.js` - Wallet connection & token gating logic

## Next Tasks
- [ ] Door opening animation when access granted
- [ ] Protected content area after successful entry
- [ ] Add support for WalletConnect
