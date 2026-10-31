# filepath: backend/app/config.py
"""
AEGIS-IoT Configuration Module
Centralized settings for verification limits, timeouts, and integrity guard rules.
"""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "AEGIS-IoT Deterministic Verification Orchestrator"
    VERSION: str = "2.0.0-hackathon"
    API_PREFIX: str = "/api"

    # Stage 6 Integrity Guard Rules
    MAX_DIFF_LINES: int = 35
    MIN_BENIGN_TESTS: int = 3
    BANNED_TOKENS: List[str] = [
        "no_sanitize",
        "-fno-sanitize",
        "__asan",
        "ASAN_",
        "#pragma",
        "__attribute__",
        "asm",
        "__asm__",
        "system(",
        "system (",
        "popen",
        "fork",
        "execve",
        "execl",
        "execvp",
    ]

    # Sandbox Execution Limits
    SANDBOX_DOCKER_IMAGE: str = "aegis-sandbox:latest"
    COMPILE_TIMEOUT_SECONDS: int = 15
    RUN_TIMEOUT_SECONDS: int = 6
    MEMORY_LIMIT: str = "512m"
    CPU_LIMIT: float = 1.0

    # Fail-Safe Stage Insurance: auto-fallback to deterministic simulation if Docker/GCC is offline
    FAILSAFE_STAGE_INSURANCE: bool = True

    class Config:
        env_prefix = "AEGIS_"
        case_sensitive = True


settings = Settings()
