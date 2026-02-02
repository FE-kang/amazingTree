# AmazingTree (Vue 3)

一个高性能、可拖拽、可选择的虚拟滚动树组件，支持泛型类型自动推导，适合在大型数据集下渲染与交互。

> :warning:该组件因设计需求，是非受控组件，组件的拖拽功能会修改树形数据 `props.data`，使用需谨慎

**特性**

- 虚拟滚动渲染，平滑滚动与自动测量行高（20w节点无压力）
- 可选中（复选框），支持父子联动或严格模式
- 多行选择高亮（行级选择），支持 Ctrl/Cmd 切换与 Shift 区间
- 可筛选，可快速定位节点
- 拖拽换位与嵌套，提供前置、后置、内部三种放置方式
- 支持自定义内容（节点插槽和空数据占位插槽）
- 支持自定义拖拽/释放禁用逻辑
- 轻量依赖，仅依赖 `vue`

**安装**

- `npm i amazing-tree`

**使用**

> 导入组件 `import { AmazingTree } from 'amazing-tree'`
> 导入样式：`import 'amazing-tree/style.css'`

- 基本示例

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { AmazingTree } from 'amazing-tree'
import 'amazing-tree/style.css'

type NodeItem = { uuid: string; name: string; children?: NodeItem[]; [k: string]: unknown }
const data = ref<NodeItem[]>([])
const filterName = ref('')
const filterNodeMethod = (q: unknown, node: NodeItem) => {
  const s = String(q || '')
  if (!s) return true
  return node.name.includes(s)
}

function onDrop(drag: NodeItem, target: NodeItem, type: 'prev' | 'next' | 'inner') {
  console.log(drag, target, type)
}
</script>

<template>
  <AmazingTree
    :data="data"
    :props="{ value: 'uuid', label: 'name', children: 'children' }"
    :filter-node-method="filterNodeMethod"
    :show-checkbox="true"
    :check-strictly="false"
    :default-checked-keys="['id-1', 'id-2']"
    @node-drop="onDrop"
  />
  <input v-model="filterName" placeholder="输入名称筛选" />
  <button @click="$refs.tree?.filter(filterName)">筛选</button>
</template>
```

**Props**

> 类型别名：Key = `string | number`

| 属性名                | 说明                                | 类型                                                           | 默认值                                                  | 是否可选 |
| --------------------- | ----------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| `data`                | 树数据源                            | `T[]`                                                          | —                                                       | 否       |
| `props`               | 字段映射                            | `{ value: string; label: string; children: string }`           | `{ value:'value', label:'label', children:'children' }` | 是       |
| `allowDrag`           | 是否允许拖拽某节点                  | `(node: T) => boolean`                                         | —                                                       | 是       |
| `allowDrop`           | 是否允许目标位置                    | `(drag: T, drop: T, type: 'prev'\|'next'\|'inner') => boolean` | —                                                       | 是       |
| `height`              | 容器高度（未传时样式回退为`100%`）  | `number \| string`                                             | —                                                       | 是       |
| `rowHeight`           | 行高（用于虚拟滚动估计）            | `number \| string`                                             | `32`                                                    | 是       |
| `dropLineColor`       | 拖拽前后置指示线颜色                | `string`                                                       | `'#ffd400'`                                             | 是       |
| `innerDashColor`      | 拖拽内部放置虚线颜色                | `string`                                                       | `'#ffd400'`                                             | 是       |
| `siblingZoneRatio`    | 行内前后置判定区域比例（0.05–0.49） | `number`                                                       | `0.35`                                                  | 是       |
| `dragStartThreshold`  | 触发拖拽的最小鼠标位移阈值          | `number`                                                       | `4`                                                     | 是       |
| `highlightColor`      | 选中行高亮色                        | `string`                                                       | `'#1e71ff'`                                             | 是       |
| `backgroundColor`     | 背景色                              | `string`                                                       | `'#1d1d24'`                                             | 是       |
| `textColor`           | 文本色                              | `string`                                                       | `'#c8d3de'`                                             | 是       |
| `hoverColor`          | 悬浮色                              | `string`                                                       | `'#5d90e5'`                                             | 是       |
| `currentNodeKey`      | 当前行的 `value`                    | `Key`                                                          | —                                                       | 是       |
| `defaultExpandedKeys` | 默认展开的节点 `value` 列表         | `Key[]`                                                        | —                                                       | 是       |
| `defaultExpandAll`    | 是否默认全部展开                    | `boolean`                                                      | `false`                                                 | 是       |
| `draggable`           | 是否允许拖拽                        | `boolean`                                                      | `false`                                                 | 是       |
| `emptyText`           | 空状态文案                          | `string`                                                       | `'暂无数据'`                                            | 是       |
| `showCheckbox`        | 是否显示复选框                      | `boolean`                                                      | `false`                                                 | 是       |
| `checkStrictly`       | 选择严格模式（父子不联动）          | `boolean`                                                      | `false`                                                 | 是       |
| `defaultCheckedKeys`  | 默认勾选的 `value` 列表             | `Key[]`                                                        | `[]`                                                    | 是       |
| `disabledChecked`     | 是否禁用当前节点复选框              | `(node: T) => boolean`                                         | —                                                       | 是       |
| `filterNodeMethod`    | 过滤方法（返回 false 隐藏该节点）   | `(value: unknown, node: T) => boolean`                         | —                                                       | 是       |

**Events**

| 事件名             | 说明                                | 回调参数                                                  |
| ------------------ | ----------------------------------- | --------------------------------------------------------- |
| `node-click`       | 点击行                              | `(node: T, ev: MouseEvent)`                               |
| `node-contextmenu` | 右键菜单                            | `(node: T, ev: MouseEvent)`                               |
| `node-drop`        | 拖拽放置                            | `(drag: T, target: T, type: 'prev' \| 'next' \| 'inner')` |
| `current-change`   | 当前行变化（配合 `currentNodeKey`） | `(node: T)`                                               |
| `check-change`     | 勾选框点击时触发；禁用状态不触发    | `(node: T, checked: boolean)`                             |
| `selection-change` | 行级多选集合变化                    | `(keys: Key[], nodes: T[])`                               |

**Slots**

| 插槽名    | 插槽参数                                                                  |
| --------- | ------------------------------------------------------------------------- |
| `default` | `{ node: T; data: T; level: number; expanded: boolean; isLeaf: boolean }` |
| `empty`   | —（空状态自定义）                                                         |

**Exposes**

| 方法名            | 说明                                           | 返回类型                              |
| ----------------- | ---------------------------------------------- | ------------------------------------- |
| `getCurrentKey`   | 获取当前行 `value`                             | `Key \| null`                         |
| `setCurrentKey`   | 设置当前行并滚动可见                           | `(id: Key \| null) => void`           |
| `scrollTo`        | 滚动到指定行（自动展开祖先）                   | `(id: Key \| null) => void`           |
| `getCheckedKeys`  | 获取当前勾选集合                               | `Key[]`                               |
| `setCheckedKeys`  | 批量设置勾选（应用联动/严格逻辑）              | `(keys: Key[]) => void`               |
| `setChecked`      | 设置单个节点勾选状态                           | `(id: Key, checked: boolean) => void` |
| `filter`          | 触发过滤，参数作为回调第 1 个参数              | `(value: unknown) => void`            |
| `getSelectedKeys` | 获取当前行级多选集合                           | `Key[]`                               |
| `setSelectedKeys` | 设置行级多选集合（自动过滤无效键并滚动到焦点） | `(keys: Key[]) => void`               |
| `clearSelection`  | 清空行级多选集合                               | `() => void`                          |

**行级多选（高亮）**

- 交互规则
  - 单击：选中当前行（清空其他）
  - Ctrl/Cmd+单击：切换当前行选中状态（增删）
  - Shift+单击：与上一次点击形成连续区间选择；可与 Ctrl 组合做并集
- 事件：`selection-change(keys, nodes)` 在每次选择变化时触发
- API：`getSelectedKeys` / `setSelectedKeys` / `clearSelection`
- 样式：多选行使用高亮色（`highlightColor`），与复选框勾选互不影响

```vue
<template>
  <AmazingTree
    ref="tree"
    :data="data"
    :props="{ value: 'uuid', label: 'name', children: 'children' }"
    @selection-change="onSelChange"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const tree = ref<any>()
function onSelChange(keys: (string | number)[], nodes: any[]) {
  // 监听多选变化
}

function readSelection() {
  const keys = tree.value.getSelectedKeys()
}

function setSelection(keys: (string | number)[]) {
  tree.value.setSelectedKeys(keys)
}

function clearSelection() {
  tree.value.clearSelection()
}
</script>
```
