# Arcolia Test Credentials

## Test User Account
- **Email:** test@example.com
- **Password:** test123456
- **Status:** Created but NOT verified (need to verify email first)

## API Keys (Backend .env)
- **Resend API Key:** re_GaAMoW8T_AbgEp5LgFGSgGWFcHEFPdPRc
- **Sender Email:** onboarding@resend.dev

## Frontend Keys (.env)
- **WalletConnect Project ID:** 2cfa96ac5508648ee6efcf6cd3566358
- **ARCO Token Address:** 0x6D00EABF782Df498738f29e6558157d36518C663

## URLs
- **Preview URL:** https://page-builder-225.preview.emergentagent.com
- **Backend API:** https://page-builder-225.preview.emergentagent.com/api

## Auth Flow Testing
1. Signup: POST /api/auth/signup with {username, email, password}
2. Verify: POST /api/auth/verify-email with {token} (token from email or API response)
3. Login: POST /api/auth/login with {email, password}
4. Protected: GET /api/auth/me with Authorization: Bearer {token}
