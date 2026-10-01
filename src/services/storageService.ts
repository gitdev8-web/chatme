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

    const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (onProgress && snapshot.totalBytes > 0) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(Math.round(progress));
          }
        },
        async (error) => {
          console.warn('Storage upload warning, using local file representation fallback:', error);
          try {
            const dataUrl = await readFileAsDataUrl(file);
            resolve({
              ...fallbackResult,
              url: dataUrl,
            });
          } catch (e) {
            reject(e);
          }
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              ...fallbackResult,
              url: downloadUrl,
            });
          } catch {
            const dataUrl = await readFileAsDataUrl(file);
            resolve({
              ...fallbackResult,
              url: dataUrl,
            });
          }
        }
      );
    });

    // 2s timeout race so offline or unprovisioned storage never hangs the user
    const timeoutPromise = new Promise<UploadResult>((resolve) => {
      setTimeout(async () => {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          resolve({
            ...fallbackResult,
            url: dataUrl,
          });
        } catch {
          resolve({
            ...fallbackResult,
            url: '',
          });
        }
      }, 2000);
    });

    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (err) {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      ...fallbackResult,
      url: dataUrl,
    };
  }
}
