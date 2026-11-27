/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Image compression and scaling utility
 * Prevents Firestore 1MB document limit rejections and ensures instant uploads.
 */

export interface CompressedImageResult {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
}

export async function compressImage(
  file: File,
  maxDimension = 1080,
  quality = 0.8
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale proportionally if either dimension exceeds maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            file,
            dataUrl: e.target?.result as string,
            width: img.width,
            height: img.height,
          });
          return;
        }

        // Draw with smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to lightweight JPEG
        const outputMime = 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputMime, quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '') + '.jpg',
                { type: outputMime }
              );
              resolve({
                file: compressedFile,
                dataUrl,
                width,
                height,
              });
            } else {
              resolve({
                file,
                dataUrl,
                width,
                height,
              });
            }
          },
          outputMime,
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an avatar image cleanly so it uploads fast and stays well under
 * Firestore document limits (~150KB max) if inline fallback is ever needed.
 */
export async function compressAvatarImage(
  file: File,
  maxBytes = 150_000
): Promise<CompressedImageResult> {
  const attempts: Array<{ dim: number; quality: number }> = [
    { dim: 420, quality: 0.84 },
    { dim: 360, quality: 0.76 },
    { dim: 300, quality: 0.68 },
    { dim: 240, quality: 0.6 },
  ];

  let lastResult = await compressImage(file, attempts[0].dim, attempts[0].quality);
  if (lastResult.dataUrl.length <= maxBytes) {
    return lastResult;
  }

  for (let i = 1; i < attempts.length; i++) {
    const attempt = attempts[i];
    lastResult = await compressImage(file, attempt.dim, attempt.quality);
    if (lastResult.dataUrl.length <= maxBytes) {
      return lastResult;
    }
  }

  return lastResult;
}

