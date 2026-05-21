import { NextResponse } from "next/server";
import axios from "axios";

// Pricing mapper (values in paise for Razorpay: ₹1 = 100 paise)
const PLAN_PRICES: Record<string, number> = {
  starter: 150 * 100, // ₹150 -> 15000 paise
  family: 250 * 100,  // ₹250 -> 25000 paise
  elite: 350 * 100,   // ₹350 -> 35000 paise
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, planName } = body;

    if (!userId || !planName) {
      return NextResponse.json(
        { error: "Missing required fields: userId, planName" },
        { status: 400 }
      );
    }

    const amount = PLAN_PRICES[planName];
    if (!amount) {
      return NextResponse.json(
        { error: `Invalid plan name: ${planName}` },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Graceful fallback for local development if keys are not set yet
    if (!keyId || !keySecret) {
      if (process.env.NODE_ENV === "production") {
        console.error("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing in production!");
        return NextResponse.json(
          { error: "Payment configuration error. Please contact support." },
          { status: 500 }
        );
      }

      console.warn("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables are missing. Running in simulator/mock mode.");
      return NextResponse.json({
        id: `mock_order_${Math.random().toString(36).substring(2, 11)}`,
        entity: "order",
        amount,
        amount_paid: 0,
        amount_due: amount,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        status: "created",
        attempts: 0,
        notes: {
          userId,
          planName,
        },
        created_at: Math.floor(Date.now() / 1000),
        isMock: true,
      });
    }

    // Call Razorpay Order Creation API directly using Axios to avoid version conflicts
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await axios.post(
      "https://api.razorpay.com/v1/orders",
      {
        amount,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: {
          userId,
          planName,
        },
      },
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("API Checkout Error:", error.response?.data || error.message);
    return NextResponse.json(
      { error: error.response?.data?.error?.description || error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
