# 上班鼓励

一个轻松有趣的打工收入实时估算器。根据工资、工作日和每日作息，展示今天已经赚到多少钱。

![上班鼓励应用主界面效果图](docs/images/work-cheer-preview.png)

## 功能

- 每秒更新当天的收入估算、工作进度、计划日薪和参考时薪。
- 支持设置月工资、月计薪天数、固定工作日和上下班时间。
- 可配置午休，并在休息时段暂停计薪。
- 可为当天临时设置「上班」或「休息」。临时安排只对本地当天生效。
- 设置保存在本机，应用重新打开时会按当前时间重新计算。

默认工资为 ¥3,000，月计薪天数为 21.75 天，工作日为周一至周五。默认作息为 09:00–18:00，午休为 12:00–13:00。日薪按「月工资 ÷ 月计薪天数」计算，参考时薪根据设置的实际计薪时长估算。

## 技术栈

- **跨平台桌面应用**：Tauri 2 提供原生窗口，使用 Windows WebView2 和 macOS WKWebView。
- **界面**：原生 HTML、CSS 和 JavaScript ES modules，无额外前端框架。SVG 绘制应用图标和打工仓鼠角色。
- **桌面层**：Rust 2021 负责启动 Tauri 桌面应用。
- **本地设置**：使用应用 WebView 的 localStorage 保存工资、作息和当天安排，不上传用户设置。
- **构建发布**：GitHub Actions 配合 npm、Cargo 和 Tauri CLI，构建 Windows x64 NSIS 安装程序，以及 Apple 芯片和 Intel Mac 的 DMG。

## 开发与打包

需要安装 Node.js 24、稳定版 Rust 和对应平台的 [Tauri 构建前置工具](https://v2.tauri.app/start/prerequisites/)。

```sh
npm ci
npm start
```

在 Windows 上运行 `npm run build:win`，生成的安装程序位于 `src-tauri/target/release/bundle/nsis/`。在 macOS 上运行 `npm run build:mac`，DMG 位于 `src-tauri/target/release/bundle/dmg/`。

推送到 `main` 分支会自动构建各平台安装包，也可以在 GitHub Actions 手动运行 **Desktop installers**。macOS 和 Windows 的正式公开分发需要分别配置平台签名。macOS 还需要 Apple 公证。
