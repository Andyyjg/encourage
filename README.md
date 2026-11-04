# 上班鼓励

一个在 Windows 和 macOS 上运行的简体中文桌面应用。主界面按作息显示今天已赚金额、工作进度、计划日薪和参考时薪。工资、作息和今日安排保存在本机。

## 使用

- 默认月工资为 ¥3,000，月计薪天数为 21.75 天。默认工作日为周一至周五，作息为 09:00–18:00，午休为 12:00–13:00。
- 在「工资与作息」里修改金额、计薪天数、工作日和同一天内的班次。午休可关闭。
- 用「今日安排」临时覆盖固定工作日。覆盖按本地日期生效，隔天恢复按作息。
- 日薪等于月工资除以月计薪天数。时薪按当天配置的计薪时长计算，午休期间金额暂停，下班后停在日薪。程序按当前时间重算，重启也能直接显示当前金额。

## 开发和打包

安装 Node.js 24 和稳定版 Rust，然后安装对应平台的 [Tauri 构建前置工具](https://v2.tauri.app/start/prerequisites/)。

```sh
npm ci
npm start
```

在 Windows 上运行 `npm run build:win`，安装程序生成在 `src-tauri/target/release/bundle/nsis/`。在 macOS 上运行 `npm run build:mac`，磁盘映像生成在 `src-tauri/target/release/bundle/dmg/`。

推送到 GitHub 仓库的 `main` 分支后会自动构建 Windows x64 和 macOS（Apple 芯片、Intel）安装包。也可以在 Actions 中手动运行 **Desktop installers**。构建完成后，从对应运行记录下载产物。公开分发时配置 Windows 代码签名，以及 macOS Developer ID 签名和 Apple 公证。
