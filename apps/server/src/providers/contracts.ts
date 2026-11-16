/** Service boundaries keep provider SDKs out of application logic and tests. */
export interface EmailGateway {
  sendCode(email: string, code: string): Promise<void>;
}

export interface StorageGateway {
  upload(userId: string, filename: string, data: Buffer): Promise<{ storageId: string }>;
  download(storageId: string): { url: string; expiresAt: string };
  remove(storageId: string): Promise<void>;
}
