"use client";
import { getBrowserClient } from "@/lib/supabase/client";

const SIZE = 512;

export class AvatarError extends Error {}

/** Centre-crops and resizes to a 512×512 JPEG in the browser, so uploads are small and EXIF-free. */
export async function toSquareJpeg(file: File): Promise<ArrayBuffer> {
  if (!file.type.startsWith("image/")) throw new AvatarError("Choose a photo (JPEG, PNG or WebP).");
  if (file.size > 20 * 1024 * 1024) throw new AvatarError("That photo is over 20 MB. Choose a smaller one.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new AvatarError("This browser can't read that photo. Try a JPEG or PNG.");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new AvatarError("This browser can't prepare the photo.");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  if (!blob) throw new AvatarError("This browser can't prepare the photo.");
  return blob.arrayBuffer();
}

/** Uploads into the person's own folder, points the profile at it, then removes older photos. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = getBrowserClient();
  if (!supabase) throw new AvatarError("Photo upload needs Supabase to be configured.");
  const bytes = await toSquareJpeg(file);
  const name = `${Date.now()}.jpg`;
  const path = `${userId}/${name}`;
  const bucket = supabase.storage.from("avatars");
  const { error } = await bucket.upload(path, bytes, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
  if (error) throw new AvatarError("Couldn't upload the photo. Check your connection and try again.");
  const url = bucket.getPublicUrl(path).data.publicUrl;
  const { data: status } = await supabase.rpc("update_my_avatar", { p_url: url });
  if (status !== "saved") {
    await bucket.remove([path]);
    throw new AvatarError("Couldn't save the photo to your profile. Try again.");
  }
  await removeOtherAvatars(userId, name);
  return url;
}

export async function removeAvatar(userId: string): Promise<void> {
  const supabase = getBrowserClient();
  if (!supabase) return;
  const { data: status } = await supabase.rpc("update_my_avatar", { p_url: null });
  if (status !== "saved") throw new AvatarError("Couldn't remove the photo. Try again.");
  await removeOtherAvatars(userId, null);
}

async function removeOtherAvatars(userId: string, keep: string | null) {
  const bucket = getBrowserClient()!.storage.from("avatars");
  const { data } = await bucket.list(userId, { limit: 100 });
  const stale = (data ?? []).map((f) => f.name).filter((n) => n !== keep).map((n) => `${userId}/${n}`);
  if (stale.length) await bucket.remove(stale); // best effort; the profile already points at the right photo
}
