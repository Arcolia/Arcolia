# Arcolia Website - PRD

## Original Problem Statement
Build a token-gated Arcolia website with medieval fantasy theme. Gate landing page with wallet connection, ARCO token gating on Polygon. Upon access, enter Guild Hall with member info, navigation to different areas.

## Architecture
- **Type**: React SPA + FastAPI backend
- **Stack**: React 18, ethers.js, FastAPI
- **Token**: ARCO on Polygon (0x6a931530fb7946dC95fd9d7245157661D7B0B375)

## User Flow
1. **Gate** → Click "Enter Arcolia"
2. **Wallet Connect** → Connect MetaMask
3. **Token Check** → Verify ARCO holdings (min 1 token)
4. **Guild Hall** → Access granted, enter Guild Hall
5. **Navigation** → Library, Throne Room, or Leave Guild

## Member Tiers (based on ARCO holdings)
- **Initiate**: < 10 ARCO
- **Squire**: 10-99 ARCO
- **Knight**: 100-999 ARCO
- **Noble**: 1,000-9,999 ARCO
- **Elder**: 10,000+ ARCO

## What's Been Implemented (Jan 2026)
### Gate (Landing Page)
- [x] Medieval gate background with "Arcolia" branding
- [x] Enter Arcolia button (visible on mobile)
- [x] Wallet connect section with MetaMask
- [x] ARCO token balance check
- [x] Access Granted/Denied states
- [x] "Enter the Guild Hall" button after access granted
- [x] Disconnect option

### Guild Hall
- [x] Beautiful stained glass library background
- [x] "The Guild Hall" title
- [x] Center member card:
  - Member status badge (Initiate → Elder)
  - Wallet address (truncated)
  - ARCO token balance
- [x] Navigation to The Library (left)
- [x] Navigation to Throne Room (right)
- [x] Coming Soon locked areas (Archives, Sanctum)
- [x] Leave Guild button → returns to gate

## Files
- `/app/frontend/src/App.js` - Main app with gate/guild views
- `/app/frontend/src/GuildHall.js` - Guild Hall component
- `/app/frontend/src/GuildHall.css` - Guild Hall styles
- `/app/frontend/src/App.css` - Gate styles

## Test Mode
Add `?test=guild` to URL to preview Guild Hall with demo data

## Prioritized Backlog

### P0 (Next Phase)
- [ ] Build The Library page
- [ ] Build Throne Room (Council Chamber + Treasury)
- [ ] Unlock Archives area
- [ ] Unlock Sanctum area

### P1 (Future)
- [ ] User profiles with ENS/custom usernames
- [ ] Member directory
- [ ] Announcement board
- [ ] Governance/voting in Council Chamber
- [ ] Treasury display

### P2 (Nice to Have)
- [ ] Achievement badges
- [ ] Activity history
- [ ] Social features
- [ ] Mobile app wrapper
