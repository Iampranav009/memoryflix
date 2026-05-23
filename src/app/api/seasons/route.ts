import { NextResponse } from "next/server";
import { supabase, mapSeason } from "@/lib/supabase";
import { s3, BUCKET_NAME } from "@/lib/s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { verifyAuth } from "@/lib/auth";

// GET season details or list seasons
export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const profileId = searchParams.get("profileId");

    if (id) {
      // Fetch details for a specific season
      const { data: season, error } = await supabase
        .from("seasons")
        .select("*, episodes:episodes(*)")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!season) {
        return NextResponse.json({ error: "Season not found" }, { status: 404 });
      }

      // Authorization Check: Verify that this season belongs to a profile owned by the user
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", season.profile_id)
        .maybeSingle();

      if (!profile || profile.user_id !== user?.id) {
        return NextResponse.json({ error: "Forbidden: You do not own this season" }, { status: 403 });
      }

      return NextResponse.json(mapSeason(season));
    }

    if (profileId) {
      // Authorization Check: Verify that this profile belongs to the user
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", profileId)
        .maybeSingle();

      if (!profile || profile.user_id !== user?.id) {
        return NextResponse.json({ error: "Forbidden: You do not own this profile" }, { status: 403 });
      }

      // List seasons for a profile
      const { data: seasons, error } = await supabase
        .from("seasons")
        .select("*, episodes:episodes(*)")
        .eq("profile_id", profileId)
        .order("display_order", { ascending: true });

      if (error) {
        throw error;
      }

      return NextResponse.json((seasons || []).map(mapSeason).filter(Boolean));
    }

    return NextResponse.json({ error: "Missing required query parameters: id or profileId" }, { status: 400 });
  } catch (error: any) {
    console.error("API GET Seasons Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST create a season
export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { profileId, title, description, thumbnailUrl } = body;

    if (!profileId || !title) {
      return NextResponse.json({ error: "Missing required fields: profileId and title" }, { status: 400 });
    }

    // Authorization Check: Verify profile ownership
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", profileId)
      .maybeSingle();

    if (!profile || profile.user_id !== user?.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this profile" }, { status: 403 });
    }

    // Determine the displayOrder for this season
    const { count, error: countError } = await supabase
      .from("seasons")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profileId);

    if (countError) {
      throw countError;
    }

    const displayOrder = count || 0;

    const { data: season, error } = await supabase
      .from("seasons")
      .insert({
        profile_id: profileId,
        title,
        description: description || null,
        thumbnail_url: thumbnailUrl || null,
        display_order: displayOrder,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(mapSeason(season));
  } catch (error: any) {
    console.error("API POST Season Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT update a season
export async function PUT(request: Request) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { id, title, description, thumbnailUrl, featured, seriesId } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing season ID" }, { status: 400 });
    }

    // Authorization Check: Fetch season first
    const { data: existingSeason } = await supabase
      .from("seasons")
      .select("profile_id")
      .eq("id", id)
      .maybeSingle();

    if (!existingSeason) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    // Verify profile ownership
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", existingSeason.profile_id)
      .maybeSingle();

    if (!profile || profile.user_id !== user?.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this season" }, { status: 403 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (thumbnailUrl !== undefined) updateData.thumbnail_url = thumbnailUrl;
    if (featured !== undefined) updateData.featured = featured;
    if (seriesId !== undefined) updateData.series_id = seriesId;

    const { data: updatedSeason, error } = await supabase
      .from("seasons")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(mapSeason(updatedSeason));
  } catch (error: any) {
    console.error("API PUT Season Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE a season
export async function DELETE(request: Request) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing season ID" }, { status: 400 });
    }

    // Authorization Check: Fetch season first
    const { data: season, error: fetchError } = await supabase
      .from("seasons")
      .select("profile_id, thumbnail_url, episodes:episodes(media_url, thumbnail_url)")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (!season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    // Verify profile ownership
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", season.profile_id)
      .maybeSingle();

    if (!profile || profile.user_id !== user?.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this season" }, { status: 403 });
    }

    // Perform database deletion. Delete episodes first to ensure clean manual cascade.
    const { error: epDeleteError } = await supabase
      .from("episodes")
      .delete()
      .eq("season_id", id);

    if (epDeleteError) {
      throw epDeleteError;
    }

    const { error: seasonDeleteError } = await supabase
      .from("seasons")
      .delete()
      .eq("id", id);

    if (seasonDeleteError) {
      throw seasonDeleteError;
    }

    // Collect all URLs to delete from S3
    const urlsToDelete: string[] = [];
    if (season.thumbnail_url) {
      urlsToDelete.push(season.thumbnail_url);
    }
    if (season.episodes && Array.isArray(season.episodes)) {
      season.episodes.forEach((ep: any) => {
        if (ep.thumbnail_url) urlsToDelete.push(ep.thumbnail_url);
        
        if (ep.media_url) {
          const mediaUrlStr = ep.media_url;
          if (mediaUrlStr.startsWith("[") || mediaUrlStr.startsWith("{")) {
            try {
              const parsed = JSON.parse(mediaUrlStr);
              if (Array.isArray(parsed)) {
                for (const item of parsed) {
                  if (item.low) urlsToDelete.push(item.low);
                  if (item.medium) urlsToDelete.push(item.medium);
                  if (item.high) urlsToDelete.push(item.high);
                  if (item.url) urlsToDelete.push(item.url);
                }
              } else {
                if (parsed.low) urlsToDelete.push(parsed.low);
                if (parsed.medium) urlsToDelete.push(parsed.medium);
                if (parsed.high) urlsToDelete.push(parsed.high);
                if (parsed.url) urlsToDelete.push(parsed.url);
              }
            } catch (e) {
              urlsToDelete.push(mediaUrlStr);
            }
          } else {
            urlsToDelete.push(mediaUrlStr);
          }
        }
      });
    }

    // Delete files from S3 in the background or sequentially
    for (const url of urlsToDelete) {
      if (url && url.includes(".amazonaws.com/")) {
        try {
          const fileKey = url.split(".amazonaws.com/")[1];
          if (fileKey) {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: fileKey,
            });
            await s3.send(deleteCommand);
          }
        } catch (s3Error) {
          console.error(`Failed to delete S3 file ${url} during season deletion:`, s3Error);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      deletedUrls: urlsToDelete,
    });
  } catch (error: any) {
    console.error("API DELETE Season Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
