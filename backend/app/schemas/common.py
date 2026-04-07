"""Common schema types."""

from typing import Optional, Any
from pydantic import BaseModel


class APIResponse(BaseModel):
    """Standard API response wrapper."""
    success: bool = True
    message: str = "OK"
    data: Optional[Any] = None


class PaginatedResponse(BaseModel):
    """Paginated response wrapper."""
    success: bool = True
    data: list = []
    total: int = 0
    page: int = 1
    per_page: int = 20
    pages: int = 1
