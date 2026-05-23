import { NextResponse } from "next/server";
import { supabase, mapUser } from "@/lib/supabase";
import { verifyAuth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { user: verifiedUser, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { firebaseUid, email, name, photoUrl } = body;

    if (!firebaseUid || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (verifiedUser?.firebaseUid !== firebaseUid) {
      return NextResponse.json({ error: "Forbidden: You cannot synchronize another user's account" }, { status: 403 });
    }

    // Upsert user to Supabase DB
    const { data: user, error } = await supabase
      .from("users")
      .upsert({
        firebase_uid: firebaseUid,
        email,
        name: name || null,
        photo_url: photoUrl || null,
      }, { onConflict: "firebase_uid" })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(mapUser(user));
  } catch (error: any) {
    console.error("API Auth Sync Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
