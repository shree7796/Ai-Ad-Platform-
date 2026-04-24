"""
Project API Routes- CRUD + file upload.
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.models.project import Project
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
)
from app.schemas.common import APIResponse
from app.api.deps import get_current_user
from app.services.storage import StorageService, StorageUploadError

router = APIRouter(prefix="/projects", tags=["Projects"])


from sqlalchemy.orm import selectinload

@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    title: str = Form(...),
    description: Optional[str] = Form(default=None),
    task_type: Optional[str] = Form(default=None),
    media: Optional[UploadFile] = File(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new project with optional media upload."""
    media_url = None
    media_type = None

    if media:
        # Validate file type
        content_type = media.content_type or ""
        if content_type.startswith("image/"):
            media_type = "image"
        elif content_type.startswith("video/"):
            media_type = "video"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type. Please upload an image or video.",
            )

        # Upload to object storage
        storage = StorageService()
        file_content = await media.read()
        file_key = f"uploads/{current_user.id}/{uuid.uuid4()}/{media.filename}"
        try:
            media_url = await storage.upload_file(file_key, file_content, content_type)
        except StorageUploadError as e:
            raise HTTPException(
                status_code=status.HTTP_507_INSUFFICIENT_STORAGE,
                detail=e.detail,
            ) from e

    project = Project(
        user_id=current_user.id,
        title=title,
        description=description,
        task_type=task_type,
        input_media_url=media_url,
        input_media_type=media_type,
        status="pending",
    )
    db.add(project)
    await db.commit()

    # Re-fetch with scenes to avoid MissingGreenlet over async Pydantic validation
    stmt = select(Project).options(selectinload(Project.scenes)).where(Project.id == project.id)
    result = await db.execute(stmt)
    project_with_scenes = result.scalar_one()

    return ProjectResponse.model_validate(project_with_scenes)


@router.get("", response_model=List[ProjectListResponse])
@router.get("/", response_model=List[ProjectListResponse])
async def list_projects(
    page: int = 1,
    per_page: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all projects for the current user."""
    offset = (page - 1) * per_page
    result = await db.execute(
        select(Project)
        .where(Project.user_id == current_user.id)
        .order_by(Project.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    projects = result.scalars().all()
    return [ProjectListResponse.model_validate(p) for p in projects]


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a project by ID with its scenes."""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", response_model=APIResponse)
async def delete_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a project."""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    await db.commit()
    return APIResponse(message="Project deleted successfully")
