import asyncio
import os
import boto3
from botocore.config import Config as BotoConfig

def test_storage():
    endpoint = "http://127.0.0.1:9000"
    print(f"Testing storage at {endpoint}...")
    client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id="minioadmin",
        aws_secret_access_key="minioadmin",
        region_name="us-east-1",
        config=BotoConfig(signature_version="s3v4"),
    )
    try:
        response = client.list_buckets()
        print(f"Success! Buckets: {[b['Name'] for b in response['Buckets']]}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_storage()
