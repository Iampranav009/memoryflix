import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION || "ap-south-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!accessKeyId || !secretAccessKey) {
  console.warn("WARNING: AWS credentials are not fully configured in environment variables.");
}

export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: accessKeyId || "dummy-key",
    secretAccessKey: secretAccessKey || "dummy-secret",
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
});

export const BUCKET_NAME = process.env.AWS_BUCKET_NAME || "memoryflix-media";
