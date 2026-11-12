"""Application settings and configuration."""
from typing import List

class Settings:
    PROJECT_NAME: str = "ReviewAI"
    VERSION: str = "0.2.0"
    API_V1_STR: str = "/api/v1"
    
    # Upload and input limits
    MAX_UPLOAD_SIZE_BYTES: int = 1_048_576  # 1 MB per file limit
    DETECTION_CONFIDENCE_THRESHOLD: float = 0.65
    
    # CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

settings = Settings()
