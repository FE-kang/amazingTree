import { readFile, writeFile } from 'fs/promises'

async function main() {
  const file = new URL('../public/data.json', import.meta.url)
  const txt = await readFile(file, 'utf8')
  const data = JSON.parse(txt)
  let count = 0

  function traverse(node) {
    if (Array.isArray(node)) {
      for (const item of node) traverse(item)
      return
    }
    if (node && typeof node === 'object') {
      if ('type' in node && 'uuid' in node) {
        node.hasAnim = Math.random() < 0.5
        count++
      }
      for (const k of Object.keys(node)) traverse(node[k])
    }
  }

  traverse(data)
  await writeFile(file, JSON.stringify(data, null, 2))
  console.log('Added hasAnim to nodes:', count)
}

main().catch((e) => {
  console.error('Failed to add hasAnim:', e)
  process.exitCode = 1
})