import { existsSync, FSWatcher, rename, unlinkSync } from 'fs';
import { extname } from 'path';
import { watchDir } from './DorMonitor';

export class MataWatcher {
  private static _instance: MataWatcher;

  public static getInstance(): MataWatcher {
    MataWatcher._instance = MataWatcher._instance || new MataWatcher();
    return MataWatcher._instance;
  }

  private _watcher: FSWatcher | undefined = undefined;

  private _dir: string | undefined = undefined;

  private constructor() {}

  public get watching() {
    return this._watcher && this._dir;
  }

  public get directory() {
    return this._dir?.slice();
  }

  public unwatch() {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = undefined;
      this._dir = undefined;
    }
  }

  private _onRenamed(prev: string, cur: string) {
    if (extname(prev) !== '.meta') {
      const metaPrev = prev + '.meta';
      if (existsSync(metaPrev)) {
        const metaCur = cur + '.meta';
        rename(metaPrev, metaCur, () => {});
      }
    }
  }

  private _onDeleted(cur: string) {
    if (extname(cur) !== '.meta') {
      const metaCur = cur + '.meta';
      if (existsSync(metaCur)) {
        unlinkSync(metaCur);
      }
    }
  }

  public watch(dir: string) {
    this.unwatch();

    this._dir = dir;
    this._watcher = watchDir(dir, {
      onRenamed: this._onRenamed.bind(this),
      onDeleted: this._onDeleted.bind(this),
    });
  }
}

// watchDir('./monitor');
