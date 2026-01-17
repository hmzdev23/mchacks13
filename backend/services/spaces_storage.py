"""
DigitalOcean Spaces Storage Service

S3-compatible object storage for:
- Expert keypoint JSON files
- Expert video clips
- Pack metadata
- User uploads (stretch)
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import BinaryIO, List, Optional

import boto3
from botocore.config import Config

from config import get_settings

settings = get_settings()


class SpacesStorage:
    """
    DigitalOcean Spaces storage service.
    """

    def __init__(self):
        """Initialize Spaces client."""
        self.client = boto3.client(
            "s3",
            region_name=settings.do_spaces_region,
            endpoint_url=settings.do_spaces_endpoint,
            aws_access_key_id=settings.do_spaces_key,
            aws_secret_access_key=settings.do_spaces_secret,
            config=Config(signature_version="s3v4"),
        )
        self.bucket = settings.do_spaces_bucket

    def upload_file(self, file_path: str, key: str, content_type: Optional[str] = None, public: bool = False) -> str:
        """
        Upload a file to Spaces.
        """
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type
        if public:
            extra_args["ACL"] = "public-read"

        self.client.upload_file(file_path, self.bucket, key, ExtraArgs=extra_args)
        return self.get_public_url(key)

    def upload_bytes(self, data: bytes, key: str, content_type: str = "application/octet-stream", public: bool = False) -> str:
        """
        Upload bytes directly to Spaces.
        """
        extra_args = {"ContentType": content_type}
        if public:
            extra_args["ACL"] = "public-read"

        from io import BytesIO

        self.client.upload_fileobj(BytesIO(data), self.bucket, key, ExtraArgs=extra_args)
        return self.get_public_url(key)

    def upload_json(self, data: dict, key: str, public: bool = True) -> str:
        """
        Upload JSON data to Spaces.
        """
        json_bytes = json.dumps(data, indent=2).encode("utf-8")
        return self.upload_bytes(json_bytes, key, content_type="application/json", public=public)

    def download_file(self, key: str, local_path: str):
        """Download a file from Spaces."""
        Path(local_path).parent.mkdir(parents=True, exist_ok=True)
        self.client.download_file(self.bucket, key, local_path)

    def download_bytes(self, key: str) -> bytes:
        """Download file as bytes."""
        response = self.client.get_object(Bucket=self.bucket, Key=key)
        return response["Body"].read()

    def download_json(self, key: str) -> dict:
        """Download and parse JSON file."""
        data = self.download_bytes(key)
        return json.loads(data.decode("utf-8"))

    def list_files(self, prefix: str = "") -> List[str]:
        """List files with given prefix."""
        response = self.client.list_objects_v2(Bucket=self.bucket, Prefix=prefix)
        return [obj["Key"] for obj in response.get("Contents", [])]

    def delete_file(self, key: str):
        """Delete a file from Spaces."""
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def file_exists(self, key: str) -> bool:
        """Check if file exists in Spaces."""
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except Exception:
            return False

    def get_public_url(self, key: str) -> str:
        """Get public URL for a file."""
        return f"https://{self.bucket}.{settings.do_spaces_region}.cdn.digitaloceanspaces.com/{key}"

    def generate_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """
        Generate a presigned URL for temporary access.
        """
        return self.client.generate_presigned_url(
            "get_object", Params={"Bucket": self.bucket, "Key": key}, ExpiresIn=expires_in
        )
