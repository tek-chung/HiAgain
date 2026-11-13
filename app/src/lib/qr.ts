import "server-only";
import QRCode from "qrcode";

/** Real, scannable QR code as inline SVG (generated server-side; contains only the profile URL). */
export async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#20372b", light: "#ffffff00" },
  });
}
