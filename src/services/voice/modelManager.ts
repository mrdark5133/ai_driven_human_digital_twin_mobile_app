import * as FileSystem from 'expo-file-system/legacy';

export const MODEL_FILENAME = 'qwen2.5-1.5b-instruct-q4_k_m.gguf';
export const MODEL_DOWNLOAD_URL =
  'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf';

// Expected size is ~1.11 GB (1,117,320,736 bytes)
export const MODEL_MIN_VALID_SIZE_BYTES = 1000 * 1024 * 1024; // 1 GB minimum threshold

let activeDownloadResumable: FileSystem.DownloadResumable | null = null;

/**
 * Returns the target absolute file URI for the on-device GGUF model.
 */
export function getModelPath(): string {
  const docDir = FileSystem.documentDirectory;
  if (!docDir) {
    throw new Error('Device document directory is unavailable.');
  }
  return `${docDir}models/${MODEL_FILENAME}`;
}

/**
 * Checks if the model is already downloaded and valid in size.
 */
export async function isModelDownloaded(): Promise<boolean> {
  try {
    const path = getModelPath();
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      return false;
    }
    // If the file exists but was interrupted (< 1GB), consider it invalid
    if (typeof info.size === 'number' && info.size < MODEL_MIN_VALID_SIZE_BYTES) {
      console.warn(`[ModelManager] Found incomplete model file (${info.size} bytes). Treating as missing.`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[ModelManager] Failed to check model status:', err);
    return false;
  }
}

/**
 * Downloads the Qwen2.5-1.5B-Instruct Q4_K_M GGUF model from Hugging Face with progress updates.
 * Skips if the file already exists with valid size.
 */
export async function downloadModel(
  onProgress?: (progress: number, writtenBytes: number, totalBytes: number) => void
): Promise<string> {
  const docDir = FileSystem.documentDirectory;
  if (!docDir) {
    throw new Error('FileSystem document directory is unavailable on this device.');
  }

  const modelsDir = `${docDir}models/`;
  const dirInfo = await FileSystem.getInfoAsync(modelsDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });
  }

  const modelPath = getModelPath();

  // 1. Check if already downloaded
  const alreadyDownloaded = await isModelDownloaded();
  if (alreadyDownloaded) {
    if (onProgress) {
      onProgress(1, 1, 1);
    }
    return modelPath;
  }

  // 2. Clean up any corrupted / partial file before new download
  try {
    const existing = await FileSystem.getInfoAsync(modelPath);
    if (existing.exists) {
      await FileSystem.deleteAsync(modelPath, { idempotent: true });
    }
  } catch {
    // Ignore cleanup error
  }

  // 3. Initiate download with progress
  activeDownloadResumable = FileSystem.createDownloadResumable(
    MODEL_DOWNLOAD_URL,
    modelPath,
    {},
    (downloadProgress) => {
      const { totalBytesWritten, totalBytesExpectedToWrite } = downloadProgress;
      const progress =
        totalBytesExpectedToWrite > 0
          ? Math.min(1, Math.max(0, totalBytesWritten / totalBytesExpectedToWrite))
          : 0;
      if (onProgress) {
        onProgress(progress, totalBytesWritten, totalBytesExpectedToWrite);
      }
    }
  );

  try {
    const result = await activeDownloadResumable.downloadAsync();
    activeDownloadResumable = null;

    if (!result || !result.uri) {
      throw new Error('Download failed: No result URI returned from FileSystem.');
    }

    // Verify downloaded file size
    const finalInfo = await FileSystem.getInfoAsync(result.uri);
    if (!finalInfo.exists || (typeof finalInfo.size === 'number' && finalInfo.size < MODEL_MIN_VALID_SIZE_BYTES)) {
      throw new Error(
        `Downloaded file size is invalid (${finalInfo.exists ? finalInfo.size : 0} bytes). Minimum expected: 1 GB.`
      );
    }

    return result.uri;
  } catch (error: any) {
    activeDownloadResumable = null;
    // Attempt cleanup on failure so we don't leave broken state
    try {
      await FileSystem.deleteAsync(modelPath, { idempotent: true });
    } catch {
      // Ignore cleanup error
    }
    throw new Error(`Failed to download Qwen model: ${error?.message || String(error)}`);
  }
}

/**
 * Cancels active model download if currently in progress.
 */
export async function cancelModelDownload(): Promise<void> {
  if (activeDownloadResumable) {
    try {
      await activeDownloadResumable.cancelAsync();
    } catch (err) {
      console.warn('[ModelManager] Error cancelling download:', err);
    } finally {
      activeDownloadResumable = null;
    }
  }
}

/**
 * Deletes the on-device model file.
 */
export async function deleteModel(): Promise<void> {
  try {
    const path = getModelPath();
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }
  } catch (err) {
    console.warn('[ModelManager] Failed to delete model:', err);
  }
}
