import ollama
from backend.services.llm.base import LLMService

class OllamaService(LLMService):
    """LLM service implementation for Ollama's API."""
    def __init__(self, api_key: str="http://localhost:11434"):
        """The api key represents the base url for the ollama server, e.g. http://localhost:11434"""
        self.client = ollama.Client(host=api_key)
        self.base_url = api_key

    def generate_response(self, model: str, prompt: str) -> str:
        """Generate a response from the local Ollama, based on the given prompt."""
        try:
            response = self.client.generate(
                model=model,
                prompt=prompt,
                options={
                    "num_ctx": 16384,
                    "temperature": 0.7,
                    "num_predict": 2048
                }
            )
            return response['response']
        except Exception as e:
            raise ValueError(f"Failed to generate response from Ollama: {str(e)}")
        
    def fetch_models(self) -> list[str]:
        """Fetch a list of available models from the local Ollama."""
        model_list = []
        try:
            response = self.client.list()
            for model in response.models:
                model_list.append(model.model)
            return model_list
        except Exception as e:
            raise ValueError(f"Failed to fetch models from Ollama: {str(e)}")
