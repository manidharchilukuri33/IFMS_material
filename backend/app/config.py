import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "IFMS - Material Management Module"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Live PostgreSQL 17 database
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 5432
    DB_USER: str = "ifms_jk"
    DB_PASSWORD: str = "ifms_jk"
    DB_NAME: str = "ifms_jk"
    
    SERVER_HOST: str = "127.0.0.1"
    SERVER_PORT: int = 8002
    
    DEFAULT_TENANT_ID: int = 1
    DEFAULT_FINANCIAL_YEAR_ID: int = 3
    DEFAULT_DEPARTMENT_ID: int = 1
    DEFAULT_OFFICE_ID: int = 2
    
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

settings = Settings()
