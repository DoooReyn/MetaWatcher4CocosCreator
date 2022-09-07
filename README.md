# Cocos Creator Meta 文件同步辅助工具

## 特性

- 跟踪 Cocos Creator 项目下的 `assets` 目录，当操作资源文件时，同步对应的 `.meta` 文件

- 目前支持以下操作：
  - 重命名；
  - 删除；
  - 移动。

## 使用

- 载入 Cocos Creator 项目根目录时将自动开启该功能；
- 使用命令 `cccmove start` 开启该功能；
- 使用命令 `cccmove stop` 关闭该功能。
