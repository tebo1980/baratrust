import { NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOperatorApiAuth } from "@/lib/auth/operator";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
  const auth = await requireOperatorApiAuth();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const { projectId } = body;

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json({ success: false, error: "Missing projectId" }, { status: 400 });
    }

    await db.delete(messages).where(eq(messages.projectId, projectId));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error clearing chat:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
