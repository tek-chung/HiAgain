// Writes a Y4M video file showing a QR code, for Chromium's fake camera
// (--use-file-for-fake-video-capture). Test helper only.
import QRCode from "qrcode";
import { PNG } from "pngjs";
import { writeFileSync } from "node:fs";

export async function writeQrVideo(text, path, { width = 640, height = 480, frames = 10 } = {}) {
  const qr = PNG.sync.read(await QRCode.toBuffer(text, { margin: 2, width: 360, errorCorrectionLevel: "M" }));
  const rgb = new Uint8Array(width * height * 3).fill(235); // light grey "room"
  const ox = Math.floor((width - qr.width) / 2), oy = Math.floor((height - qr.height) / 2);
  for (let y = 0; y < qr.height; y++) for (let x = 0; x < qr.width; x++) {
    const s = (y * qr.width + x) * 4, d = ((y + oy) * width + (x + ox)) * 3;
    rgb[d] = qr.data[s]; rgb[d + 1] = qr.data[s + 1]; rgb[d + 2] = qr.data[s + 2];
  }
  const Y = Buffer.alloc(width * height), U = Buffer.alloc((width / 2) * (height / 2)), V = Buffer.alloc((width / 2) * (height / 2));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 3, r = rgb[i], g = rgb[i + 1], b = rgb[i + 2];
    Y[y * width + x] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    if (y % 2 === 0 && x % 2 === 0) {
      const j = (y / 2) * (width / 2) + x / 2;
      U[j] = Math.round(128 - 0.168736 * r - 0.331264 * g + 0.5 * b);
      V[j] = Math.round(128 + 0.5 * r - 0.418688 * g - 0.081312 * b);
    }
  }
  const parts = [Buffer.from(`YUV4MPEG2 W${width} H${height} F15:1 Ip A1:1 C420jpeg\n`)];
  for (let f = 0; f < frames; f++) parts.push(Buffer.from("FRAME\n"), Y, U, V);
  writeFileSync(path, Buffer.concat(parts));
}
