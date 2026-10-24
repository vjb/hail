import { db } from "@/db/client";
import { DomainError } from "@/domain/bounty/service";
import { addProofPhoto } from "@/domain/work/work";
import { currentUser } from "@/lib/auth";

// Worker uploads one proof photo for a deliverable slot; returns the quick check result.
export async function POST(req: Request, ctx: RouteContext<"/api/work/claims/[id]/photos">) {
  const user = await currentUser();
  if (!user || user.role !== "worker") return Response.json({ error: "Please sign in as a worker." }, { status: 401 });
  const { id } = await ctx.params;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Upload a photo file." }, { status: 400 });
  }
  const file = form.get("photo");
  const slot = Number(form.get("slot"));
  if (!(file instanceof File) || !Number.isInteger(slot)) return Response.json({ error: "Upload a photo file." }, { status: 400 });
  try {
    const r = await addProofPhoto(db(), user.id, id, slot, Buffer.from(await file.arrayBuffer()));
    return Response.json({ photoId: r.photoId, check: { usable: r.check.usable, problems: r.check.problems, retakeHint: r.check.retakeHint }, extendedTo: r.extendedTo?.toISOString() ?? null });
  } catch (e) {
    if (e instanceof DomainError) return Response.json({ error: e.message }, { status: e.code === "not_found" ? 404 : 400 });
    console.error("[photos] upload failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "The upload didn't go through. Check your connection and try again." }, { status: 500 });
  }
}
