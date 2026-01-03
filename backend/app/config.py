from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    openai_api_key: str
    supabase_url: str = ""
    supabase_key: str = ""
    secret_key: str = "dev-secret-key"
    # Comma-separated list of allowed CORS origins (e.g. "https://myapp.vercel.app,http://localhost:3000")
    allowed_origins: str = "http://localhost:3000,http://localhost:5173"
    # Optional regex for CORS origins (e.g. r"^https://.*\.vercel\.app$")
    allowed_origin_regex: str = ""
    
    class Config:
        env_file = ".env"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in (self.allowed_origins or "").split(",") if o.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
