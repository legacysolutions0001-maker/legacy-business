---
name: Electron API runtime packaging
description: Durable constraint for packaging the Firebase-backed API inside Electron.
---

Externalizing the Firebase Admin and Google Cloud dependency graph is required for the ESM API bundle, but the generated runtime package must explicitly request optional peer dependencies that remain as runtime `require()` calls.

**Why:** npm production installs can omit optional peers such as `supports-color`, producing a packaged `MODULE_NOT_FOUND` even when the main Firebase packages are present.

**How to apply:** Keep the API runtime manifest and its installed `node_modules` inside the copied API `dist` directory, and verify both the source bundle and Electron Builder's `win-unpacked/resources/api-server/dist` tree before accepting a Windows build.