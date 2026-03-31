import os
import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
from bson import ObjectId
import jwt

app = FastAPI(title="Arcolia API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'arcolia')
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
users_collection = db['users']
verification_tokens_collection = db['verification_tokens']

# Create indexes
users_collection.create_index("email", unique=True)
users_collection.create_index("username", unique=True)

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

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    email_verified: bool
    wallet_address: str | None
    created_at: str

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

def get_current_user(authorization: str = None):
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
    return {"status": "healthy", "app": "Arcolia"}

@app.post("/api/auth/signup")
async def signup(request: SignupRequest):
    # Validate username
    if len(request.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(request.username) > 20:
        raise HTTPException(status_code=400, detail="Username must be less than 20 characters")
    if not request.username.isalnum():
        raise HTTPException(status_code=400, detail="Username can only contain letters and numbers")
    
    # Validate password
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Check if email exists
    if users_collection.find_one({"email": request.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username exists
    if users_collection.find_one({"username": request.username.lower()}):
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
    
    # For now, log the verification link (in production, send email)
    print(f"\n=== EMAIL VERIFICATION ===")
    print(f"User: {request.username} ({request.email})")
    print(f"Verification Token: {verification_token}")
    print(f"==========================\n")
    
    return {
        "message": "Account created! Please check your email to verify your account.",
        "user_id": user_id,
        "verification_token": verification_token  # Remove this in production - just for testing
    }

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
    if datetime.now(timezone.utc) > token_doc["expires_at"].replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="Verification token expired")
    
    # Update user
    users_collection.update_one(
        {"_id": ObjectId(token_doc["user_id"])},
        {"$set": {"email_verified": True}}
    )
    
    # Delete used token
    verification_tokens_collection.delete_one({"_id": token_doc["_id"]})
    
    return {"message": "Email verified successfully! You can now log in."}

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
    
    # Create JWT token
    token = create_jwt_token(str(user["_id"]), user["username"])
    
    return {
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "email_verified": user["email_verified"],
            "wallet_address": user.get("wallet_address")
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

@app.post("/api/auth/resend-verification")
async def resend_verification(request: LoginRequest):
    # Find user by email
    user = users_collection.find_one({"email": request.email.lower()})
    
    if not user:
        # Don't reveal if email exists
        return {"message": "If an account exists with this email, a verification link has been sent."}
    
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")
    
    # Verify password first
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid password")
    
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
    
    print(f"\n=== RESEND EMAIL VERIFICATION ===")
    print(f"User: {user['username']} ({user['email']})")
    print(f"Verification Token: {verification_token}")
    print(f"==================================\n")
    
    return {
        "message": "Verification email sent!",
        "verification_token": verification_token  # Remove in production
    }
