import { NextResponse } from "next/server";
import { s3, BUCKET_NAME } from "@/lib/s3";
import { ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // 1. Query all S3 objects under the user's prefix
    const prefix = `memoryflix/${userId}/`;
    const s3Command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });

    const s3Response = await s3.send(s3Command);
    const s3Objects = s3Response.Contents || [];

    // 2. Fetch user's profiles, seasons, and episodes from database to map names
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("user_id", userId);

    const profileIds = (profiles || []).map((p) => p.id);

    let seasons: any[] = [];
    let episodes: any[] = [];

    if (profileIds.length > 0) {
      const { data: seasonsData } = await supabase
        .from("seasons")
        .select("id, title, profile_id")
        .in("profile_id", profileIds);

      seasons = seasonsData || [];
      const seasonIds = seasons.map((s) => s.id);

      if (seasonIds.length > 0) {
        const { data: episodesData } = await supabase
          .from("episodes")
          .select("id, title, media_url, media_type, season_id, thumbnail_url")
          .in("season_id", seasonIds);

        episodes = episodesData || [];
      }
    }

    // 3. Aggregate and map S3 objects to actual DB entities
    let totalSizeBytes = 0;
    let videosBytes = 0;
    let imagesBytes = 0;

    const mappedFiles = s3Objects.map((obj) => {
      const key = obj.Key || "";
      const size = obj.Size || 0;
      totalSizeBytes += size;

      // Extract filename from key
      const parts = key.split("/");
      const filename = parts[parts.length - 1] || "unknown";

      // Detect type
      const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(key);
      if (isVideo) {
        videosBytes += size;
      } else {
        imagesBytes += size;
      }

      // Check if this object is a media_url or thumbnail_url in DB episodes
      const matchedEpisode = episodes.find(
        (ep) =>
          ep.media_url?.includes(key) || ep.thumbnail_url?.includes(key)
      );

      let displayName = filename;
      let context = "Metadata / Cover Frame";
      let isOrphaned = false;

      if (matchedEpisode) {
        const matchedSeason = seasons.find((s) => s.id === matchedEpisode.season_id);
        const profile = profiles?.find((p) => p.id === matchedSeason?.profile_id);

        if (matchedEpisode.media_url?.includes(key)) {
          displayName = matchedEpisode.title;
          context = `${profile?.name ? profile.name + " > " : ""}${matchedSeason?.title || "Collection"}`;
        } else {
          displayName = `Cover Frame: ${matchedEpisode.title}`;
          context = `${profile?.name ? profile.name + " > " : ""}${matchedSeason?.title || "Collection"}`;
        }
      } else {
        // Check if matched season cover
        const matchedSeasonCover = seasons.find((s) => s.thumbnail_url?.includes(key));
        if (matchedSeasonCover) {
          const profile = profiles?.find((p) => p.id === matchedSeasonCover.profile_id);
          displayName = `Collection Poster: ${matchedSeasonCover.title}`;
          context = `${profile?.name ? profile.name + " > " : ""}${matchedSeasonCover.title}`;
        } else {
          isOrphaned = true;
        }
      }

      return {
        key,
        sizeBytes: size,
        filename,
        displayName,
        context,
        mediaType: isVideo ? "video" : "image",
        lastModified: obj.LastModified,
        isOrphaned,
        episodeId: matchedEpisode?.id || null,
        seasonId: matchedEpisode?.season_id || null,
      };
    });

    // Limit to 50 GB
    const limitBytes = 50 * 1024 * 1024 * 1024;
    const percentUsed = totalSizeBytes > 0 ? (totalSizeBytes / limitBytes) * 100 : 0;

    return NextResponse.json({
      totalSizeBytes,
      limitBytes,
      percentUsed: parseFloat(percentUsed.toFixed(2)),
      breakdown: {
        videosBytes,
        imagesBytes,
      },
      files: mappedFiles.sort((a, b) => b.sizeBytes - a.sizeBytes), // Sort largest first
    });
  } catch (error: any) {
    console.error("API GET Storage Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const key = searchParams.get("key");

    if (!userId || !key) {
      return NextResponse.json({ error: "Missing userId or key" }, { status: 400 });
    }

    // Security check: ensure user only deletes their own files
    const prefix = `memoryflix/${userId}/`;
    if (!key.startsWith(prefix)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to delete this file" },
        { status: 403 }
      );
    }

    // Delete the S3 object
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3.send(deleteCommand);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API DELETE Storage Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
