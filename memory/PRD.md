# Arcolia Website - PRD

## Original Problem Statement
Build a token-gated Arcolia website with medieval fantasy theme. Traditional username/password authentication with email verification. Users access Guild Hall after login. Inside Guild Hall, wallet connect is needed to access deeper areas (Sanctuary, Treasury).

## Architecture
- **Frontend**: React 18 SPA
- **Backend**: FastAPI with MongoDB
- **Auth**: JWT tokens with email verification
- **Token**: ARCO on Polygon (0x6D00EABF782Df498738f29e6558157d36518C663)

## User Flow
1. **Gate** → Click "Enter Arcolia"
2. **Login/Signup** → Create account or login
3. **Email Verification** → Verify email to activate account
4. **Guild Hall** → Access main hub with username displayed
5. **Wallet Connect** → Connect wallet in Guild Hall to access deeper areas
6. **Token Gating** → Sanctuary & Treasury require ARCO tokens

## Member Tiers (based on ARCO holdings)
- **Member**: No wallet connected
- **Initiate**: < 10 ARCO
- **Squire**: 10-99 ARCO
- **Knight**: 100-999 ARCO
- **Noble**: 1,000-9,999 ARCO
- **Elder**: 10,000+ ARCO

## What's Been Implemented (Jan 2026)

### Authentication System
- [x] Signup with username, email, password
- [x] Email verification (token-based)
- [x] Login with JWT tokens
- [x] Password hashing (SHA-256)
- [x] Username/email uniqueness validation
- [x] Resend verification email

### Gate (Landing Page)
- [x] Medieval gate background
- [x] Login form with email/password
- [x] Signup form with username/email/password
- [x] Email verification form
- [x] Form navigation (login ↔ signup ↔ verify)

### Guild Hall
- [x] Beautiful stained glass library background
- [x] Username displayed in member card
- [x] Member status badge
- [x] Wallet connect button
- [x] Wallet connect modal
- [x] ARCO balance display (when wallet connected)
- [x] Navigation locked without wallet (Sanctuary, Treasury)
- [x] Coming Soon locked areas (Archives, Council Chamber)
- [x] Leave Guild button in header

### PWA Support
- [x] manifest.json for installability
- [x] Service worker for offline support
- [x] Install prompt on mobile

## API Endpoints
- POST /api/auth/signup
- POST /api/auth/verify-email
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/link-wallet
- POST /api/auth/unlink-wallet
- POST /api/auth/resend-verification

## Prioritized Backlog

### P0 (Next Phase)
- [ ] Build The Sanctuary page
- [ ] Build Treasury page
- [ ] Integrate email sending service (SendGrid/Resend)
- [ ] Forgot password flow

### P1 (Future)
- [ ] Unlock Archives area
- [ ] Unlock Council Chamber
- [ ] User profile editing
- [ ] Achievement badges
- [ ] Activity history

### P2 (Nice to Have)
- [ ] WalletConnect support in Guild Hall
- [ ] Multiple wallet support
- [ ] Mobile app wrapper
