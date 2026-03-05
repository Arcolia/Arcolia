import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Arcolia API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": "Arcolia"}

@app.get("/api/config")
async def get_config():
    return {
        "arco_token": "0x6a931530fb7946dC95fd9d7245157661D7B0B375",
        "network": "polygon",
        "chain_id": 137,
        "min_tokens_required": 1
    }
