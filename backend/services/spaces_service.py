import json
import logging
import os
from typing import Dict, Optional

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

logger = logging.getLogger(__name__)


class SpacesService:
    def __init__(self) -> None:
        self.bucket = os.environ.get("DO_SPACES_BUCKET", "secondhand-content")
        endpoint = os.environ.get("DO_SPACES_ENDPOINT", "https://nyc3.digitaloceanspaces.com")
        region = os.environ.get("DO_SPACES_REGION", "nyc3")
        key = os.environ.get("DO_SPACES_KEY")
        secret = os.environ.get("DO_SPACES_SECRET")

        if not key or not secret:
            logger.warning("DigitalOcean Spaces credentials not set; falling back to local lesson data")
            self.client = None
            return

        session = boto3.session.Session()
        self.client = session.client(
            "s3",
            region_name=region,
            endpoint_url=endpoint,
            aws_access_key_id=key,
            aws_secret_access_key=secret,
            config=Config(signature_version="s3v4"),
        )

    def get_lesson_keypoints(self, lesson_id: str) -> Optional[Dict]:
        if not self.client:
            return None
        try:
            response = self.client.get_object(
                Bucket=self.bucket,
                Key=f"lessons/{lesson_id}/keypoints.json",
            )
            return json.loads(response["Body"].read().decode("utf-8"))
        except (ClientError, BotoCoreError) as exc:
            logger.error("Failed to fetch keypoints for %s: %s", lesson_id, exc)
            return None

    def get_lesson_metadata(self, lesson_id: str) -> Optional[Dict]:
        if not self.client:
            return None
        try:
            response = self.client.get_object(
                Bucket=self.bucket,
                Key=f"lessons/{lesson_id}/metadata.json",
            )
            return json.loads(response["Body"].read().decode("utf-8"))
        except (ClientError, BotoCoreError) as exc:
            logger.error("Failed to fetch metadata for %s: %s", lesson_id, exc)
            return None

    def list_lessons(self) -> Optional[Dict]:
        if not self.client:
            return None
        try:
            response = self.client.get_object(
                Bucket=self.bucket,
                Key="lessons/index.json",
            )
            return json.loads(response["Body"].read().decode("utf-8"))
        except (ClientError, BotoCoreError) as exc:
            logger.error("Failed to list lessons: %s", exc)
            return None

    def get_public_url(self, lesson_id: str, file: str) -> str:
        cdn = os.environ.get("DO_SPACES_CDN", f"{self.bucket}.{os.environ.get('DO_SPACES_REGION','nyc3')}.cdn.digitaloceanspaces.com")
        return f"https://{cdn}/lessons/{lesson_id}/{file}"
