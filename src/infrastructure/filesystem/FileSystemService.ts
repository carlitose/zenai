import { File, Directory, Paths } from 'expo-file-system';
import { Asset } from 'expo-asset';

export class FileSystemService {
  ensureDirectory(path: string): void {
    const dir = new Directory(path);
    if (!dir.exists) {
      dir.create({ intermediates: true });
    }
  }

  deleteDirectory(path: string): void {
    const dir = new Directory(path);
    if (dir.exists) {
      dir.delete();
    }
  }

  moveFile(from: string, to: string): void {
    const source = new File(from);
    const dest = new File(to);
    source.move(dest);
  }

  copyFile(from: string, to: string): void {
    const source = new File(from);
    const dest = new File(to);
    source.copy(dest);
  }

  async copyAssetToDirectory(
    assetModule: number,
    destPath: string,
  ): Promise<string> {
    const [asset] = await Asset.loadAsync(assetModule);
    if (!asset.localUri) {
      throw new Error('Failed to load asset');
    }
    const source = new File(asset.localUri);
    const dest = new File(destPath);
    source.copy(dest);
    return dest.uri;
  }

  fileExists(path: string): boolean {
    const file = new File(path);
    return file.exists;
  }

  async readJsonFile<T>(path: string): Promise<T> {
    const file = new File(path);
    const content = await file.text();
    return JSON.parse(content) as T;
  }

  writeJsonFile(path: string, data: unknown): void {
    const file = new File(path);
    file.write(JSON.stringify(data, null, 2));
  }

  get documentDir(): Directory {
    return Paths.document;
  }

  get cacheDir(): Directory {
    return Paths.cache;
  }
}
