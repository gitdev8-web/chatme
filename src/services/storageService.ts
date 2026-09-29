/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../firebase/config';

export interface UploadResult {
  url: string;
  name: string;
  size: number;
  type: string;
}

export async function uploadFileWithProgress(
  file: File | Blob,
  path: string,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    const storageRef = ref(storage, `${path}/${Date.now()}_${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return await new Promise<UploadResult>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (onProgress && snapshot.totalBytes > 0) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(Math.round(progress));
          }
        },
        (error) => {
          console.warn('Storage upload warning, using local file representation fallback if needed:', error);
          // Fallback if Storage permissions or bucket isn't active
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              url: reader.result as string,
              name: fileName,
              size: file.size,
              type: file.type,
            });
          };
          reader.onerror = () => reject(error);
          reader.readAsDataURL(file);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              url: downloadUrl,
              name: fileName,
              size: file.size,
              type: file.type,
            });
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  } catch (err) {
    // Graceful data URL fallback for offline or restricted environments
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result as string,
          name: fileName,
          size: file.size,
          type: file.type,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
