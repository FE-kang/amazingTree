**特别注意**

- 该库目前使用Github Actions 发布到npm，勿手动使用命令行发布
- 若需要发布新版本，需先在 `package.json` 中更新版本号

**构建与发布**

- 开发：`npm run dev`
- 类型检查：`npm run type-check`
- 构建应用：`npm run build`
- 构建库：`npm run build:lib`（生成 `dist/amazing-tree.es.js`、`amazing-tree.cjs.js`、`amazing-tree.umd.js`）
- 发布到 npm：在确认 `package.json` 中 `name`、`version`、`files`、`exports` 配置正确后执行 `npm publish`

**注意事项**

- 库构建将 `vue` 作为外部依赖，使用方需自行安装 `vue@^3.5`
- 若需要声明文件（`.d.ts`），可引入 `vite-plugin-dts` 或单独生成并随包发布
