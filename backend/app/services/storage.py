"""
S3-Compatible Object Storage Service.
Works with MinIO (local) and any S3-compatible provider (Cloudflare R2, etc.).
"""

import uuid
from typing import Optional

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from app.config import get_settings


class StorageUploadError(Exception):
    """Upload failed (e.g. MinIO full, permissions). Use `.detail` for API responses."""

    def __init__(self, detail: str, *, aws_code: Optional[str] = None):
        self.detail = detail
        self.aws_code = aws_code
        super().__init__(detail)


def _map_client_error(exc: ClientError) -> StorageUploadError:
    err = exc.response.get("Error") or {}
    code = err.get("Code") or ""
    msg = err.get("Message") or str(exc)

    if code == "XMinioStorageFull":
        return StorageUploadError(
            "Object storage is full (MinIO disk below free threshold). Free host disk space, remove old files "
            "from the MinIO bucket, or run: docker compose down && docker volume rm <project>_minio_data (dev only), "
            "then bring the stack back up.",
            aws_code=code,
        )
    if code in ("NoSuchBucket", "NotFound"):
        return StorageUploadError(
            f"Storage bucket is missing or not reachable ({code}). Ensure MinIO is running and the bucket was created.",
            aws_code=code,
        )
    return StorageUploadError(f"Storage upload failed ({code or 'unknown'}): {msg}", aws_code=code or None)


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
        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
        except ClientError as e:
            raise _map_client_error(e) from e
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
