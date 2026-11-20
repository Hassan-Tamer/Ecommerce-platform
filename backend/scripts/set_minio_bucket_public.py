#!/usr/bin/env python3
"""Apply a public read policy to the product-images MinIO bucket (local dev)."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from minio import Minio

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def _endpoint_host() -> str:
    raw = os.getenv("MINIO_ENDPOINT", "http://127.0.0.1:9001")
    parsed = urlparse(raw if "://" in raw else f"http://{raw}")
    host = parsed.hostname or "127.0.0.1"
    if parsed.port:
        return f"{host}:{parsed.port}"
    return host


def main() -> None:
    bucket = os.getenv("MINIO_BUCKET", "product-images")
    access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    secure = os.getenv("MINIO_USE_SSL", "false").lower() in {"1", "true", "yes"}

    client = Minio(
        _endpoint_host(),
        access_key=access_key,
        secret_key=secret_key,
        secure=secure,
    )

    if not client.bucket_exists(bucket):
        print(f"Bucket {bucket!r} does not exist; create it in the MinIO console first.", file=sys.stderr)
        raise SystemExit(1)

    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"AWS": ["*"]},
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{bucket}/*"],
            }
        ],
    }

    client.set_bucket_policy(bucket, json.dumps(policy))
    print("Public read enabled for", bucket)


if __name__ == "__main__":
    main()