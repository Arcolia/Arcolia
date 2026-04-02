# Arcolia Test Credentials

## Founder Account (Admin Access)
- **Email:** test@example.com
- **Password:** test123456
- **Role:** Founder
- **Status:** Verified

## Founder Account (User's Account)
- **Email:** mattjohnreid67@outlook.com
- **Username:** Arcolia
- **Role:** Founder
- **Status:** Verified

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

## Admin Endpoints (Founders Only)
- GET /api/users - List all users
- POST /api/auth/update-role - Change user role
- POST /api/admin/ban-user?user_id={id} - Ban/unban user
- POST /api/admin/delete-user?user_id={id} - Delete user permanently
- GET /api/admin/settings - Get guild settings
- POST /api/admin/settings - Update guild settings
