"""Application settings and configuration."""
import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Locate and load backend/.env if present
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()


class Settings:
    PROJECT_NAME: str = "ReviewAI"
    VERSION: str = "0.3.0"
    API_V1_STR: str = "/api/v1"
    
    # Upload and input limits
    MAX_UPLOAD_SIZE_BYTES: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(1_048_576)))  # 1 MB per file limit
    DETECTION_CONFIDENCE_THRESHOLD: float = float(os.getenv("DETECTION_CONFIDENCE_THRESHOLD", "0.65"))
    
    # Gemini AI configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    REVIEW_TIMEOUT_SECONDS: int = int(os.getenv("REVIEW_TIMEOUT_SECONDS", "45"))
    
    # CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @property
    def is_gemini_configured(self) -> bool:
        """Returns True if a real GEMINI_API_KEY is configured."""
        key = self.GEMINI_API_KEY.strip()
        return bool(key and key != "your_gemini_api_key_here")


settings = Settings()
