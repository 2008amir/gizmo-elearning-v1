import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import templateAsset from "@/assets/certificate-template.png.asset.json";

export type CertificateInfo = {
  fullName: string;
  courseTitle: string;
  serial: string;
  issuedAt: string;
  startDate?: string | null;
  scorePct?: number | null;
  verifyUrl: string;
  level?: "Upper Class" | "Lower Class" | string;
};

// Base coordinates against the erased template (1264 x 848).
const BASE_W = 1264;
const BASE_H = 848;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function fmt(d: Date) {
  return {
    dd: String(d.getDate()).padStart(2, "0"),
    month: d.toLocaleString("en-US", { month: "long" }),
    yyyy: String(d.getFullYear()),
  };
}

/** Render the certificate onto an HTMLCanvasElement (used for on-screen preview). */
export async function renderCertificate(canvas: HTMLCanvasElement, info: CertificateInfo) {
  const img = await loadImage(templateAsset.url);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(img, 0, 0, W, H);
  await drawOverlays(ctx, W, H, info);
}

async function drawOverlays(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  info: CertificateInfo,
) {
  const sx = W / BASE_W;
  const sy = H / BASE_H;
  const s = (n: number) => n * sy;

  const PAPER = "#F6F5F0";
  const RIBBON = "#B47319";
  const NAVY = "#0a1a3a";

  // 1) Ribbon: cover the interior and redraw full "CERTIFICATE LEVEL: <LEVEL>".
  const level = (info.level || "Upper Class").toUpperCase();
  ctx.fillStyle = RIBBON;
  ctx.fillRect(475 * sx, 365 * sy, 330 * sx, 34 * sy);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${s(15)}px 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillText(`CERTIFICATE LEVEL: ${level}`, 640 * sx, 383 * sy);

  // 2) Name (script), centered — Title Case each word.
  const nameTitle = (info.fullName || "")
    .toLowerCase()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  ctx.fillStyle = NAVY;
  ctx.textBaseline = "alphabetic";
  ctx.font = `italic ${s(52)}px 'Great Vibes', 'Snell Roundhand', 'Segoe Script', cursive`;
  ctx.fillText(nameTitle, 632 * sx, 525 * sy);

  // 3) Body: cover the "held from" line + the empty date line with paper, then redraw.
  ctx.fillStyle = PAPER;
  ctx.fillRect(360 * sx, 585 * sy, 545 * sx, 55 * sy);

  const start = info.startDate ? new Date(info.startDate) : new Date(info.issuedAt);
  const end = new Date(info.issuedAt);
  const sD = fmt(start);
  const eD = fmt(end);

  const body = `${s(17)}px 'Helvetica Neue', Arial, sans-serif`;
  const bold = `bold ${s(17)}px 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillStyle = NAVY;

  // "COURSE TITLE held from"
  drawInline(
    ctx,
    [
      { text: (info.courseTitle || "").toUpperCase(), font: bold },
      { text: " held from", font: body },
    ],
    632 * sx,
    605 * sy,
  );
  // Dates line
  ctx.font = body;
  ctx.fillText(
    `${sD.dd} ${sD.month} ${sD.yyyy} to ${eD.dd} ${eD.month} ${eD.yyyy}.`,
    632 * sx,
    630 * sy,
  );

  // 4) Certificate ID + Date issued (over the underlines).
  ctx.textAlign = "left";
  ctx.font = `${s(13)}px 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillStyle = NAVY;
  // clear underline area first so text sits cleanly
  ctx.fillStyle = PAPER;
  ctx.fillRect(220 * sx, 695 * sy, 175 * sx, 18 * sy);
  ctx.fillRect(220 * sx, 727 * sy, 175 * sx, 18 * sy);
  ctx.fillStyle = NAVY;
  ctx.fillText(info.serial.toUpperCase(), 225 * sx, 708 * sy);
  ctx.fillText(
    new Date(info.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    225 * sx,
    740 * sy,
  );

  // 5) QR code inside the gold square (cover any existing content first).
  try {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(124 * sx, 578 * sy, 97 * sx, 96 * sy);
    const qrData = await QRCode.toDataURL(info.verifyUrl, {
      width: 400,
      margin: 0,
      color: { dark: "#0a1a3a", light: "#ffffff" },
    });
    const qrImg = await loadImage(qrData);
    ctx.drawImage(qrImg, 126 * sx, 580 * sy, 93 * sx, 92 * sy);
  } catch {
    // ignore
  }
}

function drawInline(
  ctx: CanvasRenderingContext2D,
  parts: { text: string; font: string }[],
  cx: number,
  y: number,
) {
  let total = 0;
  for (const p of parts) {
    ctx.font = p.font;
    total += ctx.measureText(p.text).width;
  }
  let x = cx - total / 2;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  for (const p of parts) {
    ctx.font = p.font;
    ctx.fillText(p.text, x, y);
    x += ctx.measureText(p.text).width;
  }
  ctx.textAlign = prev;
}

/** Build a PDF (returned as a Blob) containing the certificate, fit to A4 landscape. */
export async function buildCertificatePdf(info: CertificateInfo): Promise<Blob> {
  const img = await loadImage(templateAsset.url);
  const W = img.naturalWidth;
  const H = img.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, W, H);
  await drawOverlays(ctx, W, H, info);

  const pageW = 297;
  const pageH = 210;
  const aspect = W / H;
  let drawW = pageW,
    drawH = pageW / aspect;
  if (drawH > pageH) {
    drawH = pageH;
    drawW = pageH * aspect;
  }
  const offX = (pageW - drawW) / 2;
  const offY = (pageH - drawH) / 2;

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  pdf.addImage(dataUrl, "JPEG", offX, offY, drawW, drawH, undefined, "FAST");
  return pdf.output("blob");
}

export async function downloadCertificatePdf(info: CertificateInfo, filename: string) {
  const blob = await buildCertificatePdf(info);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Kept for backward compatibility with existing callers using canvas download. */
export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}
