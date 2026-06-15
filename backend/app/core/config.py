import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "MediCare Plus – Hospital & Appointment Management Platform"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "mysql+pymysql://root:Root@localhost:3306/medicare_plus"
    
    # Security
    JWT_SECRET: str = "7d4b4a3a6b8c9d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e"  # Replace in production
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # AI Assistant
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", "")

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
