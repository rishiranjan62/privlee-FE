/**
 * Gets a picture ready to send: no side longer than 1280 pixels, upright, saved as a JPEG at 80% quality. The server
 * does the same again and does not trust this, but doing it here means a 10 MB camera photo never travels at all.
 *
 * A GIF is left alone (shrinking it would stop it moving) and only checked against the size limits.
 */
const MAX_SIDE = 1280;
const QUALITY = 0.8;
export const MAX_GIF_BYTES = 4 * 1024 * 1024;

export async function prepareChatImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a picture to send.");
  }
  if (file.type === "image/gif") {
    if (file.size > MAX_GIF_BYTES) throw new Error("That GIF is too large. Choose one under 4 MB.");
    return file;
  }

  // "from-image" applies the camera's rotation, so a photo taken sideways arrives the right way up.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("We couldn't read that picture. Try a different one.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("We couldn't prepare that picture. Try a different one.");
  // JPEG has no transparency: put the picture on white rather than black.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob) throw new Error("We couldn't prepare that picture. Try a different one.");
  return new File([blob], "picture.jpg", { type: "image/jpeg" });
}
