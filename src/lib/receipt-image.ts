import { supabase } from "@/integrations/supabase/client";

const BUCKET = "comprovantes";

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // respeita a orientação EXIF de fotos tiradas pelo celular
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* segue para o fallback */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Não foi possível abrir a imagem."));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

function draw(src: CanvasImageSource, w: number, h: number, sx = 0, sy = 0, sw = w, sh = h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
  return { canvas, ctx };
}

function toBlob(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao preparar a imagem."))),
      "image/jpeg",
      quality,
    );
  });
}

/** contraste automático + escala de cinza suave + nitidez */
function enhance(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  // luminância + histograma para alongamento de contraste
  const lum = new Uint8ClampedArray(w * h);
  const hist = new Uint32Array(256);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const y = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
    lum[p] = y;
    hist[y]++;
  }
  const total = w * h;
  const cut = total * 0.02;
  let lo = 0, hi = 255, acc = 0;
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc > cut) { lo = i; break; } }
  acc = 0;
  for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc > cut) { hi = i; break; } }
  const range = Math.max(1, hi - lo);

  const stretched = new Uint8ClampedArray(w * h);
  for (let p = 0; p < total; p++) {
    stretched[p] = Math.max(0, Math.min(255, ((lum[p] - lo) * 255) / range));
  }

  // nitidez (unsharp 3x3) com leve redução de ruído por média
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) { out[p] = stretched[p]; continue; }
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += stretched[p + dy * w + dx];
      const blur = sum / 9;
      out[p] = Math.max(0, Math.min(255, stretched[p] + (stretched[p] - blur) * 1.1));
    }
  }

  for (let p = 0, i = 0; p < total; p++, i += 4) {
    d[i] = d[i + 1] = d[i + 2] = out[p];
  }
  ctx.putImageData(img, 0, 0);
  return stretched;
}

/** bounding box da região escura (texto do cupom) para recorte automático */
function contentBox(lum: Uint8ClampedArray, w: number, h: number) {
  let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
  const step = Math.max(1, Math.floor(Math.min(w, h) / 600));
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (lum[y * w + x] < 110) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return null;
  const padX = Math.round(w * 0.03);
  const padY = Math.round(h * 0.03);
  const x = Math.max(0, minX - padX);
  const y = Math.max(0, minY - padY);
  const bw = Math.min(w - x, maxX - minX + padX * 2);
  const bh = Math.min(h - y, maxY - minY + padY * 2);
  if (bw < w * 0.35 || bh < h * 0.2) return null;
  if (bw > w * 0.96 && bh > h * 0.96) return null;
  return { x, y, w: bw, h: bh };
}

export type ReceiptVariants = {
  /** data URL para exibir na tela */
  previewUrl: string;
  original: Blob;
  enhanced: Blob;
  cropped: Blob | null;
};

/**
 * Prepara as variações da foto: original (com correção de rotação), versão tratada
 * (contraste/nitidez/ruído) e recorte automático da área do comprovante.
 */
export async function prepareReceiptVariants(file: File): Promise<ReceiptVariants> {
  const bitmap = await decode(file);
  const srcW = "width" in bitmap ? bitmap.width : 0;
  const srcH = "height" in bitmap ? bitmap.height : 0;

  // resolução alta o bastante para texto pequeno, sem exagero
  const maxOriginal = 2600;
  const scale = Math.min(1, maxOriginal / Math.max(srcW, srcH));
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);

  const base = draw(bitmap as CanvasImageSource, w, h, 0, 0, srcW, srcH);
  const original = await toBlob(base.canvas, 0.94);
  const previewUrl = base.canvas.toDataURL("image/jpeg", 0.6);

  const work = draw(bitmap as CanvasImageSource, w, h, 0, 0, srcW, srcH);
  const lum = enhance(work.ctx, w, h);
  const enhanced = await toBlob(work.canvas, 0.94);

  let cropped: Blob | null = null;
  const box = contentBox(lum, w, h);
  if (box) {
    // amplia o recorte para melhorar a leitura de texto pequeno
    const up = Math.min(2, 1800 / Math.max(box.w, box.h));
    const cw = Math.round(box.w * Math.max(1, up));
    const ch = Math.round(box.h * Math.max(1, up));
    const c = draw(work.canvas, cw, ch, box.x, box.y, box.w, box.h);
    cropped = await toBlob(c.canvas, 0.94);
  }

  return { previewUrl, original, enhanced, cropped };
}

export type UploadedReceipt = { path: string; signedUrl: string };

/** Sobe uma imagem para a área privada de comprovantes e devolve um link temporário */
export async function uploadReceipt(blob: Blob, suffix: string): Promise<UploadedReceipt> {
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}-${suffix}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(`Não foi possível guardar a foto do comprovante: ${error.message}`);
  const { data, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (signErr || !data?.signedUrl) throw new Error("Não foi possível preparar a foto para leitura.");
  return { path, signedUrl: data.signedUrl };
}

/** Link temporário para visualizar um comprovante já guardado */
export async function receiptSignedUrl(path: string, seconds = 60 * 60): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}
