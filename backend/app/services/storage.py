"""
S3-Compatible Object Storage Service.
Works with MinIO (local) and any S3-compatible provider (Cloudflare R2, etc.).
"""

import uuid
from typing import Optional

import boto3
from botocore.config import Config as BotoConfig

from app.config import get_settings


class StorageService:
    """S3-compatible object storage operations."""

    def __init__(self):
        settings = get_settings()
        self.bucket = settings.storage_bucket
        self.public_url = settings.storage_public_url

        self.client = boto3.client(
            "s3",
            endpoint_url=settings.storage_endpoint,
            aws_access_key_id=settings.storage_access_key,
            aws_secret_access_key=settings.storage_secret_key,
            region_name=settings.storage_region,
            config=BotoConfig(signature_version="s3v4"),
        )

    async def upload_file(
        self,
        key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        """
        Upload a file to object storage.

        Returns:
            Public URL of the uploaded file.
        """
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        return f"{self.public_url}/{self.bucket}/{key}"

    async def upload_video(
        self,
        video_data: bytes,
        project_id: str,
        filename: Optional[str] = None,
    ) -> str:
        """Upload a generated video and return its public URL."""
        if not filename:
            filename = f"{uuid.uuid4()}.mp4"
        key = f"videos/{project_id}/{filename}"
        return await self.upload_file(key, video_data, "video/mp4")

    async def upload_image(
        self,
        image_data: bytes,
        project_id: str,
        filename: Optional[str] = None,
        content_type: str = "image/png",
    ) -> str:
        """Upload a generated image and return its public URL."""
        if not filename:
            # Detect extension from content_type
            ext = "png" if "png" in content_type else "jpg"
            filename = f"{uuid.uuid4()}.{ext}"
        key = f"images/{project_id}/{filename}"
        return await self.upload_file(key, image_data, content_type)

    async def get_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """Generate a presigned URL for temporary access."""
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    async def delete_file(self, key: str):
        """Delete a file from storage."""
        self.client.delete_object(Bucket=self.bucket, Key=key)
