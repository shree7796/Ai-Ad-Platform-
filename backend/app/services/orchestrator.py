"""
Orchestration Service.
Dispatches video generation jobs to Celery workers.
"""

from typing import Optional

from app.workers.celery_app import celery_app


class OrchestrationService:
    """
    Orchestrates the video generation pipeline:
    1. Receives generation request
    2. Dispatches to appropriate Celery queue
    3. Returns job ID for status tracking
    """

    def dispatch_generation(
        self,
        scene_id: str,
        project_id: str,
        user_id: str,
        prompt: str,
        input_media_url: str,
        tier: str = "basic",
        duration_seconds: int = 12,
        enhance_prompt: bool = True,
        task_type: str = "image_to_video",
        requested_provider: Optional[str] = None,
    ) -> str:
        """
        Dispatch a generation job to the appropriate worker queue.
        """
        # Determine target task based on type
        image_tasks = ["text_to_image", "image_to_image"]
        
        target_task = "app.workers.video_worker.generate_video"
        queue = "video_generation"
        
        if task_type in image_tasks:
            target_task = "app.workers.image_worker.generate_image"
            queue = "image_generation"

        task = celery_app.send_task(
            target_task,
            kwargs={
                "scene_id": scene_id,
                "project_id": project_id,
                "user_id": user_id,
                "prompt": prompt,
                "input_media_url": input_media_url,
                "tier": tier,
                "duration_seconds": duration_seconds,
                "enhance_prompt": enhance_prompt,
                "task_type": task_type,
                "requested_provider": requested_provider,
            },
            queue=queue,
        )
        return task.id
