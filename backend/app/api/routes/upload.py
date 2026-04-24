"""Simple media upload endpoint- returns a public URL for the uploaded file."""

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from starlette.responses import Response
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.services.storage import StorageService, StorageUploadError
from app.security.limiter import limiter

router = APIRouter(prefix="/upload", tags=["Upload"])

_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_MAX_BYTES = 20 * 1024 * 1024  # 20 MB


class UploadResponse(BaseModel):
    url: str


@router.post("", response_model=UploadResponse)
@router.post("/", response_model=UploadResponse)
@limiter.limit("40/minute")
async def upload_media(
    request: Request,
    response: Response,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a single image and receive back a public URL.

    Used for reference / end-frame images that are not tied to a project.
    """
    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: JPEG, PNG, WebP.",
        )

    data = await file.read()
    if len(data) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum 20 MB.")

    ext = (file.content_type or "image/jpeg").split("/")[-1].replace("jpeg", "jpg")
    key = f"uploads/{current_user.id}/{uuid.uuid4()}.{ext}"

    storage = StorageService()
    try:
        url = await storage.upload_file(key, data, file.content_type or "image/jpeg")
    except StorageUploadError as exc:
        raise HTTPException(status_code=500, detail=exc.detail) from exc

    return UploadResponse(url=url)
