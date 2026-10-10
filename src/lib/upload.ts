/** What the storage provider answers to a finished upload (the fields we use). */
export type UploadResponse = {
  public_id: string;
  version: number;
  signature: string;
  resource_type: "image" | "video" | "raw";
};

/** Posts a file straight to storage with signed fields, reporting progress (0–1). */
export function uploadFile(
  target: { url: string; fields: Record<string, string> },
  file: File,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
) {
  return new Promise<UploadResponse>((resolve, reject) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(target.fields)) form.append(key, value);
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", target.url);
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      const body = xhr.response as (UploadResponse & { error?: { message?: string } }) | null;
      if (xhr.status >= 200 && xhr.status < 300 && body?.public_id) resolve(body);
      else reject(new Error(body?.error?.message ?? "Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}
