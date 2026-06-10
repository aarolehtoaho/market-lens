from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services.llm.openai_service import OpenAIService
from backend.services.llm.claude_service import ClaudeService
from backend.services.llm.gemini_service import GeminiService
from backend.services.llm.ollama_service import OllamaService
from backend.database import Database

router = APIRouter()

class ModelRequest(BaseModel):
    provider: str
    api_key: str

class ConfigurationRequest(BaseModel):
    provider: str
    api_key: str
    model: str

@router.post("/models")
async def fetch_models(modelRequest: ModelRequest) -> dict:
    provider = modelRequest.provider.lower()
    api_key = modelRequest.api_key

    LLMService = None
    try:
        if provider == "openai":
            LLMService = OpenAIService(api_key)
        elif provider == "claude":
            LLMService = ClaudeService(api_key)
        elif provider == "gemini":
            LLMService = GeminiService(api_key)
        elif provider == "ollama":
            LLMService = OllamaService(api_key)
        else:
            raise HTTPException(status_code=400, detail="Unsupported provider")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize LLM service: {str(e)}")

    try:
        models = LLMService.fetch_models()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(e)}")

    return {"models": models}

@router.post("/configuration")
def save_configuration(configRequest: ConfigurationRequest) -> dict:
    provider = configRequest.provider.lower()
    api_key = configRequest.api_key
    model = configRequest.model

    # Save the configuration to a file or database
    try:
        db = Database()
        db.save_llm_configuration(provider, api_key, model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")
    
    return {"message": "Configuration saved successfully"}
