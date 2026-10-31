from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class LLMPatchProposal(BaseModel):
    root_cause: str = Field(description="Concise explanation of the C memory-safety flaw.")
    patched_code: str = Field(description="Complete, compilable C source code for target.c ONLY.")
    assumptions: List[str] = Field(default_factory=list, description="Bounds or null invariants enforced.")

class RepairRequest(BaseModel):
    sample_id: str = "s1_serial_overflow"
    provider: str = "auto"  # "auto", "gemini", "groq", "openrouter", "ollama", "replay"
    model: Optional[str] = None
    max_retries: int = 3
