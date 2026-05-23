import { NextResponse } from "next/server";
import { supabase, mapSeries } from "@/lib/supabase";
import { verifyAuth } from "@/lib/auth";

// Helper: Verify that a profile belongs to the user
async function verifyProfileOwner(profileId: string, userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("id", profileId)
    .maybeSingle();

  return profile?.user_id === userId;
}

// Helper: Verify that a series belongs to a profile owned by the user
async function verifySeriesOwner(seriesId: string, userId: string): Promise<boolean> {
  const { data: series } = await supabase
    .from("series")
    .select("profile_id")
    .eq("id", seriesId)
    .maybeSingle();

  if (!series) return false;
  return verifyProfileOwner(series.profile_id, userId);
}

// GET: list all series for a profile, or get one by id with its seasons
export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const profileId = searchParams.get("profileId");

    if (id) {
      // Authorization Check: Verify series ownership
      const isOwner = await verifySeriesOwner(id, user?.id || "");
      if (!isOwner) {
        return NextResponse.json({ error: "Forbidden: You do not own this series" }, { status: 403 });
      }

      // Fetch single series with its seasons
      const { data: series, error } = await supabase
        .from("series")
        .select("*, seasons:seasons(*)")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!series) {
        return NextResponse.json({ error: "Series not found" }, { status: 404 });
      }

      return NextResponse.json(mapSeries(series));
    }

    if (profileId) {
      // Authorization Check: Verify profile ownership
      const isOwner = await verifyProfileOwner(profileId, user?.id || "");
      if (!isOwner) {
        return NextResponse.json({ error: "Forbidden: You do not own this profile" }, { status: 403 });
      }

      const { data: seriesList, error } = await supabase
        .from("series")
        .select("*, seasons:seasons(*)")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return NextResponse.json((seriesList || []).map(mapSeries).filter(Boolean));
    }

    return NextResponse.json(
      { error: "Missing required query parameter: id or profileId" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("API GET Series Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: create a new series
export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { profileId, title, description, thumbnailUrl } = body;

    if (!profileId || !title) {
      return NextResponse.json(
        { error: "Missing required fields: profileId and title" },
        { status: 400 }
      );
    }

    // Authorization Check: Verify profile ownership
    const isOwner = await verifyProfileOwner(profileId, user?.id || "");
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden: You do not own this profile" }, { status: 403 });
    }

    const { data: series, error } = await supabase
      .from("series")
      .insert({
        profile_id: profileId,
        title,
        description: description || null,
        thumbnail_url: thumbnailUrl || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(mapSeries(series));
  } catch (error: any) {
    console.error("API POST Series Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// PUT: update a series (title, description, thumbnailUrl)
export async function PUT(request: Request) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { id, title, description, thumbnailUrl } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing series ID" }, { status: 400 });
    }

    // Authorization Check: Verify series ownership
    const isOwner = await verifySeriesOwner(id, user?.id || "");
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden: You do not own this series" }, { status: 403 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (thumbnailUrl !== undefined) updateData.thumbnail_url = thumbnailUrl;

    const { data: updated, error } = await supabase
      .from("series")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(mapSeries(updated));
  } catch (error: any) {
    console.error("API PUT Series Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: delete a series (seasons stay, series_id becomes null)
export async function DELETE(request: Request) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing series ID" }, { status: 400 });
    }

    // Authorization Check: Verify series ownership
    const isOwner = await verifySeriesOwner(id, user?.id || "");
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden: You do not own this series" }, { status: 403 });
    }

    // Un-assign all seasons from this series before deleting
    await supabase
      .from("seasons")
      .update({ series_id: null })
      .eq("series_id", id);

    const { error } = await supabase.from("series").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API DELETE Series Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
