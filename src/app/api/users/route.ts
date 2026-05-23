import { NextResponse } from "next/server";
import { supabase, mapUser } from "@/lib/supabase";
import { verifyAuth } from "@/lib/auth";

// PUT: Update a user's details (such as name or photoUrl) in the database
export async function PUT(request: Request) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { id, name, photoUrl } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    // Authorization Check: Enforce that the user can only update their own details
    if (user?.id !== id) {
      return NextResponse.json({ error: "Forbidden: You cannot update another user's details" }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (photoUrl !== undefined) updateData.photo_url = photoUrl;

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(mapUser(updatedUser));
  } catch (error: any) {
    console.error("API Update User Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
