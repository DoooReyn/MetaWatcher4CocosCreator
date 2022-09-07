import { watch, existsSync, statSync, Dirent, readdir, readdirSync } from 'fs';
import { join } from 'path';

import { debug } from './DebugLog';

/**
 * 遍历目录
 * @param currentDirPath 当前路径
 * @param callback 获得路径回调
 */
function walk(currentDirPath: string, callback: (path: string) => void) {
  readdirSync(currentDirPath, { withFileTypes: true }).forEach(function (dirent: Dirent) {
    let filePath = join(currentDirPath, dirent.name);
    if (dirent.isFile()) {
      callback(filePath);
    } else if (dirent.isDirectory()) {
      callback(filePath);
      walk(filePath, callback);
    }
  });
}

/**
 * 获取指定目录下所有文件、目录的路径与其inode的映射
 * @param dir 指定目录
 * @returns
 */
function getFilesMap(dir: string) {
  const map = new Map<number, string>();
  walk(dir, (filepath: string) => {
    map.set(statSync(filepath).ino, filepath);
  });
  return map;
}

interface IMonitorCallbacks {
  onRenamed?: (prev: string, cur: string) => void;
  onAdded?: (cur: string) => void;
  onDeleted?: (prev: string) => void;
  onModified?: (cur: string) => void;
}

/**
 * - **操作总览**
 *    - 新增 - rename （1次）
 *    - 修改 - change (2次)
 *    - 重命名 - rename(原名) -> rename(现名) -> change(所在目录)
 *    - 移动 - rename(原名) -> rename(现名) -> change(原目录) -> change(现目录)
 *    - 删除 - rename -> change
 * - **操作检测**
 *    - **修改**
 *       - change
 *       - filename是文件名，且文件存在
 *    - **新增**
 *       - rename
 *       - 文件存在，新增完成
 *    - **重命名**
 *       - 一阶段 rename
 *       - 原文件（目录）不存在，可以等待触发二阶段 rename(视为文件删除)
 *       - 二阶段 rename
 *       - 现文件存在，重命名完成（视为文件新增）
 *    - **移动**
 *       - 相当于**重命名**
 *    - **删除**
 *       - rename
 *       - 文件不存在，删除完成
 *    - **总结**
 *       - 增
 *       - 删
 *       - 改
 */
export function watchDir(dir: string, callbacks: IMonitorCallbacks) {
  const watcher = watch(dir, { recursive: true });

  // 记录所有的inode
  const filesMap = getFilesMap(dir);
  let inDeleteFilepath: undefined | string = undefined;
  let renameFilepath: string | undefined = undefined;

  // 检测重命名或新增
  function onRenamedOrAdded(filepath: string) {
    const stat = statSync(filepath);
    if (stat.isDirectory()) {
      if (filesMap.has(stat.ino)) {
        renameFilepath = filesMap.get(stat.ino);
        debug(`重命名目录: ${renameFilepath} -> ${filepath}`, stat.ino);
        callbacks.onRenamed && callbacks.onRenamed(renameFilepath!, filepath);
      } else {
        debug(`新增目录: ${filepath}`, stat.ino);
        callbacks.onAdded && callbacks.onAdded(filepath);
      }
      filesMap.set(stat.ino, filepath);
    } else if (stat.isFile()) {
      if (filesMap.has(stat.ino)) {
        renameFilepath = filesMap.get(stat.ino);
        debug(`重命名文件: ${renameFilepath} -> ${filepath}`, stat.ino);
        callbacks.onRenamed && callbacks.onRenamed(renameFilepath!, filepath);
      } else {
        debug(`新增文件: ${filepath}`, stat.ino);
        callbacks.onAdded && callbacks.onAdded(filepath);
      }
      filesMap.set(stat.ino, filepath);
    }
  }

  // 检测删除
  function onDeleted() {
    if (inDeleteFilepath && inDeleteFilepath !== renameFilepath) {
      debug(`删除文件: ${inDeleteFilepath}`);
      callbacks.onDeleted && callbacks.onDeleted(inDeleteFilepath);
      inDeleteFilepath = undefined;
      renameFilepath = undefined;
    }
  }

  // 检测修改
  function onModified(filename: string) {
    if (typeof filename === 'string') {
      const filepath = join(dir, filename);
      const stat = statSync(filepath);
      if (stat.isDirectory()) {
        callbacks.onModified && callbacks.onModified(filepath);
        debug(`修改目录: ${filepath}`, stat.ino);
      } else if (stat.isFile()) {
        callbacks.onModified && callbacks.onModified(filepath);
        debug(`修改文件: ${filepath}`, stat.ino);
      }
    }
  }

  watcher.on('change', (event, filename) => {
    if (event === 'rename') {
      if (typeof filename === 'string') {
        const filepath = join(dir, filename);
        if (existsSync(filepath)) {
          // 检测重命名或新增
          onRenamedOrAdded(filepath);
        } else {
          // 标记删除（待确认是删除还是重命名）
          inDeleteFilepath = filepath;
        }
      }
    } else if (event === 'change') {
      if (typeof filename === 'string') {
        // 检测修改
        onModified(filename);
      }
      // 检测删除
      onDeleted();
    }
  });

  return watcher;
}
