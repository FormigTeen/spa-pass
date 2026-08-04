export class StorageAccessError extends Error {
  constructor() {
    super(
      "O navegador bloqueou o acesso à sessão. Toque de novo ou abra esta página fora do navegador embutido.",
    );
    this.name = "StorageAccessError";
  }
}

type StorageAccessDocument = Document & {
  hasStorageAccess?: () => Promise<boolean>;
  requestStorageAccess?: () => Promise<void>;
};

export const isStorageAccessError = (error: unknown) =>
  error instanceof StorageAccessError;

/**
 * Mobile browsers only allow Storage Access API prompts during a user gesture.
 * Passkey registration needs the gateway cookie, so ask immediately from the
 * button-triggered flow before fetching server-side registration options.
 */
export async function ensureStorageAccess() {
  const storageDocument = document as StorageAccessDocument;
  if (!storageDocument.hasStorageAccess || !storageDocument.requestStorageAccess)
    return;

  const granted = await storageDocument.hasStorageAccess().catch(() => true);
  if (granted) return;

  await storageDocument.requestStorageAccess().catch(() => {
    throw new StorageAccessError();
  });
}
