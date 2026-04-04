import os
import secrets
import hashlib
import asyncio
import resend
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
from bson import ObjectId
import jwt
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Arcolia API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'arcolia')
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
APP_URL = os.environ.get('APP_URL', 'http://localhost:3000')

# Initialize Resend
if RESEND_API_KEY and RESEND_API_KEY != 'your_resend_api_key_here':
    resend.api_key = RESEND_API_KEY
    EMAIL_ENABLED = True
else:
    EMAIL_ENABLED = False
    print("⚠️ Email service not configured. Set RESEND_API_KEY in .env")

# MongoDB connection
client = MongoClient(MONGO_URL)
db = client[DB_NAME]
users_collection = db['users']
verification_tokens_collection = db['verification_tokens']
settings_collection = db['settings']
messages_collection = db['messages']
donations_collection = db['donations']

# Create indexes
users_collection.create_index("email", unique=True)
users_collection.create_index("username", unique=True)
messages_collection.create_index([("room", 1), ("created_at", -1)])

# Treasury wallet for donations
TREASURY_WALLET = "0xd858646D90cA89a987942509208b272983d53B65"

# Default settings for roles and rooms with ARCO requirements
DEFAULT_SETTINGS = {
    "roles": {
        "Founder": {"displayName": "Founder", "color": "#FFD700", "order": 0, "bypassArcoRequirement": True},
        "Elder": {"displayName": "Elder", "color": "#d4b978", "order": 1, "bypassArcoRequirement": True},
        "Noble": {"displayName": "Noble", "color": "#c9a962", "order": 2, "bypassArcoRequirement": False},
        "Knight": {"displayName": "Knight", "color": "#a68b4b", "order": 3, "bypassArcoRequirement": False},
        "Squire": {"displayName": "Squire", "color": "#8b7355", "order": 4, "bypassArcoRequirement": False},
        "Initiate": {"displayName": "Initiate", "color": "#6b5344", "order": 5, "bypassArcoRequirement": False},
        "Member": {"displayName": "Member", "color": "#555555", "order": 6, "bypassArcoRequirement": False}
    },
    "rooms": {
        "commons": {
            "name": "The Commons",
            "description": "Community chat for all ARCO holders",
            "arcoRequired": 50000,
            "bypassRoles": ["Founder", "Elder"]
        },
        "sanctuary": {
            "name": "The Sanctuary",
            "description": "A place of peace and meditation",
            "arcoRequired": 500000,
            "bypassRoles": ["Founder", "Elder"]
        },
        "treasury": {
            "name": "Treasury",
            "description": "The guild's wealth and resources",
            "arcoRequired": 5000000,
            "bypassRoles": ["Founder", "Elder"]
        },
        "archives": {
            "name": "Archives",
            "description": "Ancient knowledge and records",
            "arcoRequired": 25000000,
            "bypassRoles": ["Founder", "Elder"]
        },
        "council": {
            "name": "Council Chamber",
            "description": "Where important decisions are made",
            "arcoRequired": 100000000,
            "bypassRoles": ["Founder", "Elder"]
        }
    },
    "donations": {
        "wallet": TREASURY_WALLET,
        "acceptedCurrencies": ["ARCO", "BTC", "ETH", "MATIC", "SOL", "PAXG"]
    }
}

def get_settings():
    """Get current settings or return defaults"""
    settings = settings_collection.find_one({"_id": "guild_settings"})
    if not settings:
        return DEFAULT_SETTINGS.copy()
    # Remove MongoDB _id from response
    settings.pop("_id", None)
    return settings

# One-time bootstrap secret (remove after use)
BOOTSTRAP_SECRET = "arcolia-founder-bootstrap-2026"

# Pydantic models
class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class VerifyEmailRequest(BaseModel):
    token: str

class LinkWalletRequest(BaseModel):
    wallet_address: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class UpdateRoleRequest(BaseModel):
    user_id: str
    role: str

# Email Templates
def get_verification_email_html(username: str, verification_link: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Georgia, serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border: 1px solid #c9a962; border-radius: 12px; overflow: hidden;">
                        <tr>
                            <td style="padding: 40px; text-align: center;">
                                <h1 style="color: #c9a962; font-size: 32px; margin: 0 0 10px 0; letter-spacing: 4px;">ARCOLIA</h1>
                                <p style="color: #888; font-size: 14px; margin: 0; letter-spacing: 2px;">ACCESS WITHOUT PERMISSION</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 40px 40px 40px;">
                                <h2 style="color: #d4b978; font-size: 24px; margin: 0 0 20px 0;">Welcome, {username}</h2>
                                <p style="color: #ccc; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                    You're one step away from entering the Guild. Click the button below to verify your email and gain access to Arcolia.
                                </p>
                                <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                    <tr>
                                        <td style="background: linear-gradient(180deg, #d4b978 0%, #a68b4b 100%); border-radius: 8px;">
                                            <a href="{verification_link}" style="display: inline-block; padding: 16px 40px; color: #1a1408; text-decoration: none; font-size: 16px; font-weight: bold;">Verify Email</a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="color: #666; font-size: 14px; margin: 30px 0 0 0;">
                                    Or copy this link: <br>
                                    <span style="color: #c9a962; word-break: break-all;">{verification_link}</span>
                                </p>
                                <p style="color: #666; font-size: 12px; margin: 20px 0 0 0;">
                                    This link expires in 24 hours.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def get_password_reset_email_html(username: str, reset_link: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Georgia, serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border: 1px solid #c9a962; border-radius: 12px; overflow: hidden;">
                        <tr>
                            <td style="padding: 40px; text-align: center;">
                                <h1 style="color: #c9a962; font-size: 32px; margin: 0 0 10px 0; letter-spacing: 4px;">ARCOLIA</h1>
                                <p style="color: #888; font-size: 14px; margin: 0; letter-spacing: 2px;">ACCESS WITHOUT PERMISSION</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 40px 40px 40px;">
                                <h2 style="color: #d4b978; font-size: 24px; margin: 0 0 20px 0;">Reset Your Password</h2>
                                <p style="color: #ccc; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                    Hello {username}, we received a request to reset your password. Click the button below to create a new password.
                                </p>
                                <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                    <tr>
                                        <td style="background: linear-gradient(180deg, #d4b978 0%, #a68b4b 100%); border-radius: 8px;">
                                            <a href="{reset_link}" style="display: inline-block; padding: 16px 40px; color: #1a1408; text-decoration: none; font-size: 16px; font-weight: bold;">Reset Password</a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="color: #666; font-size: 14px; margin: 30px 0 0 0;">
                                    Or copy this link: <br>
                                    <span style="color: #c9a962; word-break: break-all;">{reset_link}</span>
                                </p>
                                <p style="color: #666; font-size: 12px; margin: 20px 0 0 0;">
                                    This link expires in 1 hour. If you didn't request this, you can ignore this email.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

# Email sending function
async def send_email(to_email: str, subject: str, html_content: str) -> bool:
    if not EMAIL_ENABLED:
        print(f"📧 [EMAIL DISABLED] Would send to {to_email}: {subject}")
        return False
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        await asyncio.to_thread(resend.Emails.send, params)
        print(f"📧 Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        return False

# Helper functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_jwt_token(user_id: str, username: str) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    payload = decode_jwt_token(token)
    
    user = users_collection.find_one({"_id": ObjectId(payload["user_id"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# Routes
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": "Arcolia", "email_enabled": EMAIL_ENABLED}

@app.post("/api/auth/signup")
async def signup(request: SignupRequest):
    # Validate username
    if len(request.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(request.username) > 20:
        raise HTTPException(status_code=400, detail="Username must be less than 20 characters")
    if not request.username.replace('_', '').isalnum():
        raise HTTPException(status_code=400, detail="Username can only contain letters, numbers, and underscores")
    
    # Validate password
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Check if email exists
    if users_collection.find_one({"email": request.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username exists
    if users_collection.find_one({"username_lower": request.username.lower()}):
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create user
    user = {
        "username": request.username,
        "username_lower": request.username.lower(),
        "email": request.email.lower(),
        "password_hash": hash_password(request.password),
        "email_verified": False,
        "wallet_address": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = users_collection.insert_one(user)
    user_id = str(result.inserted_id)
    
    # Create verification token
    verification_token = secrets.token_urlsafe(32)
    verification_tokens_collection.insert_one({
        "user_id": user_id,
        "token": verification_token,
        "type": "email_verification",
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=24)
    })
    
    # Send verification email
    verification_link = f"{APP_URL}?verify={verification_token}"
    email_sent = await send_email(
        request.email,
        "Verify your Arcolia account",
        get_verification_email_html(request.username, verification_link)
    )
    
    response = {
        "message": "Account created! Please check your email to verify your account.",
        "user_id": user_id,
        "email_sent": email_sent
    }
    
    # Include token in response for testing when email is disabled
    if not EMAIL_ENABLED:
        response["verification_token"] = verification_token
        response["verification_link"] = verification_link
    
    return response

@app.post("/api/auth/verify-email")
async def verify_email(request: VerifyEmailRequest):
    # Find verification token
    token_doc = verification_tokens_collection.find_one({
        "token": request.token,
        "type": "email_verification"
    })
    
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    
    # Check if expired
    expires_at = token_doc["expires_at"]
    if isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=400, detail="Verification token expired")
    
    # Update user
    users_collection.update_one(
        {"_id": ObjectId(token_doc["user_id"])},
        {"$set": {"email_verified": True}}
    )
    
    # Delete used token
    verification_tokens_collection.delete_one({"_id": token_doc["_id"]})
    
    return {"message": "Email verified successfully! You can now log in."}

@app.post("/api/bootstrap-founder")
async def bootstrap_founder(email: str, secret: str):
    """One-time endpoint to set initial Founder. Remove after use."""
    if secret != BOOTSTRAP_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    user = users_collection.find_one({"email": email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    users_collection.update_one(
        {"email": email.lower()},
        {"$set": {"role": "Founder"}}
    )
    
    return {"message": f"User {email} is now a Founder!"}

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    # Find user
    user = users_collection.find_one({"email": request.email.lower()})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if email verified
    if not user.get("email_verified", False):
        raise HTTPException(status_code=403, detail="Please verify your email before logging in")
    
    # Check if user is banned
    if user.get("is_banned", False):
        raise HTTPException(status_code=403, detail="Your account has been banned from Arcolia")
    
    # Create JWT token
    token = create_jwt_token(str(user["_id"]), user["username"])
    
    return {
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "email_verified": user["email_verified"],
            "wallet_address": user.get("wallet_address"),
            "role": user.get("role"),
            "oath_accepted": user.get("oath_accepted", False)
        }
    }

@app.get("/api/auth/me")
async def get_me(authorization: str = Header(None)):
    user = get_current_user(authorization)
    
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "email_verified": user["email_verified"],
        "wallet_address": user.get("wallet_address"),
        "role": user.get("role"),
        "oath_accepted": user.get("oath_accepted", False),
        "created_at": user.get("created_at")
    }

@app.post("/api/auth/link-wallet")
async def link_wallet(request: LinkWalletRequest, authorization: str = Header(None)):
    user = get_current_user(authorization)
    
    # Validate wallet address format
    if not request.wallet_address.startswith("0x") or len(request.wallet_address) != 42:
        raise HTTPException(status_code=400, detail="Invalid wallet address format")
    
    # Check if wallet already linked to another account
    existing = users_collection.find_one({
        "wallet_address": request.wallet_address.lower(),
        "_id": {"$ne": user["_id"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Wallet already linked to another account")
    
    # Update user
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"wallet_address": request.wallet_address.lower()}}
    )
    
    return {"message": "Wallet linked successfully", "wallet_address": request.wallet_address.lower()}

@app.post("/api/auth/unlink-wallet")
async def unlink_wallet(authorization: str = Header(None)):
    user = get_current_user(authorization)
    
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"wallet_address": None}}
    )
    
    return {"message": "Wallet unlinked successfully"}

@app.post("/api/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    # Find user by email
    user = users_collection.find_one({"email": request.email.lower()})
    
    # Always return success to prevent email enumeration
    success_message = "If an account exists with this email, a password reset link has been sent."
    
    if not user:
        return {"message": success_message}
    
    # Delete any existing reset tokens for this user
    verification_tokens_collection.delete_many({
        "user_id": str(user["_id"]),
        "type": "password_reset"
    })
    
    # Create reset token
    reset_token = secrets.token_urlsafe(32)
    verification_tokens_collection.insert_one({
        "user_id": str(user["_id"]),
        "token": reset_token,
        "type": "password_reset",
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1)
    })
    
    # Send reset email
    reset_link = f"{APP_URL}?reset={reset_token}"
    email_sent = await send_email(
        user["email"],
        "Reset your Arcolia password",
        get_password_reset_email_html(user["username"], reset_link)
    )
    
    response = {"message": success_message, "email_sent": email_sent}
    
    # Include token for testing when email is disabled
    if not EMAIL_ENABLED:
        response["reset_token"] = reset_token
        response["reset_link"] = reset_link
    
    return response

@app.post("/api/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Find reset token
    token_doc = verification_tokens_collection.find_one({
        "token": request.token,
        "type": "password_reset"
    })
    
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check if expired
    expires_at = token_doc["expires_at"]
    if isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            verification_tokens_collection.delete_one({"_id": token_doc["_id"]})
            raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Update password
    users_collection.update_one(
        {"_id": ObjectId(token_doc["user_id"])},
        {"$set": {"password_hash": hash_password(request.new_password)}}
    )
    
    # Delete used token
    verification_tokens_collection.delete_one({"_id": token_doc["_id"]})
    
    return {"message": "Password reset successfully! You can now log in with your new password."}

@app.post("/api/auth/resend-verification")
async def resend_verification(request: ResendVerificationRequest):
    # Find user by email
    user = users_collection.find_one({"email": request.email.lower()})
    
    if not user:
        # Don't reveal if email exists
        return {"message": "If an account exists with this email, a verification link has been sent."}
    
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")
    
    # Delete old tokens
    verification_tokens_collection.delete_many({
        "user_id": str(user["_id"]),
        "type": "email_verification"
    })
    
    # Create new verification token
    verification_token = secrets.token_urlsafe(32)
    verification_tokens_collection.insert_one({
        "user_id": str(user["_id"]),
        "token": verification_token,
        "type": "email_verification",
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=24)
    })
    
    # Send verification email
    verification_link = f"{APP_URL}?verify={verification_token}"
    email_sent = await send_email(
        user["email"],
        "Verify your Arcolia account",
        get_verification_email_html(user["username"], verification_link)
    )
    
    response = {"message": "Verification email sent!", "email_sent": email_sent}
    
    if not EMAIL_ENABLED:
        response["verification_token"] = verification_token
    
    return response


# Available roles (Founder is the highest)
VALID_ROLES = ["Founder", "Elder", "Noble", "Knight", "Squire", "Initiate", "Member"]

@app.post("/api/auth/update-role")
async def update_role(request: UpdateRoleRequest, authorization: str = Header(None)):
    # Get current user (must be authenticated)
    current_user = get_current_user(authorization)
    
    # Only Founders can change roles
    if current_user.get("role") != "Founder":
        raise HTTPException(status_code=403, detail="Only Founders can change roles")
    
    # Validate role
    if request.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}")
    
    # Find target user
    try:
        target_user = users_collection.find_one({"_id": ObjectId(request.user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user role
    users_collection.update_one(
        {"_id": ObjectId(request.user_id)},
        {"$set": {"role": request.role}}
    )
    
    return {
        "message": f"Role updated to {request.role}",
        "user_id": request.user_id,
        "role": request.role
    }

@app.get("/api/users")
async def get_all_users(authorization: str = Header(None)):
    # Get current user (must be authenticated)
    current_user = get_current_user(authorization)
    
    # Only Founders can view all users
    if current_user.get("role") != "Founder":
        raise HTTPException(status_code=403, detail="Only Founders can view all users")
    
    # Limit to 100 users for performance
    users = list(users_collection.find({}, {"password_hash": 0}).limit(100))
    
    # Convert ObjectId to string
    for user in users:
        user["id"] = str(user["_id"])
        del user["_id"]
    
    return {"users": users, "total": users_collection.count_documents({})}


@app.post("/api/admin/ban-user")
async def ban_user(user_id: str, authorization: str = Header(None)):
    """Ban a user (Founders only)"""
    current_user = get_current_user(authorization)
    
    if current_user.get("role") != "Founder":
        raise HTTPException(status_code=403, detail="Only Founders can ban users")
    
    # Find target user
    try:
        target_user = users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Can't ban yourself
    if str(target_user["_id"]) == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="You cannot ban yourself")
    
    # Can't ban other Founders
    if target_user.get("role") == "Founder":
        raise HTTPException(status_code=400, detail="You cannot ban another Founder")
    
    # Toggle ban status
    is_banned = target_user.get("is_banned", False)
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_banned": not is_banned}}
    )
    
    action = "unbanned" if is_banned else "banned"
    return {"message": f"User {action} successfully", "is_banned": not is_banned}

@app.post("/api/admin/delete-user")
async def delete_user(user_id: str, authorization: str = Header(None)):
    """Delete a user (Founders only)"""
    current_user = get_current_user(authorization)
    
    if current_user.get("role") != "Founder":
        raise HTTPException(status_code=403, detail="Only Founders can delete users")
    
    # Find target user
    try:
        target_user = users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Can't delete yourself
    if str(target_user["_id"]) == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="You cannot delete yourself")
    
    # Can't delete other Founders
    if target_user.get("role") == "Founder":
        raise HTTPException(status_code=400, detail="You cannot delete another Founder")
    
    # Delete the user
    users_collection.delete_one({"_id": ObjectId(user_id)})
    
    return {"message": f"User '{target_user.get('username')}' deleted successfully"}

@app.post("/api/admin/verify-user")
async def manual_verify_user(user_id: str, authorization: str = Header(None)):
    """Manually verify a user's email (Founders only)"""
    current_user = get_current_user(authorization)
    
    if current_user.get("role") != "Founder":
        raise HTTPException(status_code=403, detail="Only Founders can manually verify users")
    
    # Find target user
    try:
        target_user = users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Toggle verification status
    is_verified = target_user.get("email_verified", False)
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"email_verified": not is_verified}}
    )
    
    action = "unverified" if is_verified else "verified"
    return {"message": f"User {action} successfully", "email_verified": not is_verified}



@app.get("/api/admin/settings")
async def get_guild_settings(authorization: str = Header(None)):
    """Get current guild settings (Founders only)"""
    current_user = get_current_user(authorization)
    
    if current_user.get("role") != "Founder":
        raise HTTPException(status_code=403, detail="Only Founders can view settings")
    
    return get_settings()

@app.post("/api/admin/settings")
async def update_guild_settings(settings: dict, authorization: str = Header(None)):
    """Update guild settings (Founders only)"""
    current_user = get_current_user(authorization)
    
    if current_user.get("role") != "Founder":
        raise HTTPException(status_code=403, detail="Only Founders can update settings")
    
    # Validate settings structure
    if "roles" not in settings and "rooms" not in settings:
        raise HTTPException(status_code=400, detail="Settings must contain 'roles' or 'rooms'")
    
    # Get current settings
    current_settings = get_settings()
    
    # Merge with new settings
    if "roles" in settings:
        current_settings["roles"] = settings["roles"]
    if "rooms" in settings:
        current_settings["rooms"] = settings["rooms"]
    
    # Save to database
    settings_collection.update_one(
        {"_id": "guild_settings"},
        {"$set": current_settings},
        upsert=True
    )
    
    return {"message": "Settings updated successfully", "settings": current_settings}

@app.get("/api/settings/public")
async def get_public_settings():
    """Get public settings (role names and room info for display)"""
    settings = get_settings()
    return {
        "roles": settings.get("roles", {}),
        "rooms": settings.get("rooms", {})
    }

@app.post("/api/auth/check-room-access")
async def check_room_access(room_id: str, authorization: str = Header(None)):
    """Check if current user has access to a room"""
    current_user = get_current_user(authorization)
    settings = get_settings()
    
    room = settings.get("rooms", {}).get(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    user_role = current_user.get("role", "Member")
    allowed_roles = room.get("allowedRoles", [])
    
    has_access = user_role in allowed_roles
    
    return {
        "room_id": room_id,
        "room_name": room.get("name"),
        "has_access": has_access,
        "user_role": user_role,
        "allowed_roles": allowed_roles
    }


# ============================================
# OATH & RULES ENDPOINTS
# ============================================

ARCOLIA_OATH = """The Arcolia Code & Oath of Entry

The Oath of Entry

I enter Arcolia not as a consumer, but as a steward of knowledge.
I will seek understanding before judgment, and truth before status.
I will share what I learn, and protect the dignity of those who learn beside me.
I will not exploit the guild, nor diminish its people.
I will challenge ideas without cruelty, and build without arrogance.

If I am given access, I will treat it as responsibility.
If I am given influence, I will wield it with humility.

I understand that Arcolia is not a marketplace of ego, but a commons of minds.
By crossing this threshold, I accept that the value of Arcolia is created not by tokens, but by conduct.

So I enter — not to take, but to contribute.

I. Non-Negotiable Rules
1) Respect is mandatory. Harassment, discrimination, or intimidation are forbidden.
2) Integrity over influence. No scams, deception, or impersonation.
3) Knowledge must be shared in good faith. No sabotage or toxic gatekeeping.
4) No exploitation of the guild. No spam, coercive financial advice, or unsolicited promotion.
5) Member safety is sacred. No doxxing, threats, or privacy violations.
6) Arcolia rejects extremism and dehumanisation.

II. Guild Guidelines
7) Speak with purpose and add value.
8) Challenge ideas, not people.
9) Build more than you posture.
10) Protect the tone and atmosphere of each space.
11) Responsibility increases with access and influence."""

@app.get("/api/oath")
async def get_oath():
    """Get the Arcolia oath and rules"""
    return {"oath": ARCOLIA_OATH}

@app.post("/api/oath/accept")
async def accept_oath(authorization: str = Header(None)):
    """Accept the oath (required for first-time entry)"""
    current_user = get_current_user(authorization)
    
    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"oath_accepted": True, "oath_accepted_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Oath accepted. Welcome to Arcolia."}

# ============================================
# CHAT/MESSAGES ENDPOINTS
# ============================================

@app.get("/api/messages/{room_id}")
async def get_messages(room_id: str, limit: int = 50, authorization: str = Header(None)):
    """Get messages for a room"""
    current_user = get_current_user(authorization)
    
    # Check room access
    settings = get_settings()
    room = settings.get("rooms", {}).get(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    user_role = current_user.get("role", "Member")
    bypass_roles = room.get("bypassRoles", ["Founder", "Elder"])
    
    # Founders and Elders bypass ARCO requirements
    if user_role not in bypass_roles:
        # User needs to check ARCO balance client-side before accessing
        pass
    
    messages = list(messages_collection.find(
        {"room": room_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit))
    
    # Reverse to get chronological order
    messages.reverse()
    
    return {"messages": messages, "room": room_id}

@app.post("/api/messages/{room_id}")
async def post_message(room_id: str, message: dict, authorization: str = Header(None)):
    """Post a message to a room"""
    current_user = get_current_user(authorization)
    
    content = message.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(content) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 characters)")
    
    # Check room access
    settings = get_settings()
    room = settings.get("rooms", {}).get(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    new_message = {
        "room": room_id,
        "user_id": str(current_user["_id"]),
        "username": current_user["username"],
        "role": current_user.get("role", "Member"),
        "content": content,
        "created_at": datetime.now(timezone.utc)
    }
    
    messages_collection.insert_one(new_message)
    new_message.pop("_id", None)
    
    return {"message": "Message sent", "data": new_message}

# ============================================
# DONATIONS ENDPOINTS
# ============================================

@app.get("/api/donations/info")
async def get_donation_info():
    """Get donation information"""
    settings = get_settings()
    donation_settings = settings.get("donations", {})
    
    return {
        "wallet": donation_settings.get("wallet", TREASURY_WALLET),
        "acceptedCurrencies": donation_settings.get("acceptedCurrencies", ["ARCO", "BTC", "ETH", "MATIC", "SOL", "PAXG"]),
        "note": "Donations support the continued growth of Arcolia. Rankings are increased manually by Founders based on contributions."
    }

@app.post("/api/donations/record")
async def record_donation(donation: dict, authorization: str = Header(None)):
    """Record a donation (user self-reports, Founders verify)"""
    current_user = get_current_user(authorization)
    
    amount = donation.get("amount")
    currency = donation.get("currency")
    tx_hash = donation.get("tx_hash", "")
    
    if not amount or not currency:
        raise HTTPException(status_code=400, detail="Amount and currency required")
    
    donation_record = {
        "user_id": str(current_user["_id"]),
        "username": current_user["username"],
        "amount": amount,
        "currency": currency,
        "tx_hash": tx_hash,
        "status": "pending",  # pending, verified, rejected
        "created_at": datetime.now(timezone.utc)
    }
    
    result = donations_collection.insert_one(donation_record)
    
    return {
        "message": "Donation recorded. A Founder will verify and update your ranking.",
        "donation_id": str(result.inserted_id)
    }

@app.get("/api/donations/pending")
async def get_pending_donations(authorization: str = Header(None)):
    """Get pending donations (Founders only)"""
    current_user = get_current_user(authorization)
    
    if current_user.get("role") not in ["Founder", "Elder"]:
        raise HTTPException(status_code=403, detail="Only Founders and Elders can view pending donations")
    
    donations = list(donations_collection.find(
        {"status": "pending"},
        {"_id": 1, "user_id": 1, "username": 1, "amount": 1, "currency": 1, "tx_hash": 1, "created_at": 1}
    ).sort("created_at", -1).limit(50))
    
    for d in donations:
        d["id"] = str(d["_id"])
        del d["_id"]
    
    return {"donations": donations}

@app.post("/api/donations/verify")
async def verify_donation(data: dict, authorization: str = Header(None)):
    """Verify a donation and optionally upgrade user role (Founders only)"""
    current_user = get_current_user(authorization)
    
    if current_user.get("role") not in ["Founder", "Elder"]:
        raise HTTPException(status_code=403, detail="Only Founders and Elders can verify donations")
    
    donation_id = data.get("donation_id")
    status = data.get("status")  # verified or rejected
    new_role = data.get("new_role")  # optional role upgrade
    
    if not donation_id or status not in ["verified", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid request")
    
    try:
        donation = donations_collection.find_one({"_id": ObjectId(donation_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid donation ID")
    
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    
    # Update donation status
    donations_collection.update_one(
        {"_id": ObjectId(donation_id)},
        {"$set": {"status": status, "verified_by": current_user["username"], "verified_at": datetime.now(timezone.utc)}}
    )
    
    # Optionally upgrade user role
    if status == "verified" and new_role:
        users_collection.update_one(
            {"_id": ObjectId(donation["user_id"])},
            {"$set": {"role": new_role}}
        )
        return {"message": f"Donation verified and user upgraded to {new_role}"}
    
    return {"message": f"Donation {status}"}

# ============================================
# ROOM ACCESS CHECK (Updated with ARCO requirements)
# ============================================

@app.get("/api/rooms")
async def get_rooms(authorization: str = Header(None)):
    """Get all rooms with their requirements"""
    current_user = get_current_user(authorization)
    settings = get_settings()
    
    rooms = settings.get("rooms", {})
    user_role = current_user.get("role", "Member")
    
    room_list = []
    for room_id, room in rooms.items():
        bypass_roles = room.get("bypassRoles", ["Founder", "Elder"])
        bypasses_arco = user_role in bypass_roles
        
        room_list.append({
            "id": room_id,
            "name": room.get("name"),
            "description": room.get("description"),
            "arcoRequired": room.get("arcoRequired", 0),
            "bypassesArco": bypasses_arco
        })
    
    return {"rooms": room_list, "userRole": user_role}
