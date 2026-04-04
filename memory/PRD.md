# Arcolia Website - PRD

## Original Problem Statement
Build a token-gated Arcolia website with medieval fantasy theme. Traditional username/password authentication with email verification using Resend. Forgot password flow with email reset link.

## Architecture
- **Frontend**: React 18 SPA
- **Backend**: FastAPI with MongoDB
- **Auth**: JWT tokens with email verification
- **Email**: Resend (requires API key)
- **Token**: ARCO on Polygon (0x6D00EABF782Df498738f29e6558157d36518C663)

## Email Service Setup
To enable email sending:
1. Create free account at **resend.com**
2. Get your API key from the dashboard
3. Add to `/app/backend/.env`:
   ```
   RESEND_API_KEY=re_your_api_key_here
   SENDER_EMAIL=your-verified-email@domain.com
   ```
4. Restart backend: `sudo supervisorctl restart backend`

Note: Until configured, tokens are returned in API responses for testing.

## User Flow
1. **Gate** → Click "Enter Arcolia"
2. **Signup** → Username, email, password
3. **Email Verification** → Click link in email (or enter token)
4. **Login** → Email + password
5. **Forgot Password** → Enter email → Receive reset link → Set new password
6. **Guild Hall** → Main hub with username displayed
7. **Wallet Connect** → Inside Guild Hall for deeper areas

## What's Been Implemented (Jan 2026)

### Email Service
- [x] Resend integration for transactional emails
- [x] Beautiful HTML email templates (Arcolia themed)
- [x] Verification emails with 24hr expiry
- [x] Password reset emails with 1hr expiry
- [x] Fallback mode when API key not configured

### Authentication
- [x] Signup with username, email, password
- [x] Email verification (link or manual token)
- [x] Login with JWT tokens
- [x] Forgot password flow
- [x] Reset password with new password
- [x] URL parameter handling (?verify=token, ?reset=token)
- [x] Auto-verification when clicking email link

### Forms
- [x] Login form with forgot password link
- [x] Signup form
- [x] Email verification form
- [x] Forgot password form
- [x] Reset password form
- [x] All forms have proper validation

## API Endpoints
- POST /api/auth/signup
- POST /api/auth/verify-email
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/link-wallet
- POST /api/auth/unlink-wallet
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- POST /api/auth/resend-verification

## Deployment Status (April 2026)
- [x] Backend health check passing
- [x] All auth endpoints functional
- [x] Resend email integration working
- [x] Fixed hardcoded image URLs (now use env vars)
- [x] Fixed corrupted .gitignore file
- [x] requirements.txt updated with all dependencies
- [x] Role management system (Founders can assign roles)
- [x] Guild Settings panel (Founders can customize role names and room access)
- [x] Ban/Delete members functionality
- [x] **Arcolia Code & Oath** - First-time entry popup with rules
- [x] **ARCO Token Gating** - Rooms require specific ARCO amounts:
  - The Commons: 1 ARCO
  - The Sanctuary: 500,000 ARCO
  - Treasury: 5,000,000 ARCO
  - Archives: 25,000,000 ARCO
  - Council Chamber: 100,000,000 ARCO
  - Founders & Elders bypass all requirements
- [x] **Chat Rooms** - Message board in each room
- [x] **Donation System** - Support Arcolia with crypto (ARCO, BTC, ETH, MATIC, SOL, PAXG)
  - Treasury wallet: 0xd858646D90cA89a987942509208b272983d53B65
  - Manual ranking upgrades by Founders
- [x] **Manual User Verification** - Founders can manually verify/unverify user emails from Admin Panel

**Note on Blockchain Warning:** The deployment agent flags Web3/blockchain as a blocker. This is a FALSE POSITIVE because all Web3 code (WalletConnect, ethers.js, token balance checks) runs ENTIRELY CLIENT-SIDE in the user's browser. The FastAPI backend has zero blockchain code.

## Prioritized Backlog

### P0 (Next Phase)
- [ ] Build The Sanctuary page
- [ ] Build Treasury page
- [ ] Custom domain setup

### P1 (Future)
- [ ] Unlock Archives area
- [ ] Unlock Council Chamber
- [ ] User profile editing
- [ ] Change password (when logged in)

### P2 (Nice to Have)
- [x] WalletConnect support in Guild Hall (DONE)
- [ ] Social login (Discord, Twitter)
- [ ] Achievement badges
