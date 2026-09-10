import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { createPortal } from "react-dom";
import { Loader2, X, Check, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  file: File;
  aspect: number; // e.g. 3/2 or 1/1
  title?: string;
  onCancel: () => void;
  onCropped: (blob: Blob, previewUrl: string) => void;
};

async function getCroppedBlob(
  imageSrc: string,
  crop: Area,
  rotation: number,
  mime: string,
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  // Compute bounding box for rotated image
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bBoxW = image.width * cos + image.height * sin;
  const bBoxH = image.width * sin + image.height * cos;

  const canvas = document.createElement("canvas");
  canvas.width = bBoxW;
  canvas.height = bBoxH;
  const ctx = canvas.getContext("2d")!;

  ctx.translate(bBoxW / 2, bBoxH / 2);
  ctx.rotate(rad);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);

  const data = ctx.getImageData(crop.x, crop.y, crop.width, crop.height);
  canvas.width = crop.width;
  canvas.height = crop.height;
  ctx.putImageData(data, 0, 0);

  const outMime = mime === "image/png" ? "image/png" : "image/jpeg";
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b as Blob), outMime, 0.92),
  );
}

export function ImageCropDialog({ file, aspect, title, onCancel, onCropped }: Props) {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const confirm = async () => {
    if (!croppedArea || !imageSrc) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea, rotation, file.type);
      const previewUrl = URL.createObjectURL(blob);
      onCropped(blob, previewUrl);
    } catch (e) {
      console.error(e);
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[2147483600] bg-black/80 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="text-sm font-semibold text-white">
          {title || "Crop image"} · {aspect === 1 ? "1:1" : aspect === 3 / 2 ? "3:2" : `${aspect.toFixed(2)}:1`}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 text-white hover:bg-white/20"
          >
            <RotateCw className="h-3.5 w-3.5" /> Rotate
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
          <Button
            type="button"
            onClick={confirm}
            disabled={busy || !croppedArea}
            className="gradient-bg text-primary-foreground hover:opacity-90 h-8 px-3 text-xs"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
            Crop & upload
          </Button>
        </div>
      </div>

      <div className="relative flex-1 bg-neutral-950">
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            objectFit="contain"
            showGrid
          />
        )}
      </div>

      <div className="px-4 py-3 border-t border-white/10 bg-black/60 flex items-center gap-3">
        <span className="text-xs text-white/70 w-12">Zoom</span>
        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-primary"
        />
        <span className="text-xs text-white/50 w-12 text-right">{zoom.toFixed(2)}x</span>
      </div>
    </div>,
    document.body,
  );
}
