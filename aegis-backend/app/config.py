import os

class Settings:
    # 1. Google Gemini Free Tier (AI Studio)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODELS: list = [
        os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        "gemini-2.5-flash-lite"
    ]

    # 2. Groq Cloud Free Tier (Sub-second Qwen 2.5 Coder 32B & Llama 3.3 70B)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODELS: list = [
        os.getenv("GROQ_MODEL", "qwen-2.5-coder-32b"),
        "llama-3.3-70b-versatile"
    ]

    # 3. OpenRouter Free Tier Router & Free Coding Models
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODELS: list = [
        os.getenv("OPENROUTER_MODEL", "openrouter/free"),
        "cohere/north-mini-code:free",
        "google/gemma-4-31b-it:free"
    ]

    # 4. Cerebras / GitHub Models OpenAI-Compatible Endpoint (Optional Free Cloud)
    OPENAI_COMPAT_API_KEY: str = os.getenv("OPENAI_COMPAT_API_KEY", "")
    OPENAI_COMPAT_BASE_URL: str = os.getenv("OPENAI_COMPAT_BASE_URL", "https://models.inference.ai.azure.com")
    OPENAI_COMPAT_MODEL: str = os.getenv("OPENAI_COMPAT_MODEL", "gpt-4o-mini")

    # 5. Local Ollama (Best Fit: Qwen 2.5 Coder 7B / 14B)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
    OLLAMA_MODELS: list = [
        os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b"),
        "deepseek-coder:6.7b"
    ]

settings = Settings()
