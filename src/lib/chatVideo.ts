/**
 * Gets a video ready to send: at most 30 seconds, shrunk to a small clip, under 15 MB. The server checks the same
 * limits and does not trust this.
 *
 * Browsers cannot re-encode a video directly, so a clip that is too big is played through a canvas (scaled down to
 * 720 pixels on its longer side, 24 frames a second) and recorded again at a low bitrate. That takes about as long
 * as the clip itself, so the page shows progress while it works. A clip that is already small is sent as it is.
 */
export const MAX_VIDEO_SECONDS = 30;
export const MAX_VIDEO_BYTES = 15 * 1024 * 1024;
const MAX_SIDE = 720;
const FPS = 24;
const VIDEO_BITS_PER_SECOND = 1_200_000;
const AUDIO_BITS_PER_SECOND = 64_000;

function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.playsInline = true;
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error("We couldn't read that video. Try a different one."));
  });
}

function pickRecorderType(): string | null {
  const candidates = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return candidates.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? null;
}

/** Whether this browser can shrink a video itself. */
export function canCompressVideo(): boolean {
  return typeof MediaRecorder !== "undefined" && pickRecorderType() !== null && "captureStream" in HTMLCanvasElement.prototype;
}

export async function prepareChatVideo(file: File, onProgress?: (fraction: number) => void): Promise<File> {
  if (!file.type.startsWith("video/")) {
    throw new Error("Choose a video to send.");
  }
  const video = await loadVideo(file);
  const seconds = video.duration;
  if (!Number.isFinite(seconds) || seconds <= 0) {
    URL.revokeObjectURL(video.src);
    throw new Error("We couldn't read that video. Try a different one.");
  }
  if (seconds > MAX_VIDEO_SECONDS + 1) {
    URL.revokeObjectURL(video.src);
    throw new Error(`Videos can be up to ${MAX_VIDEO_SECONDS} seconds. Trim it first, then send it.`);
  }
  // Already small and a format every phone plays: nothing to do.
  if (file.size <= MAX_VIDEO_BYTES && (file.type === "video/mp4" || file.type === "video/webm") && file.size <= 8 * 1024 * 1024) {
    URL.revokeObjectURL(video.src);
    return file;
  }
  if (!canCompressVideo()) {
    URL.revokeObjectURL(video.src);
    if (file.size <= MAX_VIDEO_BYTES) return file;
    throw new Error("This browser can't shrink videos, and that one is over 15 MB. Use the Android app, or a shorter clip.");
  }
  try {
    return await recompress(video, onProgress);
  } finally {
    URL.revokeObjectURL(video.src);
  }
}

function recompress(video: HTMLVideoElement, onProgress?: (fraction: number) => void): Promise<File> {
  return new Promise((resolve, reject) => {
    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
    // Even sizes: some encoders refuse odd ones.
    const width = Math.max(2, Math.round((video.videoWidth * scale) / 2) * 2);
    const height = Math.max(2, Math.round((video.videoHeight * scale) / 2) * 2);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("We couldn't prepare that video. Try a different one."));

    const stream = canvas.captureStream(FPS);
    // The sound comes from the video element itself.
    const source = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
    source?.getAudioTracks().forEach((t) => stream.addTrack(t));

    const mimeType = pickRecorderType()!;
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    recorder.onerror = () => reject(new Error("We couldn't prepare that video. Try a different one."));
    recorder.onstop = () => {
      const type = mimeType.split(";")[0];
      const blob = new Blob(chunks, { type });
      if (blob.size === 0) return reject(new Error("We couldn't prepare that video. Try a different one."));
      if (blob.size > MAX_VIDEO_BYTES) return reject(new Error("That video is still too large after shrinking. Try a shorter clip."));
      resolve(new File([blob], type === "video/mp4" ? "video.mp4" : "video.webm", { type }));
    };

    let timer = 0;
    const draw = () => {
      ctx.drawImage(video, 0, 0, width, height);
      onProgress?.(Math.min(1, video.currentTime / video.duration));
      timer = window.setTimeout(draw, 1000 / FPS);
    };
    video.onended = () => {
      window.clearTimeout(timer);
      if (recorder.state !== "inactive") recorder.stop();
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("We couldn't prepare that video. Try a different one."));
    };
    recorder.start(1000);
    video.currentTime = 0;
    // Played with the sound off for the person: the recording still gets it from the captured stream.
    video.volume = 0;
    video.play().then(draw).catch(() => reject(new Error("We couldn't prepare that video. Try a different one.")));
  });
}
