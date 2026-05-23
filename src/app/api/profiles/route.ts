import { NextResponse } from "next/server";
import { supabase, mapProfile } from "@/lib/supabase";
import { verifyAuth } from "@/lib/auth";

// GET profiles for a user
export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Authorization Check: Enforce that the user can only fetch their own profiles
    if (user?.id !== userId) {
      return NextResponse.json({ error: "Forbidden: You do not have access to these profiles" }, { status: 403 });
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json((profiles || []).map(mapProfile));
  } catch (error: any) {
    console.error("API Get Profiles Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST create a profile
export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { userId, name, avatarUrl } = body;

    if (!userId || !name || !avatarUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Authorization Check: Enforce that the user can only create a profile for themselves
    if (user?.id !== userId) {
      return NextResponse.json({ error: "Forbidden: You cannot create a profile for another user" }, { status: 403 });
    }

    // Check profile limit (max 6)
    const { count, error: countError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      throw countError;
    }

    if (count !== null && count >= 6) {
      return NextResponse.json({ error: "Profile limit of 6 reached" }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .insert({
        user_id: userId,
        name,
        avatar_url: avatarUrl,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(mapProfile(profile));
  } catch (error: any) {
    console.error("API Create Profile Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT update a profile
export async function PUT(request: Request) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { id, name, avatarUrl } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing profile ID" }, { status: 400 });
    }

    // Authorization Check: Fetch profile and verify ownership
    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (existingProfile.user_id !== user?.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this profile" }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;

    const { data: updatedProfile, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(mapProfile(updatedProfile));
  } catch (error: any) {
    console.error("API Update Profile Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE a profile
export async function DELETE(request: Request) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing profile ID" }, { status: 400 });
    }

    // Authorization Check: Fetch profile and verify ownership
    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (existingProfile.user_id !== user?.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this profile" }, { status: 403 });
    }

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API Delete Profile Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
