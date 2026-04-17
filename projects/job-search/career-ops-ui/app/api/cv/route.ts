import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

function getCareerOpsDir(): string {
  return process.env.CAREER_OPS_DIR ?? path.resolve(process.cwd(), "..", "..");
}

export async function GET() {
  const filePath = path.join(getCareerOpsDir(), "cv.md");
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ content: "" });
  }
}

export async function PUT(req: NextRequest) {
  const filePath = path.join(getCareerOpsDir(), "cv.md");
  try {
    const { content } = (await req.json()) as { content?: string };
    await fs.writeFile(filePath, content ?? "", "utf-8");
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
