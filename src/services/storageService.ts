/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDownloadURL, ref, uploadBytesResumable, UploadMetadata } from 'firebase/storage';
import { storage } from '../firebase/config';

export interface UploadResult {
  url: string;
  name: string;
  size: number;
  type: string;
}

const MAX_INLINE_DATA_URL_BYTES = 700_000;

/**
 * Fast helper to read file into data URL
 */
function readFileAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function safeDataUrlFallback(file: File | Blob): Promise<string> {
  if (file.size > MAX_INLINE_DATA_URL_BYTES) {
    return '';
  }
  try {
    const dataUrl = await readFileAsDataUrl(file);
    return dataUrl.length <= MAX_INLINE_DATA_URL_BYTES ? dataUrl : '';
  } catch {
    return '';
  }
}

export async function uploadFileWithProgress(
  file: File | Blob,
  path: string,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const cleanMimeType = file.type ? file.type.split(';')[0].trim() : 'application/octet-stream';

  const fallbackResult: UploadResult = {
    url: '',
    name: sanitizedName,
    size: file.size,
    type: cleanMimeType,
  };

  try {
    const storageRef = ref(storage, `${path}/${Date.now()}_${sanitizedName}`);
    const metadata: UploadMetadata = {
      contentType: cleanMimeType,
    };
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (settled) return;
          if (onProgress && snapshot.totalBytes > 0) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(Math.round(progress));
          }
        },
        async (error) => {
          if (settled) return;
          settled = true;
          if (timeoutId) clearTimeout(timeoutId);
          console.warn('Storage upload failed, checking safe fallback:', error);
          const inlineUrl = await safeDataUrlFallback(file);
          if (inlineUrl) {
            resolve({
              ...fallbackResult,
              url: inlineUrl,
            });
          } else {
            reject(
              new Error('Upload failed. Check your connection or try a smaller file.')
            );
          }
        },
        async () => {
          if (settled) return;
          settled = true;
          if (timeoutId) clearTimeout(timeoutId);
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              ...fallbackResult,
              url: downloadUrl,
            });
          } catch {
            const inlineUrl = await safeDataUrlFallback(file);
            if (inlineUrl) {
              resolve({
                ...fallbackResult,
                url: inlineUrl,
              });
            } else {
              reject(new Error('Could not retrieve uploaded file URL.'));
            }
          }
        }
      );
    });

    // 12s timeout so real Storage uploads complete reliably without hanging offline users
    const timeoutPromise = new Promise<UploadResult>((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        if (settled) return;
        settled = true;
        try {
          uploadTask.cancel();
        } catch {
          // Ignore cancel error
        }
        const inlineUrl = await safeDataUrlFallback(file);
        if (inlineUrl) {
          resolve({
            ...fallbackResult,
            url: inlineUrl,
          });
        } else {
          reject(
            new Error('Upload timed out. Please check your connection or use a smaller file.')
          );
        }
      }, 12000);
    });

    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (err) {
    const inlineUrl = await safeDataUrlFallback(file);
    if (inlineUrl) {
      return {
        ...fallbackResult,
        url: inlineUrl,
      };
    }
    throw err instanceof Error ? err : new Error('File upload failed');
  }
}
