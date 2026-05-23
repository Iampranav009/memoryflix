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

  try {
    const isMultiVideo = rawMediaUrl.startsWith("[");
    const region = process.env.AWS_REGION || "ap-south-1";

    if (isMultiVideo) {
      console.log(`[VideoProcessor] Processing multi-video sequence...`);
      const segments = JSON.parse(rawMediaUrl) as { url: string; duration: number }[];
      const optimizedSegments: { low: string; medium: string; high: string; duration: number }[] = [];
      let totalThumbnailsCount = 0;

      // Temporary folder for combined frames
      const combinedThumbsDir = path.join(tempDir, "combined_thumbs");
      if (!fs.existsSync(combinedThumbsDir)) {
        fs.mkdirSync(combinedThumbsDir, { recursive: true });
      }

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const segInputPath = path.join(tempDir, `input_${i}.mp4`);
        const segOutputPathLow = path.join(tempDir, `output_${i}_low.mp4`);
        const segOutputPathMedium = path.join(tempDir, `output_${i}_medium.mp4`);
        const segOutputPathHigh = path.join(tempDir, `output_${i}_high.mp4`);
        const segThumbsPattern = path.join(tempDir, `thumbs_${i}_%03d.jpg`);

        console.log(`[VideoProcessor] Downloading segment ${i} from ${segment.url}...`);
        // Download segment
        const writer = fs.createWriteStream(segInputPath);
        const response = await axios({
          url: segment.url,
          method: "GET",
          responseType: "stream",
        });
        response.data.pipe(writer);
        await new Promise<void>((resolve, reject) => {
          writer.on("finish", () => resolve());
          writer.on("error", (err) => reject(err));
        });

        // Optimize segment - Low (480p)
        console.log(`[VideoProcessor] Optimizing segment ${i} (Low Quality 480p)...`);
        const optimizeCmdLow = `"${ffmpegPath}" -y -i "${segInputPath}" -vf "scale=-2:480" -vcodec libx264 -crf 34 -preset veryfast -b:v 400k -acodec aac -b:a 64k -movflags +faststart "${segOutputPathLow}"`;
        await execPromise(optimizeCmdLow);

        // Optimize segment - Medium (720p)
        console.log(`[VideoProcessor] Optimizing segment ${i} (Medium Quality 720p)...`);
        const optimizeCmdMedium = `"${ffmpegPath}" -y -i "${segInputPath}" -vf "scale=-2:720" -vcodec libx264 -crf 28 -preset veryfast -b:v 1000k -acodec aac -b:a 96k -movflags +faststart "${segOutputPathMedium}"`;
        await execPromise(optimizeCmdMedium);

        // Optimize segment - High (1080p)
        console.log(`[VideoProcessor] Optimizing segment ${i} (High Quality 1080p)...`);
        const optimizeCmdHigh = `"${ffmpegPath}" -y -i "${segInputPath}" -vf "scale=-2:1080" -vcodec libx264 -crf 22 -preset veryfast -b:v 2500k -acodec aac -b:a 128k -movflags +faststart "${segOutputPathHigh}"`;
        await execPromise(optimizeCmdHigh);

        // Upload optimized segments to S3
        const s3Prefix = `videos/${episodeId}`;
        console.log(`[VideoProcessor] Uploading optimized segment ${i} variants to S3...`);
        
        // Low Quality Upload
        const lowKey = `${s3Prefix}/video_${i}_low.mp4`;
        const lowStream = fs.createReadStream(segOutputPathLow);
        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: lowKey,
            ACL: "public-read",
            CacheControl: "public, max-age=31536000",
            ContentType: "video/mp4",
            Body: lowStream,
          })
        );

        // Medium Quality Upload
        const mediumKey = `${s3Prefix}/video_${i}_medium.mp4`;
        const mediumStream = fs.createReadStream(segOutputPathMedium);
        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: mediumKey,
            ACL: "public-read",
            CacheControl: "public, max-age=31536000",
            ContentType: "video/mp4",
            Body: mediumStream,
          })
        );

        // High Quality Upload
        const highKey = `${s3Prefix}/video_${i}_high.mp4`;
        const highStream = fs.createReadStream(segOutputPathHigh);
        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: highKey,
            ACL: "public-read",
            CacheControl: "public, max-age=31536000",
            ContentType: "video/mp4",
            Body: highStream,
          })
        );

        const optimizedSegmentLowUrl = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${lowKey}`;
        const optimizedSegmentMediumUrl = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${mediumKey}`;
        const optimizedSegmentHighUrl = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${highKey}`;

        optimizedSegments.push({
          low: optimizedSegmentLowUrl,
          medium: optimizedSegmentMediumUrl,
          high: optimizedSegmentHighUrl,
          duration: segment.duration || 0,
        });

        // Extract frames from optimized medium-quality segment
        console.log(`[VideoProcessor] Extracting thumbnail frames for segment ${i}...`);
        const extractCmd = `"${ffmpegPath}" -y -i "${segOutputPathMedium}" -vf "fps=1/10,scale=160:90" "${segThumbsPattern}"`;
        await execPromise(extractCmd);

        // Count and copy segment thumbs to combined thumbs directory
        const files = fs.readdirSync(tempDir);
        let segThumbFiles = files.filter(f => f.startsWith(`thumbs_${i}_`) && f.endsWith(".jpg")).sort();
        if (segThumbFiles.length === 0) {
          const fallbackThumb = path.join(tempDir, `thumbs_${i}_001.jpg`);
          const fallbackCmd = `"${ffmpegPath}" -y -ss 00:00:00 -i "${segOutputPathMedium}" -vframes 1 -vf "scale=160:90" "${fallbackThumb}"`;
          await execPromise(fallbackCmd);
          segThumbFiles = [`thumbs_${i}_001.jpg`];
        }

        for (const file of segThumbFiles) {
          totalThumbnailsCount++;
          const sequentialName = `thumb_${String(totalThumbnailsCount).padStart(3, "0")}.jpg`;
          fs.copyFileSync(path.join(tempDir, file), path.join(combinedThumbsDir, sequentialName));
        }
      }

      console.log(`[VideoProcessor] Combined thumbnails count: ${totalThumbnailsCount}`);

      // Combine thumbnails into sprite grid
      const columns = 10;
      const rows = Math.ceil(totalThumbnailsCount / columns);
      const spritePath = path.join(tempDir, "sprite.jpg");
      const thumbsPattern = path.join(combinedThumbsDir, "thumb_%03d.jpg");
      console.log(`[VideoProcessor] Combining multi-video thumbnails into grid sprite (${columns}x${rows})...`);
      const spriteCmd = `"${ffmpegPath}" -y -i "${thumbsPattern}" -vf "tile=${columns}x${rows}" "${spritePath}"`;
      await execPromise(spriteCmd);

      // Generate the WebVTT file
      const vttPath = path.join(tempDir, "preview.vtt");
      console.log(`[VideoProcessor] Generating WebVTT preview file...`);
      let vttContent = "WEBVTT\n\n";

      for (let i = 0; i < totalThumbnailsCount; i++) {
        const startSec = i * 10;
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

      // Upload sprite and preview.vtt
      const s3Prefix = `videos/${episodeId}`;
      console.log(`[VideoProcessor] Uploading sprite sheet to S3...`);
      const spriteStream = fs.createReadStream(spritePath);
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: `${s3Prefix}/sprite.jpg`,
          ACL: "public-read",
          CacheControl: "public, max-age=31536000",
          ContentType: "image/jpeg",
          Body: spriteStream,
        })
      );

      console.log(`[VideoProcessor] Uploading WebVTT preview to S3...`);
      const vttStream = fs.createReadStream(vttPath);
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: `${s3Prefix}/preview.vtt`,
          ACL: "public-read",
          CacheControl: "public, max-age=31536000",
          ContentType: "text/vtt",
          Body: vttStream,
        })
      );

      // Update database with optimized segments JSON string
      const optimizedMediaUrl = JSON.stringify(optimizedSegments);
      console.log(`[VideoProcessor] Updating database record for episode ${episodeId} to ${optimizedMediaUrl}...`);
      const { error: dbError } = await supabase
        .from("episodes")
        .update({ media_url: optimizedMediaUrl })
        .eq("id", episodeId);

      if (dbError) {
        throw dbError;
      }
      console.log(`[VideoProcessor] Database update successful for multi-video qualities!`);

    } else {
      // Standard Single Video Optimization - Multi-Quality
      const inputPath = path.join(tempDir, "input.mp4");
      const outputPathLow = path.join(tempDir, "output_low.mp4");
      const outputPathMedium = path.join(tempDir, "output_medium.mp4");
      const outputPathHigh = path.join(tempDir, "output_high.mp4");
      const spritePath = path.join(tempDir, "sprite.jpg");
      const vttPath = path.join(tempDir, "preview.vtt");

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

      // Optimize Low (480p)
      console.log(`[VideoProcessor] Running low quality optimization (480p)...`);
      const optimizeCmdLow = `"${ffmpegPath}" -y -i "${inputPath}" -vf "scale=-2:480" -vcodec libx264 -crf 34 -preset veryfast -b:v 400k -acodec aac -b:a 64k -movflags +faststart "${outputPathLow}"`;
      await execPromise(optimizeCmdLow);

      // Optimize Medium (720p)
      console.log(`[VideoProcessor] Running medium quality optimization (720p)...`);
      const optimizeCmdMedium = `"${ffmpegPath}" -y -i "${inputPath}" -vf "scale=-2:720" -vcodec libx264 -crf 28 -preset veryfast -b:v 1000k -acodec aac -b:a 96k -movflags +faststart "${outputPathMedium}"`;
      await execPromise(optimizeCmdMedium);

      // Optimize High (1080p)
      console.log(`[VideoProcessor] Running high quality optimization (1080p)...`);
      const optimizeCmdHigh = `"${ffmpegPath}" -y -i "${inputPath}" -vf "scale=-2:1080" -vcodec libx264 -crf 22 -preset veryfast -b:v 2500k -acodec aac -b:a 128k -movflags +faststart "${outputPathHigh}"`;
      await execPromise(optimizeCmdHigh);

      console.log(`[VideoProcessor] Video optimizations complete.`);

      // Extract thumbnails from medium-quality video
      console.log(`[VideoProcessor] Extracting thumbnail frames...`);
      const thumbsPattern = path.join(tempDir, "thumbs_%03d.jpg");
      const extractCmd = `"${ffmpegPath}" -y -i "${outputPathMedium}" -vf "fps=1/10,scale=160:90" "${thumbsPattern}"`;
      await execPromise(extractCmd);

      const files = fs.readdirSync(tempDir);
      let thumbFiles = files.filter(f => f.startsWith("thumbs_") && f.endsWith(".jpg")).sort();
      
      if (thumbFiles.length === 0) {
        console.log(`[VideoProcessor] Video short or no thumbnails extracted. Extracting fallback thumbnail...`);
        const fallbackThumb = path.join(tempDir, "thumbs_001.jpg");
        const fallbackCmd = `"${ffmpegPath}" -y -ss 00:00:00 -i "${outputPathMedium}" -vframes 1 -vf "scale=160:90" "${fallbackThumb}"`;
        await execPromise(fallbackCmd);
        thumbFiles = ["thumbs_001.jpg"];
      }

      const totalThumbnails = thumbFiles.length;
      console.log(`[VideoProcessor] Extracted ${totalThumbnails} thumbnails.`);

      const columns = 10;
      const rows = Math.ceil(totalThumbnails / columns);
      console.log(`[VideoProcessor] Combining thumbnails into grid sprite (${columns}x${rows})...`);
      const spriteCmd = `"${ffmpegPath}" -y -i "${thumbsPattern}" -vf "tile=${columns}x${rows}" "${spritePath}"`;
      await execPromise(spriteCmd);
      console.log(`[VideoProcessor] Sprite creation complete.`);

      console.log(`[VideoProcessor] Generating WebVTT preview file...`);
      let vttContent = "WEBVTT\n\n";

      for (let i = 0; i < totalThumbnails; i++) {
        const startSec = i * 10;
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

      const s3Prefix = `videos/${episodeId}`;
      console.log(`[VideoProcessor] Uploading optimized video variants to S3...`);
      
      // Upload Low Quality
      const lowStream = fs.createReadStream(outputPathLow);
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: `${s3Prefix}/video_low.mp4`,
          Body: lowStream,
          ACL: "public-read",
          CacheControl: "public, max-age=31536000",
          ContentType: "video/mp4",
        })
      );

      // Upload Medium Quality
      const mediumStream = fs.createReadStream(outputPathMedium);
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: `${s3Prefix}/video_medium.mp4`,
          Body: mediumStream,
          ACL: "public-read",
          CacheControl: "public, max-age=31536000",
          ContentType: "video/mp4",
        })
      );

      // Upload High Quality
      const highStream = fs.createReadStream(outputPathHigh);
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: `${s3Prefix}/video_high.mp4`,
          Body: highStream,
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

      const optimizedMediaUrl = JSON.stringify({
        low: `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${s3Prefix}/video_low.mp4`,
        medium: `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${s3Prefix}/video_medium.mp4`,
        high: `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${s3Prefix}/video_high.mp4`
      });
      console.log(`[VideoProcessor] Updating database record for episode ${episodeId} to qualities JSON...`);
      
      const { error: dbError } = await supabase
        .from("episodes")
        .update({ media_url: optimizedMediaUrl })
        .eq("id", episodeId);

      if (dbError) {
        throw dbError;
      }
      console.log(`[VideoProcessor] Database update successful!`);
    }
  } catch (error) {
    console.error(`[VideoProcessor] Error processing episode ${episodeId}:`, error);
  } finally {
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
