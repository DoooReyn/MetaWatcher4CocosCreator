// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { existsSync } from 'fs';
import { join } from 'path';
import * as vscode from 'vscode';
import { debug } from './DebugLog';
import { MataWatcher } from './MetaWatcher';

/**
 * 监听目录变化
 */
function watch() {
  if (vscode.workspace.workspaceFolders) {
    for (let folder of vscode.workspace.workspaceFolders) {
      if (!MataWatcher.getInstance().watching) {
        const root = folder.uri.fsPath;
        const declaration = join(root, 'creator.d.ts');
        const assets = join(root, 'assets');
        debug(`正在检查工作区文件夹: ${root}`);
        if (existsSync(declaration) && existsSync(assets)) {
          vscode.window.showInformationMessage(`正在侦听目录: ${assets}`);
          MataWatcher.getInstance().watch(assets);
        }
      }
    }
  }
}

/**
 * 取消监听目录变化
 */
function unwatch() {
  if (MataWatcher.getInstance().watching) {
    const directory = MataWatcher.getInstance().directory;
    MataWatcher.getInstance().unwatch();
    vscode.window.showInformationMessage(`停止侦听目录: ${directory}`);
  }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  debug('扩展已激活!');
  watch();

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let start = vscode.commands.registerCommand('movescriptforcocoscreator.cccmove-start', () => {
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    watch();
  });

  let stop = vscode.commands.registerCommand('movescriptforcocoscreator.cccmove-stop', () => {
    unwatch();
  });

  context.subscriptions.push(start, stop);
}

// this method is called when your extension is deactivated
export function deactivate() {}
