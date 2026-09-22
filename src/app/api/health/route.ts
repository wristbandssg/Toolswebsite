import { NextResponse } from "next/server";

// Intentionally does not touch the database — a fast, always-cheap
// liveness check for Render's health checks / uptime monitors, so
// monitoring traffic doesn't add extra load to MongoDB.
export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
