import { supabase } from "@/integrations/supabase/client";
import type { CardData } from "@/types/card";

/**
 * Abstract extraction function. Takes a base64 data URL image
 * and returns a CardData object. Currently powered by Lovable AI (Gemini Vision).
 * Swap this implementation later if you change OCR providers.
 */
export async function extractCardFromImage(
  imageDataUrl: string,
): Promise<CardData> {
  const { data, error } = await supabase.functions.invoke("extract-card", {
    body: { image: imageDataUrl },
  });

  if (error) {
    throw new Error(error.message || "فشل الاتصال بخدمة الاستخراج");
  }
  if (!data?.success || !data?.data) {
    throw new Error(data?.error || "تعذّر استخراج البيانات");
  }
  return data.data as CardData;
}

/** Convert a File to a base64 data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Resize an image (data URL) to max dimension to keep payloads small. */
export async function resizeImage(
  dataUrl: string,
  maxDim = 1600,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}
