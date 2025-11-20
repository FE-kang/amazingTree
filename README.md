# VirtualTree (Vue 3)

一个高性能、可拖拽、可选择的虚拟滚动树组件，支持泛型类型自动推导，适合在大型数据集下渲染与交互。

**特性**
- 虚拟滚动渲染，平滑滚动与自动测量行高
- 可选中（复选框），支持父子联动或严格模式
- 拖拽换位与嵌套，提供前置、后置、内部三种放置方式
- 泛型组件：从 `data` 推导节点业务类型 `T`，事件与插槽类型随之推导
- 轻量依赖，仅依赖 `vue`

**安装**
- 待发布到 npm 后：`npm i amazing-tree`
- 当前仓库本地打包：`npm run build:lib`，产物在 `dist/`

**使用**
- 基本示例
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { VirtualTree } from 'amazing-tree'

type NodeItem = { uuid: string; name: string; children?: NodeItem[]; [k: string]: unknown }
const data = ref<NodeItem[]>([])

function onDrop(drag: NodeItem, target: NodeItem, type: 'prev' | 'next' | 'inner') {
  console.log(drag, target, type)
}
</script>

<template>
  <VirtualTree
    :data="data"
    :props="{ value: 'uuid', label: 'name', children: 'children' }"
    :show-checkbox="true"
    :check-strictly="false"
    :default-checked-keys="['id-1','id-2']"
    @node-drop="onDrop"
  />
</template>
```

**Props**
- `data: T[]` 树数据源
- `props?: { value: string; label: string; children: string }` 字段映射，默认 `{ value:'value', label:'label', children:'children' }`
- `allowDrag?: (node: T) => boolean` 是否允许拖拽某节点
- `allowDrop?: (drag: T, drop: T, type: 'prev'|'next'|'inner') => boolean` 是否允许目标位置
- `height?: number | string` 容器高度，默认 `100%`
- `highlightColor?: string` 选中行高亮色，默认 `#1e71ff`
- `backgroundColor?: string` 背景色，默认 `#1d1d24`
- `textColor?: string` 文本色，默认 `#c8d3de`
- `hoverColor?: string` 悬浮色，默认 `#5d90e5`
- `currentNodeKey?: Key` 当前行的 `value`
- `defaultExpandedKeys?: Key[]` 默认展开的节点 `value` 列表
- `defaultExpandAll?: boolean` 是否默认全部展开
- `draggable?: boolean` 是否允许拖拽，默认 `false`
- `emptyText?: string` 空状态文案，默认 `暂无数据`
- `showCheckbox?: boolean` 是否显示复选框，默认 `false`
- `checkStrictly?: boolean` 选择严格模式，父子不联动，默认 `false`
- `defaultCheckedKeys?: Key[]` 默认勾选的 `value` 列表，默认 `[]`
- `disabledChecked?: (node: T) => boolean` 是否禁用当前节点复选框，默认 `false`

**Events**
- `node-click(node: T, ev: MouseEvent)` 点击行
- `node-contextmenu(node: T, ev: MouseEvent)` 右键菜单
- `node-drop(drag: T, target: T, type: 'prev'|'next'|'inner')` 拖拽放置
- `current-change(node: T)` 当前行变化（配合 `currentNodeKey`）

**Slots**
- `default`：`{ node: T; data: T; level: number; expanded: boolean; isLeaf: boolean }`
- `empty`：空状态自定义

**Expose API**
- `getCurrentKey(): Key | null` 获取当前行 `value`
- `setCurrentKey(id: Key | null): void` 设置当前行并滚动可见
- `scrollTo(id: Key | null): void` 滚动到指定行（自动展开祖先）
- `getCheckedKeys(): Key[]` 获取当前勾选集合
- `setCheckedKeys(keys: Key[]): void` 批量设置勾选（应用联动/严格逻辑）
- `setChecked(id: Key, checked: boolean): void` 设置单个节点勾选状态

**类型与泛型**
- 组件声明为泛型：`generic="T extends Record<string, unknown>"`
- `T` 会从 `data: T[]` 自动推导，事件与插槽参数均按 `T` 类型约束
- 在模板中若需要强类型事件回调，可在脚本中声明具体 `T`（例如 `NodeItem`）并书写对应函数签名

**样式**
- 复选框遵循暗色主题风格，支持禁用态 `cursor:not-allowed`，可通过 CSS 变量定制：
  - `--vtree-primary` 主色（默认 `#409eff`）
  - `--vtree-checkbox-*` 系列变量控制背景、边框、禁用与勾选颜色

**构建与发布**
- 开发：`npm run dev`
- 类型检查：`npm run type-check`
- 构建应用：`npm run build`
- 构建库：`npm run build:lib`（生成 `dist/virtual-tree.es.js`、`virtual-tree.cjs`、`virtual-tree.umd.js`）
- 发布到 npm：在确认 `package.json` 中 `name`、`version`、`files`、`exports` 配置正确后执行 `npm publish`

**注意事项**
- 库构建将 `vue` 作为外部依赖，使用方需自行安装 `vue@^3.5`
- 若需要声明文件（`.d.ts`），可引入 `vite-plugin-dts` 或单独生成并随包发布
