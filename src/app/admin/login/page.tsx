import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { addVideo } from "@/lib/videosStore";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  try {
    // ✅ cookies() は async
    const cookieStore = await cookies();
    const admin = cookieStore.get("admin");

    if (!admin || admin.value !== "1") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    await addVideo(body);

    revalidatePath("/");
    revalidatePath("/admin");

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "add failed" },
      { status: 500 }
    );
  }
}
