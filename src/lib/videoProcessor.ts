import { exec } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";
import axios from "axios";
import { s3, BUCKET_NAME } from "./s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { supabase } from "./supabase";

const execPromise = util.promisify(exec);

// Safely get ffmpeg path
let ffmpegPath: string;
try {
  ffmpegPath = require("ffmpeg-static") || "ffmpeg";
} catch (e) {
  ffmpegPath = "ffmpeg";
}

/**
 * Helper to convert seconds into HH:MM:SS.mmm format for WebVTT
 */
function formatVttTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  const pad = (num: number, size = 2) => String(num).padStart(size, "0");
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(ms, 3)}`;
}

/**
 * Main video optimization & preview extraction pipeline
 */
export async function optimizeVideo(
  episodeId: string,
  rawMediaUrl: string,
  durationSeconds: number
) {
  console.log(`[VideoProcessor] Starting processing for episode ${episodeId}`);
  console.log(`[VideoProcessor] Source URL: ${rawMediaUrl}`);

  // 1. Create a workspace temporary folder
  const tempDir = path.join(process.cwd(), "scratch", `process_${episodeId}`);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const inputPath = path.join(tempDir, "input.mp4");
  const outputPath = path.join(tempDir, "output.mp4");
  const spritePath = path.join(tempDir, "sprite.jpg");
  const vttPath = path.join(tempDir, "preview.vtt");

  try {
    // 2. Download the video from rawMediaUrl
    console.log(`[VideoProcessor] Downloading raw video to ${inputPath}...`);
    const writer = fs.createWriteStream(inputPath);
    const response = await axios({
      url: rawMediaUrl,
      method: "GET",
      responseType: "stream",
    });

    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on("finish", () => resolve());
      writer.on("error", (err) => reject(err));
    });
    console.log(`[VideoProcessor] Download complete.`);

    // 3. Run Phase 1 Optimization
    // ffmpeg -i input.mp4 -vcodec libx264 -crf 30 -preset veryfast -acodec aac -b:a 96k -movflags +faststart output.mp4
    console.log(`[VideoProcessor] Running video optimization...`);
    const optimizeCmd = `"${ffmpegPath}" -y -i "${inputPath}" -vcodec libx264 -crf 30 -preset veryfast -acodec aac -b:a 96k -movflags +faststart "${outputPath}"`;
    await execPromise(optimizeCmd);
    console.log(`[VideoProcessor] Video optimization complete.`);

    // 4. Run Phase 2, Step 1: Extract frames every 10 seconds
    // ffmpeg -i output.mp4 -vf "fps=1/10,scale=160:90" thumbs_%03d.jpg
    console.log(`[VideoProcessor] Extracting thumbnail frames...`);
    const thumbsPattern = path.join(tempDir, "thumbs_%03d.jpg");
    const extractCmd = `"${ffmpegPath}" -y -i "${outputPath}" -vf "fps=1/10,scale=160:90" "${thumbsPattern}"`;
    await execPromise(extractCmd);

    // 5. Count extracted thumbnails
    const files = fs.readdirSync(tempDir);
    let thumbFiles = files.filter(f => f.startsWith("thumbs_") && f.endsWith(".jpg")).sort();
    
    // Fallback: If no frames extracted (video is under 10 seconds), extract 1 frame
    if (thumbFiles.length === 0) {
      console.log(`[VideoProcessor] Video short or no thumbnails extracted. Extracting fallback thumbnail...`);
      const fallbackThumb = path.join(tempDir, "thumbs_001.jpg");
      const fallbackCmd = `"${ffmpegPath}" -y -ss 00:00:00 -i "${outputPath}" -vframes 1 -vf "scale=160:90" "${fallbackThumb}"`;
      await execPromise(fallbackCmd);
      thumbFiles = ["thumbs_001.jpg"];
    }

    const totalThumbnails = thumbFiles.length;
    console.log(`[VideoProcessor] Extracted ${totalThumbnails} thumbnails.`);

    // 6. Run Phase 2, Step 2: Combine all thumbnails into ONE sprite image arranged in grid (10 columns per row)
    const columns = 10;
    const rows = Math.ceil(totalThumbnails / columns);
    console.log(`[VideoProcessor] Combining thumbnails into grid sprite (${columns}x${rows})...`);
    const spriteCmd = `"${ffmpegPath}" -y -i "${thumbsPattern}" -vf "tile=${columns}x${rows}" "${spritePath}"`;
    await execPromise(spriteCmd);
    console.log(`[VideoProcessor] Sprite creation complete.`);

    // 7. Phase 2, Step 3: Generate the VTT file
    console.log(`[VideoProcessor] Generating WebVTT preview file...`);
    let vttContent = "WEBVTT\n\n";

    for (let i = 0; i < totalThumbnails; i++) {
      const startSec = i * 10;
      // Use the actual duration as cap for the final interval if durationSeconds is defined
      const endSec = Math.min((i + 1) * 10, durationSeconds || (i + 1) * 10);
      
      const startStr = formatVttTime(startSec);
      const endStr = formatVttTime(endSec);

      const col = i % columns;
      const row = Math.floor(i / columns);
      const x = col * 160;
      const y = row * 90;

      vttContent += `${startStr} --> ${endStr}\n`;
      vttContent += `sprite.jpg#xywh=${x},${y},160,90\n\n`;
    }

    fs.writeFileSync(vttPath, vttContent, "utf-8");
    console.log(`[VideoProcessor] WebVTT generation complete.`);

    // 8. Phase 3: Upload final files to AWS S3
    const region = process.env.AWS_REGION || "us-east-1";
    const s3Prefix = `videos/${episodeId}`;
    
    console.log(`[VideoProcessor] Uploading optimized video to S3...`);
    const videoStream = fs.createReadStream(outputPath);
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `${s3Prefix}/video.mp4`,
        Body: videoStream,
        ACL: "public-read",
        CacheControl: "public, max-age=31536000",
        ContentType: "video/mp4",
      })
    );

    console.log(`[VideoProcessor] Uploading sprite sheet to S3...`);
    const spriteStream = fs.createReadStream(spritePath);
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `${s3Prefix}/sprite.jpg`,
        Body: spriteStream,
        ACL: "public-read",
        CacheControl: "public, max-age=31536000",
        ContentType: "image/jpeg",
      })
    );

    console.log(`[VideoProcessor] Uploading WebVTT preview to S3...`);
    const vttStream = fs.createReadStream(vttPath);
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `${s3Prefix}/preview.vtt`,
        Body: vttStream,
        ACL: "public-read",
        CacheControl: "public, max-age=31536000",
        ContentType: "text/vtt",
      })
    );

    console.log(`[VideoProcessor] Uploads to S3 complete.`);

    // 9. Update database with the optimized video URL
    const optimizedMediaUrl = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${s3Prefix}/video.mp4`;
    console.log(`[VideoProcessor] Updating database record for episode ${episodeId} to ${optimizedMediaUrl}...`);
    
    const { error: dbError } = await supabase
      .from("episodes")
      .update({ media_url: optimizedMediaUrl })
      .eq("id", episodeId);

    if (dbError) {
      throw dbError;
    }
    console.log(`[VideoProcessor] Database update successful!`);

  } catch (error) {
    console.error(`[VideoProcessor] Error processing episode ${episodeId}:`, error);
  } finally {
    // 10. Clean up temporary files
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`[VideoProcessor] Temporary directory cleaned up.`);
      }
    } catch (cleanupError) {
      console.error(`[VideoProcessor] Cleanup error for ${tempDir}:`, cleanupError);
    }
  }
}
