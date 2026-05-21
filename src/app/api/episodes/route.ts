import { NextResponse } from "next/server";
import { supabase, mapEpisode } from "@/lib/supabase";
import { s3, BUCKET_NAME } from "@/lib/s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { optimizeVideo } from "@/lib/videoProcessor";

// GET episodes in a season
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("seasonId");

    if (!seasonId) {
      return NextResponse.json({ error: "Missing seasonId" }, { status: 400 });
    }

    const { data: episodes, error } = await supabase
      .from("episodes")
      .select("*")
      .eq("season_id", seasonId)
      .order("episode_number", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json((episodes || []).map(mapEpisode));
  } catch (error: any) {
    console.error("API GET Episodes Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST add an episode
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      seasonId, 
      title, 
      description, 
      thumbnailUrl, 
      mediaUrl, 
      mediaType, 
      memoryDate, 
      durationSeconds 
    } = body;

    if (!seasonId || !title || !mediaUrl || !mediaType || !memoryDate) {
      return NextResponse.json(
        { error: "Missing required fields: seasonId, title, mediaUrl, mediaType, memoryDate" },
        { status: 400 }
      );
    }

    // Determine episode number dynamically
    const { count, error: countError } = await supabase
      .from("episodes")
      .select("*", { count: "exact", head: true })
      .eq("season_id", seasonId);

    if (countError) {
      throw countError;
    }

    const episodeNumber = (count || 0) + 1; // Start indexing at 1

    const { data: episode, error } = await supabase
      .from("episodes")
      .insert({
        season_id: seasonId,
        title,
        description: description || null,
        thumbnail_url: thumbnailUrl || null,
        media_url: mediaUrl,
        media_type: mediaType,
        episode_number: episodeNumber,
        memory_date: new Date(memoryDate),
        duration_seconds: durationSeconds ? parseInt(durationSeconds) : null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (mediaType === "video") {
      optimizeVideo(episode.id, mediaUrl, durationSeconds ? parseInt(durationSeconds) : 0)
        .catch(err => console.error("Background video optimization failed to start:", err));
    }

    return NextResponse.json(mapEpisode(episode));
  } catch (error: any) {
    console.error("API POST Episode Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// PUT update an episode (or reorder list)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    // Check if this is a bulk reordering request
    const { reorderedEpisodes } = body;
    if (reorderedEpisodes && Array.isArray(reorderedEpisodes)) {
      // Fetch current episodes to update so that all required fields are included in the upsert
      const { data: currentEpisodes, error: fetchError } = await supabase
        .from("episodes")
        .select("*")
        .in("id", reorderedEpisodes.map((ep: any) => ep.id));

      if (fetchError) {
        throw fetchError;
      }

      if (currentEpisodes && currentEpisodes.length > 0) {
        const updates = currentEpisodes.map((ep: any) => {
          const matched = reorderedEpisodes.find((r: any) => r.id === ep.id);
          return {
            ...ep,
            episode_number: matched ? matched.episodeNumber : ep.episode_number,
          };
        });

        const { error: upsertError } = await supabase
          .from("episodes")
          .upsert(updates);

        if (upsertError) {
          throw upsertError;
        }
      }
      
      return NextResponse.json({ success: true, message: "Order updated successfully" });
    }

    // Otherwise standard update
    const { 
      id, 
      title, 
      description, 
      thumbnailUrl, 
      mediaUrl, 
      memoryDate, 
      durationSeconds 
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing episode ID" }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (thumbnailUrl !== undefined) updateData.thumbnail_url = thumbnailUrl;
    if (mediaUrl !== undefined) updateData.media_url = mediaUrl;
    if (memoryDate !== undefined) updateData.memory_date = memoryDate ? new Date(memoryDate) : undefined;
    if (durationSeconds !== undefined) updateData.duration_seconds = durationSeconds !== null ? parseInt(durationSeconds) : null;

    const { data: updatedEpisode, error } = await supabase
      .from("episodes")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(mapEpisode(updatedEpisode));
  } catch (error: any) {
    console.error("API PUT Episode Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE an episode
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing episode ID" }, { status: 400 });
    }

    // Get details of episode before delete to know seasonId and S3 mediaUrl
    const { data: deletedEpisode, error: fetchError } = await supabase
      .from("episodes")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (!deletedEpisode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    // Delete episode
    const { error: deleteError } = await supabase
      .from("episodes")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    // Clean up S3 object in background
    if (deletedEpisode.media_url && deletedEpisode.media_url.includes(".amazonaws.com/")) {
      try {
        const fileKey = deletedEpisode.media_url.split(".amazonaws.com/")[1];
        if (fileKey) {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileKey,
          });
          await s3.send(deleteCommand);
        }
      } catch (s3Error) {
        console.error("Failed to delete S3 file during episode deletion:", s3Error);
      }
    }

    // Re-adjust episode numbers of remaining episodes in this season to keep them contiguous
    const { data: remaining, error: remainingError } = await supabase
      .from("episodes")
      .select("*")
      .eq("season_id", deletedEpisode.season_id)
      .order("episode_number", { ascending: true });

    if (remainingError) {
      throw remainingError;
    }

    if (remaining && remaining.length > 0) {
      const reindexUpdates = remaining.map((ep, index) => ({
        ...ep,
        episode_number: index + 1,
      }));

      const { error: upsertError } = await supabase
        .from("episodes")
        .upsert(reindexUpdates);

      if (upsertError) {
        throw upsertError;
      }
    }

    return NextResponse.json({ success: true, deletedEpisode: mapEpisode(deletedEpisode) });
  } catch (error: any) {
    console.error("API DELETE Episode Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
