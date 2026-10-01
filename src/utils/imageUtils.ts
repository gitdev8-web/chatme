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
