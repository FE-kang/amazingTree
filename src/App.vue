<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import type { ComponentExposed } from 'vue-component-type-helpers';
import { type NodeItem } from './types';
import AmazingTree from './components/AmazingTree.vue'

const iconUrlMap: Record<string, string> = {
	Program: "files/script/script.png",
	Scene: "files/models/models.png",
	Mesh: "files/models/cube.png",
	LineSegments: "files/models/cube.png",
	Sky: "files/lights/sky.png",
	Text: "files/text/text.png",
	TextGeometry: "files/text/textmesh.png",
	AmbientLight: 'files/lights/ambient.png',
	DirectionalLight: 'files/lights/directional.png',
	HemisphereLight: 'files/lights/hemisphere.png',
	PointLight: 'files/lights/point.png',
	SpotLight: 'files/lights/spot.png',
	RectAreaLight: 'files/lights/rectarea.png',
	RectAreaLightHelper: 'files/lights/rectarea.png',
	PerspectiveCamera: 'files/camera/prespective.png',
	OrthographicCamera: 'files/camera/orthographic.png',
	JavaScript: 'files/script/javascript.png',
	Group: "files/misc/container.png",
	Object3D: "files/misc/container.png",
	OrbitControls: 'files/misc/orbit.png',
	FirstPersonControls: 'files/misc/crosshair.png',
	WebGLRenderer: 'files/misc/particles.png',
	Sprite: 'files/misc/sprite.png',
	Bone: "files/misc/bone.png",
	SkinnedMesh: "files/misc/skinnedmesh.png",
	Line: "files/models/spline.png",
	Curve3: "files/models/spline.png",
	Tube: "files/models/tube.png",
	Shape: "files/models/shape1.png",
  Sweep: "files/models/sweep.png",
  Water1: "files/water/water1.png",
  Water2: "files/water/water2.png",
}

const data = ref<NodeItem[]>([])
const boxW = ref(300)
const boxH = ref(600)
const filterName = ref("")

onMounted(async () => {
  try {
    const resp = await fetch('/data.json')
    const json = await resp.json()
    data.value = Array.isArray(json) ? json : []
    setTimeout(() => {
      data.value[0]?.children?.shift()
    }, 20000)
  } catch (e) {
    console.error('failed to load data.json', e)
  }
})

function onClick(n: NodeItem) {
  console.log('node-click', n)
}
function onContext(n: NodeItem, ev: MouseEvent) {
  console.log('node-contextmenu', ev, n)
}
function onDrop(drag: NodeItem, target: NodeItem, type: 'prev' | 'next' | 'inner') {
  console.log('node-drop', { drag, target, type })
}

const getObjectIcon = (node: NodeItem) => {
	if (node.type === "Sprite" && node.userData._isDefaultCamera) return iconUrlMap["PerspectiveCamera"]
	if (node.type === "Mesh" && node.userData._isSky) return iconUrlMap["Sky"]
	if (node.type === "Mesh" && node.userData?._isTube) return iconUrlMap["Tube"]
	if (node.type === "Line" && node.userData?._isShape) return iconUrlMap["Shape"]
  if (node.type === "Mesh" && node.userData?._isSweep) return iconUrlMap["Sweep"]
  if (node.type === "Mesh" && node.userData?._waterType && node.userData._waterType === "Water1") return iconUrlMap["Water1"]
  if (node.type === "Mesh" && node.userData?._waterType && node.userData._waterType === "Water2") return iconUrlMap["Water2"]
	return iconUrlMap[node.type]
}

const treeRef = useTemplateRef<ComponentExposed<typeof AmazingTree>>("treeRef")

type NodeKeyType = string | number | null

const initNodeKey = ref<string>("a2f64cdf-bb20-4fab-8b1c-40ef48e60727")
const currentNodeKey = ref<NodeKeyType>(null)
const nodeKey = ref<NodeKeyType>(null)
const sctNodeKey = ref<NodeKeyType>(null)

function getCurrNodeKey () {
  currentNodeKey.value = treeRef.value?.getCurrentKey() as string || ""
}
function setCurrNodeKey () {
  treeRef.value?.setCurrentKey(nodeKey.value)
}
function scrollToNode () {
  treeRef.value?.setCurrentKey(sctNodeKey.value)
}
const allowDrop = (dragNode: NodeItem, dropNode: NodeItem, type: 'prev' | 'next' | 'inner') => {
	// 树节点拖拽控制，禁止拖拽的逻辑加到下面
	if (dragNode.userData?._sceneUUID !== dropNode.userData?._sceneUUID) {
		return false // 不允许跨scene 节点拖拽
	}	// type: inner, prev, next
	if (dropNode.type === "Program" && dragNode.type !== "Scene") {
		return false // 非Scene节点不允许拖到Program节点下
	}
	if (dragNode.type === "Scene" && dropNode.type !== "Program") {
		return false // Scene节点不允许Program以外的任何节点下
	}
	if (dragNode.type !== "Scene" && dropNode.type === "Scene" && ["prev", "next"].includes(type)) {
		return false // 非Scene节点不允许拖到Scene节点的前后
	}
	if (dropNode.type === "Line") return false // 线节点不允许drop
	if (dragNode.userData?._isLineGroup) return false // 断开线组节点不允许drop
	if (dragNode.userData?._isTube) return false // 管道节点不允许drop
	if (dragNode.userData?._isTubeGroup) return false // 管道组节点不允许drop
	if (dragNode.userData?._isSweep) return false // 扫描节点不允许drop
	if (dragNode.userData?._isSweepGroup) return false // 扫描组节点不允许drop
	if (dragNode.userData?._isShape) return false // 形状节点不允许drop
	if (dragNode.userData?._isWall) return false // 墙体节点不允许drop
	if (dragNode.userData?._isWallGroup) return false // 墙体组节点不允许drop
	return true
}

const handleChange = (node: NodeItem) => {
  console.log("节点变化", node);
}

const filterNode = () => {
  treeRef.value?.filter(filterName.value)
}

const filterMethod = (value: any, node: NodeItem) => {
  return node.name.includes(value)
}
</script>

<template>
  <div style="padding: 12px;">
    <div class="form-item">
      <input type="text" v-model="filterName" style="flex: 1;" @input="filterNode" /><button @click="filterNode">筛选节点</button>
    </div>
    <div class="tree-wrapper" :style="{ width: boxW + 'px', height: boxH + 'px' }">
      <!-- @vue-generic {import('@/types').NodeItem} -->
      <AmazingTree
        :data="data"
        :props="{ value: 'uuid', label: 'name', children: 'children' }"
        :current-node-key="initNodeKey"
        :allow-drop="allowDrop"
        :default-expanded-keys="['e3eeb6b1-7e72-432f-b342-77d32fb24fe1']"
        :default-expand-all="false"
        :draggable="true"
        :show-checkbox="true"
        :check-strictly="true"
        :disabled-checked="() => true"
        :filter-node-method="filterMethod"
        empty-text="没有余粮"
        height="100%"
        @node-click="onClick"
        @node-contextmenu="onContext"
        @node-drop="onDrop"
        @current-change="handleChange"
        ref="treeRef"
      >
        <template #default="{ node }">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="tree-node-icon">
              <img class="icon-image" :src="getObjectIcon(node)" />
            </div>
            <span style="font-weight: 500;">{{ node.name }}</span>
          </div>
        </template>
        <template #empty>
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg class="SVG DisBlock" width="64" height="41" viewBox="0 0 64 41">
              <g transform="translate(0 1)" fill="none" fill-rule="evenodd">
                <ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5"></ellipse>
                <g stroke="#d9d9d9">
                  <path d="M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z"></path>
                  <path fill="#fafafa" d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z"></path>
                </g>
              </g>
            </svg>
            <span style="font-weight: 500;">无节点</span>
          </div>
        </template>
      </AmazingTree>
    </div>
    <div class="form-item">
      <button @click="getCurrNodeKey">获取当前节点ID：</button><span>{{ currentNodeKey }}</span>
    </div>
    <div class="form-item">
      <input type="text" v-model="nodeKey" style="flex: 1;"><button @click="setCurrNodeKey">设置当前节点：</button>
    </div>
    <div class="form-item">
      <input type="text" v-model="sctNodeKey" style="flex: 1;"><button @click="scrollToNode">滚动到节点：</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tree-wrapper {
  border: 1px solid #dcdfe6;
  resize: both;
  overflow: hidden;
  margin: 0 auto;

  .tree-node-icon {
    width: 26px;
    height: 26px;
    padding: 4px;

    .icon-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }
}

.form-item {
  display: flex;
  width: 500px;
  margin: 0 auto;
  margin-top: 10px;
  margin-bottom: 10px;  
}
</style>
