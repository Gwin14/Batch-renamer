export interface Entry {
  uri: string;
  name: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: number | null;
  createdAt: number | null;
}

export interface FsDriver {
  rootUri(): string;
  list(dirUri: string): Entry[];
  exists(uri: string): boolean;
  stat(uri: string): Entry | null;
  mkdir(parentUri: string, name: string): string;
  ensurePath(baseUri: string, relative: string): string;
  rename(uri: string, newName: string): Promise<string>;
  /** Rename that also works for Android SAF documents (needs the parent folder). */
  renameInFolder(uri: string, folderUri: string, newName: string): Promise<string>;
  moveTo(uri: string, destDirUri: string, newName: string): Promise<string>;
  copyInto(srcUri: string, destDirUri: string, name: string): Promise<string>;
  remove(uri: string): void;
  writeBytes(dirUri: string, name: string, bytes: Uint8Array): string;
  readBytes(uri: string): Promise<Uint8Array>;
  pickDirectory(): Promise<{ uri: string; name: string } | null>;
  preview(uri: string): Promise<boolean>;
  cacheUri(): string;
  freeSpace(): number | null;
}
