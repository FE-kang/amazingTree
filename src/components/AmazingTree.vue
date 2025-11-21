<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch, watchEffect } from 'vue'
import type { UnwrapRef } from 'vue'

type Key = string | number

type PropsMapping = {
  value: string
  label: string
  children: string
}

type AllowDragFn = (node: T) => boolean
type AllowDropFn = (dragNode: T, dropNode: T, type: 'prev' | 'next' | 'inner') => boolean

interface Props {
  data: T[]
  props?: Partial<PropsMapping>
  allowDrag?: AllowDragFn
  allowDrop?: AllowDropFn
  height?: number | string
  highlightColor?: string
  backgroundColor?: string
  textColor?: string
  hoverColor?: string
  currentNodeKey?: Key
  defaultExpandedKeys?: Key[]
  defaultExpandAll?: boolean
  draggable?: boolean
  emptyText?: string
  showCheckbox?: boolean
  checkStrictly?: boolean
  defaultCheckedKeys?: Key[]
  disabledChecked?: (node: T) => boolean
  filterNodeMethod?: (value: unknown, node: T) => boolean
}

const props = withDefaults(
  defineProps<Props>(),
  {
    props: () => ({ value: 'value', label: 'label', children: 'children' }),
    height: undefined,
    highlightColor: '#1e71ff',
    backgroundColor: '#1d1d24',
    textColor: '#c8d3de',
    hoverColor: '#5d90e5',
    defaultExpandAll: false,
    draggable: false,
    emptyText: '暂无数据',
    showCheckbox: false,
    checkStrictly: false,
    defaultCheckedKeys: () => [],
  },
)

const emit = defineEmits<{
  (e: 'node-click', node: T, ev: MouseEvent): void
  (e: 'node-contextmenu', node: T, ev: MouseEvent): void
  (e: 'node-drop', dragging: T, target: T, type: 'prev' | 'next' | 'inner'): void
  (e: 'current-change', node: T): void
  (e: 'check-change', node: T, checked: boolean): void
}>()

const valueKey = computed<string>(() => props.props!.value || 'value')
const labelKey = computed<string>(() => props.props!.label || 'label')
const childrenKey = computed<string>(() => props.props!.children || 'children')
const isEmpty = computed<boolean>(() => Array.isArray(props.data) ? props.data.length === 0 : true)

type FlatNode = {
  id: Key
  node: T
  parent: T | null
  level: number
  index: number
  isLeaf: boolean
}

const expandedKeys = ref<Set<Key>>(new Set())
const checkedKeys = ref<Set<Key>>(new Set())
const halfCheckedKeys = ref<Set<Key>>(new Set())
const filterQuery = ref<unknown>(null)

function isExpanded(id: Key) {
  return expandedKeys.value.has(id)
}
function toggleExpand(id: Key) {
  if (expandedKeys.value.has(id)) expandedKeys.value.delete(id)
  else expandedKeys.value.add(id)
  visible.value = buildVisible(props.data || [])
  nextTick(() => {
    measureAndUpdate()
    recomputeWindow()
  })
}

function getId(n: T): Key {
  return (n as any)[valueKey.value] as Key
}
function getChildren(n: T): T[] {
  const ch = (n as any)[childrenKey.value] as unknown
  return Array.isArray(ch) ? (ch as T[]) : []
}
function isChecked(id: Key): boolean {
  return checkedKeys.value.has(id)
}
function isIndeterminate(id: Key): boolean {
  return halfCheckedKeys.value.has(id)
}
function setNodeChecked(id: Key, checked: boolean) {
  if (checked) checkedKeys.value.add(id)
  else checkedKeys.value.delete(id)
  halfCheckedKeys.value.delete(id)
  if (!props.checkStrictly) {
    const node = findNodeById(id, props.data || [])
    if (node) {
      const stack: T[] = [node]
      while (stack.length) {
        const cur = stack.pop() as T
        const cid = getId(cur)
        if (checked) checkedKeys.value.add(cid)
        else checkedKeys.value.delete(cid)
        halfCheckedKeys.value.delete(cid)
        const ch = getChildren(cur)
        for (const c of ch) stack.push(c)
      }
      const path = findPathToId(id, props.data || []) || []
      for (const anc of path) {
        const ancId = getId(anc)
        const ch = getChildren(anc)
        let all = true
        let any = false
        for (const c of ch) {
          const cid = getId(c)
          const cc = checkedKeys.value.has(cid)
          const hh = halfCheckedKeys.value.has(cid)
          if (cc || hh) any = true
          if (!cc || hh) all = false
        }
        if (ch.length === 0) {
          if (checkedKeys.value.has(ancId)) {
            halfCheckedKeys.value.delete(ancId)
          } else {
            halfCheckedKeys.value.delete(ancId)
          }
        } else if (all) {
          checkedKeys.value.add(ancId)
          halfCheckedKeys.value.delete(ancId)
        } else if (any) {
          checkedKeys.value.delete(ancId)
          halfCheckedKeys.value.add(ancId)
        } else {
          checkedKeys.value.delete(ancId)
          halfCheckedKeys.value.delete(ancId)
        }
      }
    }
  }
}
function setCheckedKeys(keys: Key[]) {
  checkedKeys.value = new Set()
  halfCheckedKeys.value = new Set()
  for (const k of keys || []) setNodeChecked(k, true)
}
function onCheckClick(n: UnwrapRef<FlatNode>, ev: MouseEvent) {
  const el = ev.target as HTMLInputElement
  if (props.disabledChecked && props.disabledChecked(n.node as T)) return
  emit('check-change', n.node as T, !!el.checked)
  setNodeChecked(n.id, !!el.checked)
}

function buildVisible(list: T[]): FlatNode[] {
  const out: FlatNode[] = []
  function walk(arr: T[], parent: T | null, level: number) {
    for (let i = 0; i < arr.length; i++) {
      const node: T = arr[i]!
      const id = getId(node)
      const children = getChildren(node)
      const isLeaf = children.length === 0
      out.push({ id, node, parent, level, index: i, isLeaf })
      if (!isLeaf && expandedKeys.value.has(id)) {
        walk(children, node, level + 1)
      }
    }
  }
  walk(list, null, 0)
  if (props.filterNodeMethod && filterQuery.value != null) {
    const match = new Set<Key>()
    const anc = new Set<Key>()
    function dfs(n: T): boolean {
      const id = getId(n)
      const ch = getChildren(n)
      let childHas = false
      for (const c of ch) childHas = dfs(c) || childHas
      const selfHas = !!props.filterNodeMethod!(filterQuery.value, n)
      if (selfHas) match.add(id)
      if (childHas) anc.add(id)
      return selfHas || childHas
    }
    for (const r of list) dfs(r)
    return out.filter((f) => match.has(f.id) || anc.has(f.id))
  }
  return out
}

const containerRef = ref<HTMLDivElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(0)
const visible = ref<FlatNode[]>([])
const sizes = reactive<Map<Key, number>>(new Map())
const defaultSize = 28

const cumulative = computed<number[]>(() => {
  let sum = 0
  const arr: number[] = []
  for (const n of visible.value) {
    const h = sizes.get(n.id) || defaultSize
    sum += h
    arr.push(sum)
  }
  return arr
})

const totalHeight = computed<number>(() => {
  const arr = cumulative.value
  return arr.length ? arr[arr.length - 1]! : 0
})

function binarySearchOffset(offset: number) {
  let lo = 0
  let hi = cumulative.value.length - 1
  let ans = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (cumulative.value[mid] !== undefined && cumulative.value[mid] >= offset) {
      ans = mid
      hi = mid - 1
    } else lo = mid + 1
  }
  return ans
}

const startIndex = ref(0)
const endIndex = ref(0)
const topPadding = ref(0)
const bottomPadding = ref(0)

function recomputeWindow() {
  viewportHeight.value = containerRef.value?.clientHeight || 0
  if (cumulative.value.length === 0 || visible.value.length === 0) {
    startIndex.value = 0
    endIndex.value = 0
    topPadding.value = 0
    bottomPadding.value = 0
    return
  }
  const start = binarySearchOffset(scrollTop.value)
  startIndex.value = Math.max(0, start - 3)
  const startRow = visible.value[startIndex.value]
  const rowSize = startRow ? (sizes.get(startRow.id) || defaultSize) : 0
  const yBase = cumulative.value[startIndex.value] ?? 0
  const y = yBase - rowSize
  topPadding.value = Math.max(0, y)
  let idx = startIndex.value
  const endY = scrollTop.value + viewportHeight.value + 3 * defaultSize
  while (idx < visible.value.length && ((cumulative.value[idx] ?? 0) < endY)) idx++
  endIndex.value = Math.min(visible.value.length, idx + 1)
  const lastCum = cumulative.value[endIndex.value - 1] ?? 0
  const renderedHeight = lastCum - topPadding.value
  if (renderedHeight < viewportHeight.value && endIndex.value < visible.value.length) {
    let curEnd = endIndex.value
    let curRendered = renderedHeight
    while (curRendered < viewportHeight.value && curEnd < visible.value.length) {
      curEnd++
      curRendered = (cumulative.value[curEnd - 1] ?? 0) - topPadding.value
    }
    endIndex.value = curEnd
  }
  bottomPadding.value = Math.max(0, totalHeight.value - topPadding.value - ((cumulative.value[endIndex.value - 1] ?? 0) - topPadding.value))
}

watch([scrollTop, () => props.data, expandedKeys], () => {
  visible.value = buildVisible(props.data || [])
  nextTick(measureAndUpdate)
  recomputeWindow()
})

onMounted(() => {
  visible.value = buildVisible(props.data || [])
  nextTick(measureAndUpdate)
  recomputeWindow()
  if (props.defaultCheckedKeys && props.defaultCheckedKeys.length) setCheckedKeys(props.defaultCheckedKeys)
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      viewportHeight.value = containerRef.value?.clientHeight || 0
      recomputeWindow()
    })
    resizeObserver.observe(containerRef.value)
  }
})

let resizeObserver: ResizeObserver | null = null

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

const rowRefs = reactive<Map<Key, HTMLElement>>(new Map())

function setRowRef(id: Key, el: HTMLElement | null) {
  if (!el) rowRefs.delete(id)
  else rowRefs.set(id, el)
}

function measureAndUpdate() {
  let changed = false
  for (const n of visible.value.slice(startIndex.value, endIndex.value)) {
    const el = rowRefs.get(n.id)
    if (el) {
      const h = el.offsetHeight
      if (!sizes.has(n.id) || sizes.get(n.id) !== h) {
        sizes.set(n.id, h)
        changed = true
      }
    }
  }
  if (changed) recomputeWindow()
}

function onScroll() {
  scrollTop.value = containerRef.value?.scrollTop || 0
  recomputeWindow()
}

const dragging = ref(false)
const dragId = ref<Key | null>(null)
const dropTargetId = ref<Key | null>(null)
const dropType = ref<'prev' | 'next' | 'inner' | null>(null)
const dragClientY = ref(0)
const activeId = ref<Key | null>(null)
const autoScrollDir = ref<-1 | 0 | 1>(0)
let autoScrollRaf: number | null = null

function cancelAutoScroll() {
  if (autoScrollRaf != null) {
    cancelAnimationFrame(autoScrollRaf)
    autoScrollRaf = null
  }
}
function stepAutoScroll() {
  if (!dragging.value || autoScrollDir.value === 0) {
    cancelAutoScroll()
    return
  }
  const el = containerRef.value
  if (!el) {
    cancelAutoScroll()
    return
  }
  const max = el.scrollHeight - el.clientHeight
  const speed = 12
  el.scrollTop = Math.max(0, Math.min(max, el.scrollTop + autoScrollDir.value * speed))
  scrollTop.value = el.scrollTop
  recomputeWindow()
  autoScrollRaf = requestAnimationFrame(stepAutoScroll)
}
function ensureAutoScroll() {
  if (autoScrollDir.value !== 0 && autoScrollRaf == null) autoScrollRaf = requestAnimationFrame(stepAutoScroll)
  if (autoScrollDir.value === 0) cancelAutoScroll()
}

function findFlatById(id: Key | null): UnwrapRef<FlatNode> | null {
  if (id == null) return null
  for (const n of visible.value) if (n.id === id) return n
  return null
}

function pointerToIndex(clientY: number) {
  const rect = containerRef.value!.getBoundingClientRect()
  const y = clientY - rect.top + scrollTop.value
  const idx = binarySearchOffset(y)
  return idx
}

function onRowMousedown(n: UnwrapRef<FlatNode>, ev: MouseEvent) {
  if (!props.draggable) return
  if (ev.button !== 0) return
  const can = props.allowDrag ? !!props.allowDrag(n.node as T) : true
  if (!can) return
  dragging.value = true
  dragId.value = n.id
  dragClientY.value = ev.clientY
  ev.preventDefault()
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(ev: MouseEvent) {
  if (!dragging.value) return
  dragClientY.value = ev.clientY
  const idx = pointerToIndex(ev.clientY)
  const target = visible.value[Math.min(Math.max(idx, 0), visible.value.length - 1)]
  dropTargetId.value = target?.id ?? null
  if (!target) {
    dropType.value = null
    return
  }
  const cum = cumulative.value[idx] ?? 0
  const h = sizes.get(target.id) ?? defaultSize
  const top = cum - h
  const rect = containerRef.value!.getBoundingClientRect()
  const localY = ev.clientY - rect.top + scrollTop.value - top
  const r = localY / h
  let t: 'prev' | 'next' | 'inner' = 'inner'
  if (r < 0.25) t = 'prev'
  else if (r > 0.75) t = 'next'
  const dragFlat = findFlatById(dragId.value)
  const allowed = props.allowDrop ? !!(dragFlat && props.allowDrop(dragFlat.node as T, target.node as T, t)) : true
  dropType.value = allowed ? t : null
  autoScrollDir.value = ev.clientY > rect.bottom ? 1 : ev.clientY < rect.top ? -1 : 0
  ensureAutoScroll()
}

function findPathToId(id: Key, list: any[], path: any[] = []): any[] | null {
  for (const n of list) {
    if (getId(n) === id) return path
    const ch = getChildren(n)
    if (ch.length) {
      const p = findPathToId(id, ch, [...path, n])
      if (p) return p
    }
  }
  return null
}

function findNodeById(id: Key | null, list: T[]): T | null {
  if (id == null) return null
  for (const n of list) {
    if (getId(n) === id) return n
    const ch = getChildren(n)
    const res = findNodeById(id, ch)
    if (res) return res
  }
  return null
}

function collectAllKeys(list: T[]): Key[] {
  const out: Key[] = []
  for (const n of list) {
    out.push(getId(n))
    const ch = getChildren(n)
    if (ch.length) out.push(...collectAllKeys(ch))
  }
  return out
}

function removeFromSource(drag: UnwrapRef<FlatNode>) {
  const srcParent = drag.parent
  if (srcParent) {
    const arr = getChildren(srcParent as T)
    arr.splice(drag.index, 1)
  } else {
    const idx = props.data.findIndex((n) => getId(n) === drag.id)
    if (idx >= 0) props.data.splice(idx, 1)
  }
}

function insertToTarget(dragNode: T, target: UnwrapRef<FlatNode>, type: 'prev' | 'next' | 'inner') {
  if (type === 'inner') {
    if (!Array.isArray((target.node as any)[childrenKey.value])) (target.node as any)[childrenKey.value] = [] as T[]
    ;((target.node as any)[childrenKey.value] as T[]).push(dragNode)
    expandedKeys.value.add(target.id)
    return
  }
  const parent = target.parent
  if (parent) {
    const arr = getChildren(parent as T)
    const base = target.index + (type === 'next' ? 1 : 0)
    arr.splice(base, 0, dragNode)
  } else {
    const base = target.index + (type === 'next' ? 1 : 0)
    props.data.splice(base, 0, dragNode)
  }
}

function onMouseUp() {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  cancelAutoScroll()
  if (!dragging.value) return
  const dragFlat = findFlatById(dragId.value)
  const targetFlat = findFlatById(dropTargetId.value)
  const t = dropType.value
  dragging.value = false
  dropType.value = null
  dropTargetId.value = null
  if (!dragFlat || !targetFlat || !t) return
  if (props.allowDrop && !props.allowDrop(dragFlat.node as T, targetFlat.node as T, t)) return
  if (dragFlat.id === targetFlat.id) return
  const targetNode = t === 'inner' ? targetFlat.node : targetFlat.parent || null
  if (targetNode) {
    const targetAncestors = findPathToId(getId(targetNode as T), props.data || []) || []
    for (const anc of targetAncestors) if (getId(anc) === dragFlat.id) return
  }
  const dragNode = dragFlat.node as T
  removeFromSource(dragFlat)
  const newVisible = buildVisible(props.data || [])
  visible.value = newVisible
  const updatedTarget = findFlatById(targetFlat.id) || targetFlat
  insertToTarget(dragNode as T, updatedTarget, t)
  visible.value = buildVisible(props.data || [])
  nextTick(() => {
    measureAndUpdate()
    recomputeWindow()
  })
  emit('node-drop', dragNode as T, updatedTarget.node as T, t)
}

function onRowClick(n: UnwrapRef<FlatNode>, ev: MouseEvent) {
  activeId.value = n.id
  emit('node-click', n.node as T, ev)
}
function onRowContext(n: UnwrapRef<FlatNode>, ev: MouseEvent) {
  emit('node-contextmenu', n.node as T, ev)
}

watchEffect(() => {
  nextTick(measureAndUpdate)
})

watch(
  () => props.currentNodeKey,
  (val) => {
    activeId.value = val ?? null
  },
  { immediate: true },
)

watch(
  () => props.defaultExpandedKeys,
  (val) => {
    expandedKeys.value = new Set(val || [])
    visible.value = buildVisible(props.data || [])
    nextTick(() => {
      measureAndUpdate()
      recomputeWindow()
    })
  },
  { immediate: true },
)

watch(
  () => props.defaultExpandAll,
  (val) => {
    if (val) {
      expandedKeys.value = new Set(collectAllKeys(props.data || []))
      visible.value = buildVisible(props.data || [])
      nextTick(() => {
        measureAndUpdate()
        recomputeWindow()
      })
    }
  },
  { immediate: true },
)

watch(
  () => props.data,
  () => {
    if (props.defaultExpandAll) {
      expandedKeys.value = new Set(collectAllKeys(props.data || []))
    }
    visible.value = buildVisible(props.data || [])
    nextTick(() => {
      measureAndUpdate()
      recomputeWindow()
    })
    const all = new Set(collectAllKeys(props.data || []))
    checkedKeys.value = new Set([...checkedKeys.value].filter((k) => all.has(k)))
    halfCheckedKeys.value = new Set([...halfCheckedKeys.value].filter((k) => all.has(k)))
  },
  { deep: true },
)

function expandAncestors(id: Key) {
  const path = findPathToId(id, props.data || []) || []
  for (const anc of path) expandedKeys.value.add(getId(anc))
  visible.value = buildVisible(props.data || [])
}

function scrollTo(id: Key | null) {
  if (id == null) return
  expandAncestors(id)
  nextTick(() => {
    const idx = visible.value.findIndex((f) => f.id === id)
    if (idx < 0 || !containerRef.value) return
    const h = sizes.get(id) || defaultSize
    const top = (cumulative.value[idx] ?? 0) - h
    const viewH = containerRef.value.clientHeight
    const targetTop = Math.max(0, top - Math.max(0, (viewH - h) / 2))
    containerRef.value.scrollTop = targetTop
    scrollTop.value = targetTop
    recomputeWindow()
    nextTick(() => {
      const el = rowRefs.get(id)
      if (!el || !containerRef.value) return
      const left = el.offsetLeft
      const w = el.offsetWidth
      const viewW = containerRef.value.clientWidth
      const targetLeft = Math.max(0, left + Math.max(0, w / 2) - Math.max(0, viewW / 2))
      containerRef.value.scrollLeft = targetLeft
    })
  })
}

function setCurrentKey(id: Key | null) {
  activeId.value = id ?? null
  scrollTo(activeId.value)
}

defineExpose({
  getCurrentKey: () => activeId.value,
  setCurrentKey,
  scrollTo,
  getCheckedKeys: () => Array.from(checkedKeys.value),
  setCheckedKeys,
  setChecked: (id: Key, checked: boolean) => setNodeChecked(id, checked),
  filter: (value: unknown) => {
    filterQuery.value = value
    expandedKeys.value = new Set(collectAllKeys(props.data || []))
    visible.value = buildVisible(props.data || [])
    nextTick(() => {
      measureAndUpdate()
      recomputeWindow()
    })
  },
})

watch(activeId, (id) => {
  const node = findNodeById(id, props.data || [])
  if (node) emit('current-change', node)
})
</script>

<template>
  <div
    ref="containerRef"
    class="amazing-tree"
    :class="{ 'is-dragging': dragging }"
    :style="{ height: typeof height === 'number' ? height + 'px' : height || '100%', '--vtree-bg': backgroundColor, '--vtree-text': textColor, '--vtree-hover': hoverColor }"
    @scroll="onScroll"
  >
    <template v-if="!isEmpty">
      <div :style="{ height: totalHeight + 'px', position: 'relative', minWidth: '100%', width: 'max-content' }">
        <div :style="{ height: topPadding + 'px' }"></div>
        <div v-for="n in visible.slice(startIndex, endIndex)" :key="n.id" class="amazing-tree-row-wrapper">
          <div
            class="amazing-tree-row"
            :style="{ paddingLeft: (n.level * 16) + 'px', '--active-color': highlightColor }"
            :class="{ 'is-target-inner': dragging && dropTargetId === n.id && dropType === 'inner', 'is-active': activeId === n.id }"
            @mousedown="onRowMousedown(n, $event)"
            @click="onRowClick(n, $event)"
            @contextmenu.prevent="onRowContext(n, $event)"
            :ref="(el) => setRowRef(n.id, el as HTMLElement)"
          >
            <span
              class="amazing-tree-caret-box"
              :class="{ 'is-leaf': n.isLeaf }"
              @click.stop="!n.isLeaf && toggleExpand(n.id)"
            >
              <span v-if="!n.isLeaf" class="amazing-tree-caret" :class="{ expanded: isExpanded(n.id) }"></span>
            </span>
            <input
              v-if="showCheckbox"
              class="amazing-tree-checkbox"
              type="checkbox"
              :checked="isChecked(n.id)"
              :indeterminate="isIndeterminate(n.id)"
              :disabled="props.disabledChecked ? props.disabledChecked(n.node as T) : false"
              @click.stop="onCheckClick(n, $event)"
            />
            <slot :node="n.node" :data="n.node" :level="n.level" :expanded="isExpanded(n.id)" :isLeaf="n.isLeaf">
              <span class="amazing-tree-label">{{ n.node[labelKey] }}</span>
            </slot>
          </div>
          <div
            v-if="dragging && dropTargetId === n.id && (dropType === 'prev' || dropType === 'next')"
            class="amazing-tree-drop-line"
            :class="{ 'is-prev': dropType === 'prev', 'is-next': dropType === 'next' }"
          ></div>
        </div>
        <div :style="{ height: bottomPadding + 'px' }"></div>
      </div>
      <div v-if="dragging" class="amazing-tree-ghost" :style="{ top: dragClientY + 'px' }"></div>
    </template>
    <div v-else class="amazing-tree-empty">
      <slot name="empty">
        <div class="amazing-tree-empty-inner">{{ emptyText }}</div>
      </slot>
    </div>
  </div>
</template>
<style scoped lang="scss">
.amazing-tree {
  width: 100%;
  overflow: auto;
  position: relative;
  background: var(--vtree-bg);
  color: var(--vtree-text);
  scrollbar-width: thin;
  scrollbar-color: rgba(144, 147, 153, 0.3) transparent;
  cursor: pointer;

  --vtree-primary: #409eff;
  --vtree-checkbox-bg: #1d1d24;
  --vtree-checkbox-border: #4c4d4f;
  --vtree-checkbox-hover-border: #8d8e91;
  --vtree-checkbox-disabled-bg: #2c2f33;
  --vtree-checkbox-disabled-border: #5c5f63;
  --vtree-checkbox-check: #ffffff;
  --vtree-checkbox-check-disabled: #cfd3dc;

  &.is-dragging,
  &.is-dragging * {
    user-select: none;
  }

  * {
    cursor: pointer;
  }

  input[type='checkbox']:disabled {
    cursor: not-allowed;
  }

  .amazing-tree-checkbox {
    -webkit-appearance: none;
    appearance: none;
    position: relative;
    width: 14px;
    height: 14px;
    border: 1px solid var(--vtree-checkbox-border);
    background: var(--vtree-checkbox-bg);
    border-radius: 2px;
    outline: none;
    transition:
      border-color 0.12s ease,
      background-color 0.12s ease,
      box-shadow 0.12s ease;
    vertical-align: middle;
    margin-right: 6px;
  }
  .amazing-tree-checkbox:not(:disabled):hover {
    border-color: var(--vtree-checkbox-hover-border);
  }
  .amazing-tree-checkbox:focus-visible {
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
  }
  .amazing-tree-checkbox:checked {
    background: var(--vtree-primary);
    border-color: var(--vtree-primary);
  }
  .amazing-tree-checkbox:checked::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 0px;
    width: 4px;
    height: 8px;
    border: 2px solid var(--vtree-checkbox-check);
    border-top: 0;
    border-left: 0;
    transform: rotate(45deg);
  }
  .amazing-tree-checkbox:indeterminate {
    background: var(--vtree-primary);
    border-color: var(--vtree-primary);
  }
  .amazing-tree-checkbox:indeterminate::after {
    content: '';
    position: absolute;
    left: 2px;
    top: 5px;
    width: 10px;
    height: 2px;
    background: var(--vtree-checkbox-check);
    border-radius: 1px;
  }
  .amazing-tree-checkbox:disabled {
    background: var(--vtree-checkbox-disabled-bg);
    border-color: var(--vtree-checkbox-disabled-border);
  }
  .amazing-tree-checkbox:disabled:checked::after {
    border-color: var(--vtree-checkbox-check-disabled);
  }
  .amazing-tree-checkbox:disabled:indeterminate::after {
    background: var(--vtree-checkbox-check-disabled);
  }

  .amazing-tree-row-wrapper {
    position: relative;

    .amazing-tree-drop-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 0;
      border-top: 2px solid #409eff;

      &.is-prev {
        top: 0;
      }
      &.is-next {
        bottom: 0;
      }
    }
  }

  .amazing-tree-row {
    display: flex;
    align-items: center;
    gap: 4px;
    box-sizing: border-box;
    min-height: 24px;
    padding: 0 8px;
    white-space: nowrap;

    &:hover {
      background: var(--vtree-hover);
    }

    &.is-active {
      background: var(--active-color);

      &:hover {
        background: var(--active-color);
      }
    }

    &.is-target-inner {
      outline: 2px dashed #409eff;
    }

    .amazing-tree-caret-box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      aspect-ratio: 1 / 1;
      min-width: 16px;
      margin-right: 4px;
      cursor: pointer;

      &.is-leaf {
        pointer-events: none;
      }
    }

    .amazing-tree-caret {
      display: block;
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid #909399;
      transform: rotate(-90deg);
      transition: transform 0.1s linear;

      &.expanded {
        transform: rotate(0deg);
      }
    }

    .amazing-tree-label {
      color: inherit;
    }
  }

  .amazing-tree-ghost {
    position: fixed;
    left: 16px;
    width: 120px;
    height: 24px;
    background: rgba(64, 158, 255, 0.2);
    border: 1px solid #409eff;
    pointer-events: none;
  }

  .amazing-tree-empty {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    > * {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .amazing-tree-empty-inner {
      color: var(--vtree-text);
    }
  }
}

:deep(.amazing-tree) {
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(144, 147, 153, 0.3);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background-color: rgba(144, 147, 153, 0.5);
  }
}
</style>