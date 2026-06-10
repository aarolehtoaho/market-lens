"""Abstract base class for LLM services. Defines the interface and common functionality for all LLM implementations."""

from abc import ABC, abstractmethod
class LLMService(ABC):
    """Abstract base class for LLM services."""

    @abstractmethod
    def __init__(self, api_key: str):
        """Initialize the LLM service with the given API key."""
        pass

    @abstractmethod
    def generate_response(self, model: str, prompt: str) -> str:
        """Generate a response based on the given model and prompt."""
        pass

    @abstractmethod
    def fetch_models(self) -> list[str]:
        """Fetch a list of available models from the LLM service."""
        pass
