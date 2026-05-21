import { NextResponse } from "next/server";
import { s3, BUCKET_NAME } from "@/lib/s3";
import { PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, profileId, seasonId, filename, contentType, fileSize } = body;

    if (!userId || !profileId || !seasonId || !filename || !contentType) {
      return NextResponse.json(
        { error: "Missing required fields: userId, profileId, seasonId, filename, contentType" },
        { status: 400 }
      );
    }

    // Server-side safety enforcer: calculate current usage in S3 and check 50 GB limit
    const prefix = `memoryflix/${userId}/`;
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });
    const s3Response = await s3.send(listCommand);
    const s3Objects = s3Response.Contents || [];
    
    let currentUsageBytes = 0;
    for (const obj of s3Objects) {
      currentUsageBytes += obj.Size || 0;
    }

    const incomingSize = fileSize ? parseInt(fileSize) : 0;
    const limitBytes = 50 * 1024 * 1024 * 1024; // 50 GB

    if (currentUsageBytes + incomingSize > limitBytes) {
      return NextResponse.json(
        {
          error: "LIMIT_EXCEEDED",
          message: "Your storage vault has reached its 50 GB capacity limit. Please delete existing memories in settings to free up space."
        },
        { status: 403 }
      );
    }

    // Sanitize filename to avoid weird character issues
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const timestamp = Date.now();
    // Unique key structure in S3 for clear path organization
    const fileKey = `memoryflix/${userId}/${profileId}/${seasonId}/${timestamp}_${sanitizedFilename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType,
    });

    // Pre-signed URL valid for 1 hour (3600 seconds)
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    
    // Direct S3 public/authenticated download URL
    const mediaUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`;

    return NextResponse.json({
      uploadUrl,
      mediaUrl,
      fileKey,
    });
  } catch (error: any) {
    console.error("API S3 Presign Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
