import QRCode from "qrcode";

/** QR for printing. Modules use the landing-page green, with no centre mark. */
export async function registrationQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 1200,
    color: { dark: "#16352dff", light: "#ffffffff" },
  });
}
