"""
OpenAI Moderation API Integration

Free content moderation using OpenAI's moderation endpoint.
Provides safety classification across multiple harm categories.

The moderation API is free and doesn't count against usage limits.
"""

import logging
import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

logger = logging.getLogger(__name__)


@dataclass
class ModerationResult:
    """Result from OpenAI moderation API call"""
    flagged: bool
    categories: Dict[str, bool]
    category_scores: Dict[str, float]
    model: str
    response_time: float
    error: Optional[str] = None


class OpenAIModerationClient:
    """
    Client for OpenAI's free moderation API.
    
    Provides safety classification for text content across categories:
    - hate: Hateful content
    - harassment: Harassing content
    - self-harm: Self-harm content
    - sexual: Sexual content
    - violence: Violent content
    - etc.
    """
    
    def __init__(self, model: str = "text-moderation-latest"):
        """
        Initialize moderation client.
        
        Args:
            model: Moderation model to use (default: latest)
        """
        if OpenAI is None:
            raise ImportError(
                "OpenAI package not available. Install with: pip install openai"
            )
        
        self.model = model
        self.client = None
        self._setup_client()
        
        logger.info(f"OpenAI Moderation client initialized with model: {model}")
    
    def _setup_client(self):
        """Setup OpenAI client with API key"""
        try:
            # OpenAI client will automatically pick up OPENAI_API_KEY env var
            self.client = OpenAI()
            
            # Test the connection with a simple call
            self._test_connection()
            
        except Exception as e:
            logger.error(f"Failed to setup OpenAI client: {e}")
            raise
    
    def _test_connection(self):
        """Test connection to OpenAI moderation API"""
        try:
            # Simple test call
            result = self.client.moderations.create(
                input="This is a test message.",
                model=self.model
            )
            logger.debug("OpenAI moderation API connection test successful")
            
        except Exception as e:
            logger.warning(f"OpenAI moderation API test failed: {e}")
            # Don't raise - let it fail on actual usage
    
    def moderate(self, text: str, timeout: float = 5.0) -> ModerationResult:
        """
        Moderate text content using OpenAI API.
        
        Args:
            text: Text content to moderate
            timeout: Request timeout in seconds
            
        Returns:
            ModerationResult with flagged status and category details
        """
        if not text or not text.strip():
            # Empty text is not flagged
            return ModerationResult(
                flagged=False,
                categories={},
                category_scores={},
                model=self.model,
                response_time=0.0
            )
        
        start_time = time.time()
        
        try:
            # Call OpenAI moderation API
            response = self.client.moderations.create(
                input=text,
                model=self.model
            )
            
            response_time = time.time() - start_time
            
            # Extract result from first (and only) result
            result = response.results[0]
            
            moderation_result = ModerationResult(
                flagged=result.flagged,
                categories=result.categories.model_dump(),
                category_scores=result.category_scores.model_dump(),
                model=response.model,
                response_time=response_time
            )
            
            logger.debug(
                f"Moderation complete | flagged={result.flagged} "
                f"time={response_time:.2f}s "
                f"flagged_categories={self._get_flagged_categories(result.categories.model_dump())}"
            )
            
            return moderation_result
            
        except Exception as e:
            response_time = time.time() - start_time
            error_msg = str(e)
            
            logger.error(f"Moderation API failed: {error_msg} (time: {response_time:.2f}s)")
            
            # Return error result
            return ModerationResult(
                flagged=False,  # Assume safe on error to avoid false positives
                categories={},
                category_scores={},
                model=self.model,
                response_time=response_time,
                error=error_msg
            )
    
    def moderate_batch(
        self, 
        texts: List[str], 
        timeout: float = 30.0
    ) -> List[ModerationResult]:
        """
        Moderate multiple texts in batch.
        
        Args:
            texts: List of texts to moderate
            timeout: Request timeout in seconds
            
        Returns:
            List of ModerationResult objects
        """
        if not texts:
            return []
        
        # Filter empty texts
        non_empty_texts = [text for text in texts if text and text.strip()]
        if not non_empty_texts:
            return [
                ModerationResult(
                    flagged=False,
                    categories={},
                    category_scores={},
                    model=self.model,
                    response_time=0.0
                )
                for _ in texts
            ]
        
        start_time = time.time()
        
        try:
            # OpenAI moderation API supports batch requests
            response = self.client.moderations.create(
                input=non_empty_texts,
                model=self.model
            )
            
            response_time = time.time() - start_time
            
            # Convert results
            results = []
            result_idx = 0
            
            for original_text in texts:
                if not original_text or not original_text.strip():
                    # Empty text result
                    results.append(ModerationResult(
                        flagged=False,
                        categories={},
                        category_scores={},
                        model=self.model,
                        response_time=0.0
                    ))
                else:
                    # Use API result
                    api_result = response.results[result_idx]
                    results.append(ModerationResult(
                        flagged=api_result.flagged,
                        categories=api_result.categories.model_dump(),
                        category_scores=api_result.category_scores.model_dump(),
                        model=response.model,
                        response_time=response_time / len(non_empty_texts)  # Distribute time
                    ))
                    result_idx += 1
            
            logger.debug(
                f"Batch moderation complete | {len(texts)} texts "
                f"time={response_time:.2f}s "
                f"flagged={sum(1 for r in results if r.flagged)}"
            )
            
            return results
            
        except Exception as e:
            response_time = time.time() - start_time
            error_msg = str(e)
            
            logger.error(f"Batch moderation API failed: {error_msg}")
            
            # Return error results for all texts
            return [
                ModerationResult(
                    flagged=False,
                    categories={},
                    category_scores={},
                    model=self.model,
                    response_time=response_time / len(texts),
                    error=error_msg
                )
                for _ in texts
            ]
    
    def _get_flagged_categories(self, categories: Dict[str, bool]) -> List[str]:
        """Get list of flagged category names"""
        return [category for category, flagged in categories.items() if flagged]
    
    def get_flagged_categories(self, result: ModerationResult) -> List[str]:
        """
        Extract flagged category names from moderation result.
        
        Args:
            result: ModerationResult object
            
        Returns:
            List of flagged category names
        """
        return self._get_flagged_categories(result.categories)
    
    def get_highest_scoring_category(self, result: ModerationResult) -> Optional[str]:
        """
        Get the category with highest score from moderation result.
        
        Args:
            result: ModerationResult object
            
        Returns:
            Category name with highest score, or None if no categories
        """
        if not result.category_scores:
            return None
        
        return max(result.category_scores.items(), key=lambda x: x[1])[0]
    
    def is_category_flagged(self, result: ModerationResult, category: str) -> bool:
        """
        Check if specific category is flagged.
        
        Args:
            result: ModerationResult object
            category: Category name to check
            
        Returns:
            True if category is flagged
        """
        return result.categories.get(category, False)
    
    def get_category_score(self, result: ModerationResult, category: str) -> float:
        """
        Get score for specific category.
        
        Args:
            result: ModerationResult object
            category: Category name to get score for
            
        Returns:
            Score for category (0.0-1.0), or 0.0 if category not found
        """
        return result.category_scores.get(category, 0.0)
    
    def format_result(self, result: ModerationResult) -> str:
        """
        Format moderation result for human-readable display.
        
        Args:
            result: ModerationResult object
            
        Returns:
            Formatted string describing the result
        """
        if result.error:
            return f"Moderation failed: {result.error}"
        
        if not result.flagged:
            return "Content passed moderation (no violations detected)"
        
        flagged_cats = self._get_flagged_categories(result.categories)
        highest_cat = self.get_highest_scoring_category(result)
        highest_score = result.category_scores.get(highest_cat, 0.0)
        
        return (
            f"Content flagged for: {', '.join(flagged_cats)} "
            f"(highest: {highest_cat} = {highest_score:.3f})"
        )


# Convenience functions for direct usage

def moderate_text(text: str, model: str = "text-moderation-latest") -> ModerationResult:
    """
    Quick moderation of single text.
    
    Args:
        text: Text to moderate
        model: Moderation model to use
        
    Returns:
        ModerationResult
    """
    client = OpenAIModerationClient(model)
    return client.moderate(text)


def is_text_safe(text: str, model: str = "text-moderation-latest") -> bool:
    """
    Simple safety check for text.
    
    Args:
        text: Text to check
        model: Moderation model to use
        
    Returns:
        True if text is safe (not flagged)
    """
    result = moderate_text(text, model)
    return not result.flagged and result.error is None