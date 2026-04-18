"""
Celery Application Configuration.
"""

from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "adgen_workers",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.workers.video_worker",
        "app.workers.image_worker"
    ]
)

celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry_on_startup=True,

    # Queue routing
    task_routes={
        "app.workers.video_worker.*": {"queue": "video_generation"},
        "app.workers.image_worker.*": {"queue": "image_generation"},
        "app.workers.processing_worker.*": {"queue": "post_processing"},
    },

    # Retry settings
    task_acks_late=True,
    worker_prefetch_multiplier=1,

    # Result settings
    result_expires=3600,  # 1 hour
)

# Auto-discover tasks
celery_app.autodiscover_tasks(["app.workers"])
