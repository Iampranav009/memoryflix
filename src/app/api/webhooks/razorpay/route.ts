import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";
import { sendSubscriptionEmail } from "@/lib/mail";

// Map plans to storage limits in MB
const PLAN_LIMITS_MB: Record<string, number> = {
  free: 500,
  starter: 3000, // 3 GB
  family: 5000,  // 5 GB
  elite: 7000,   // 7 GB
};

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // 1. Verify Webhook Signature if secret is configured
    if (webhookSecret) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.error("Razorpay webhook signature verification failed.");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } else {
      console.warn("RAZORPAY_WEBHOOK_SECRET is not set. Signature verification bypassed.");
    }

    const eventData = JSON.parse(rawBody);
    console.log("Razorpay webhook event received:", eventData.event);

    const eventType = eventData.event;

    // We handle payment.captured and order.paid
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = eventData.payload?.payment?.entity;
      const orderEntity = eventData.payload?.order?.entity;
      
      // Get notes from payment entity first, or fall back to order entity
      const notes = paymentEntity?.notes || orderEntity?.notes;
      const userId = notes?.userId;
      const planName = notes?.planName;
      const paymentId = paymentEntity?.id || null;
      const orderId = paymentEntity?.order_id || orderEntity?.id || null;

      if (!userId || !planName) {
        console.warn("Missing userId or planName in webhook metadata notes:", notes);
        return NextResponse.json({ message: "Metadata not found, ignoring event" }, { status: 200 });
      }

      const storageLimitMb = PLAN_LIMITS_MB[planName.toLowerCase()] || 500;

      console.log(`Processing subscription upgrade for user ${userId} to plan ${planName} (${storageLimitMb} MB)`);

      // 2. Update user subscription status and storage limits in Supabase DB
      const { data, error } = await supabase
        .from("users")
        .update({
          plan_name: planName.toLowerCase(),
          storage_limit_mb: storageLimitMb,
          razorpay_payment_id: paymentId,
          razorpay_subscription_id: orderId, // Store Order ID as subscription context
        })
        .eq("id", userId)
        .select();

      if (error) {
        console.error("Failed to update user plan in Database:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log("Successfully updated user plan details in database:", data);

      // Extract user email and fire confirmation email asynchronously
      const updatedUser = data && data[0];
      if (updatedUser && updatedUser.email) {
        sendSubscriptionEmail(
          updatedUser.email,
          planName,
          storageLimitMb,
          paymentId,
          orderId
        ).catch((err) => {
          console.error("Async email sending failed in Razorpay Webhook route:", err);
        });
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("Razorpay webhook internal error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
