import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been removed. Use /api/dan instead." },
    { status: 410 }
  );
}
