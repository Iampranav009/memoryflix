import { NextResponse } from "next/server";
import { supabase, mapUser } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firebaseUid, email, name, photoUrl } = body;

    if (!firebaseUid || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
