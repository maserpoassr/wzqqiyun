import Worker from './engine-warpper.worker.js'
import { script } from '@/../node_modules/dynamic-import/dist/import.js'
import { threads, simd, relaxedSimd } from 'wasm-feature-detect'

var callback, engineInstance, supportThreads, dataLoaded

// WASM variant fallback chain (highest priority first)
// Priority: rapfi-multi-simd128 > rapfi-multi > rapfi-single-simd128 > rapfi-single
const WASM_VARIANTS = [
  { name: 'rapfi-multi-simd128', requiresThreads: true, requiresSIMD: true },
  { name: 'rapfi-multi', requiresThreads: true, requiresSIMD: false },
  { name: 'rapfi-single-simd128', requiresThreads: false, requiresSIMD: true },
  { name: 'rapfi-single', requiresThreads: false, requiresSIMD: false },
]

// CDN 地址 - Cloudflare R2（免费出站流量）
// 仅在生产环境使用，本地开发时禁用以避免 CORS 问题
const CHINA_CDN_URL = process.env.NODE_ENV === 'production' ? 'https://cdn.hfive.ggff.net/' : null

// 分块下载配置
const DEFAULT_CHUNK_COUNT = 10 // 默认 10 线程并行下载

// 预下载的数据缓存
let preloadedDataBuffer = null
let preloadedBlobURL = null

/**
 * 分块并行下载文件
 * @param {string} url - 文件 URL
 * @param {number} totalSize - 文件总大小
 * @param {number} chunkCount - 分块数量
 * @param {function} onProgress - 进度回调
 * @returns {Promise<ArrayBuffer>} 完整文件数据
 */
async function downloadInChunks(url, totalSize, chunkCount, onProgress) {
  const chunkSize = Math.ceil(totalSize / chunkCount)
  let loadedBytes = 0

  console.log(`[Engine] Starting ${chunkCount}-thread parallel download (${(totalSize / 1024 / 1024).toFixed(2)} MB)...`)
  console.time('[Engine] Download time')

  // 创建分块下载任务
  const downloadTasks = []
  for (let i = 0; i < chunkCount; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize - 1, totalSize - 1)
    
    const task = fetch(url, {
      headers: { Range: `bytes=${start}-${end}` }
    })
      .then(response => {
        if (!response.ok && response.status !== 206) {
          throw new Error(`Chunk ${i} failed: ${response.status}`)
        }
        return response.arrayBuffer()
      })
      .then(buffer => {
        loadedBytes += buffer.byteLength
        if (onProgress) {
          onProgress(loadedBytes, totalSize)
        }
        return { index: i, buffer }
      })
    
    downloadTasks.push(task)
  }

  // 并行下载所有分块
  const results = await Promise.all(downloadTasks)
  
  // 按顺序合并分块
  results.sort((a, b) => a.index - b.index)
  
  const totalBuffer = new Uint8Array(totalSize)
  let offset = 0
  for (const { buffer } of results) {
    totalBuffer.set(new Uint8Array(buffer), offset)
    offset += buffer.byteLength
  }

  console.timeEnd('[Engine] Download time')
  console.log(`[Engine] Download complete: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
  return totalBuffer.buffer
}

/**
 * 预加载 rapfi.data 文件（分块并行下载）
 * @param {function} onProgress - 进度回调
 * @returns {Promise<void>}
 */
async function preloadRapfiData(onProgress) {
  if (preloadedDataBuffer) {
    console.log('[Engine] rapfi.data already preloaded')
    return
  }

  const url = CHINA_CDN_URL + 'rapfi.data'
  
  try {
    // 第一步：用 HEAD 请求获取准确的文件大小
    const headResponse = await fetch(url, { method: 'HEAD' })
    if (!headResponse.ok) throw new Error('HEAD request failed')
    
    const totalSize = parseInt(headResponse.headers.get('content-length'), 10)
    if (!totalSize || totalSize <= 0) throw new Error('Cannot get file size')
    
    console.log(`[Engine] Detected rapfi.data size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
    
    // 检查是否支持 Range 请求
    const acceptRanges = headResponse.headers.get('accept-ranges')
    if (acceptRanges !== 'bytes') {
      console.warn('[Engine] Server does not support Range requests, falling back to single download')
      const response = await fetch(url)
      preloadedDataBuffer = await response.arrayBuffer()
      if (onProgress) onProgress(totalSize, totalSize)
      return
    }
    
    // 动态调整分块数量
    const chunkCount = totalSize > 50 * 1024 * 1024 ? 16 : DEFAULT_CHUNK_COUNT
    
    preloadedDataBuffer = await downloadInChunks(
      url,
      totalSize,
      chunkCount,
      onProgress
    )
    console.log('[Engine] rapfi.data preloaded successfully')
  } catch (error) {
    console.error('[Engine] Chunked download failed, falling back to single download:', error)
    // 回退到单线程下载
    const response = await fetch(url)
    if (!response.ok) throw error
    preloadedDataBuffer = await response.arrayBuffer()
  }
}

function locateFile(url, engineDirURL) {
  console.log('[Engine] locateFile called with url:', url)
  
  // 所有 rapfi*.data 文件都映射到 rapfi.data
  if (/^rapfi.*\.data$/.test(url)) {
    // 如果已经预加载，直接从内存返回
    if (preloadedDataBuffer) {
      console.log('[Engine] Using preloaded rapfi.data from memory (buffer size:', preloadedDataBuffer.byteLength, 'bytes)')
      if (!preloadedBlobURL) {
        const blob = new Blob([preloadedDataBuffer], { type: 'application/octet-stream' })
        preloadedBlobURL = URL.createObjectURL(blob)
        console.log('[Engine] Created Blob URL:', preloadedBlobURL)
      }
      return preloadedBlobURL
    }
    
    // 预加载失败时，从 CDN 或本地加载 rapfi.data
    if (CHINA_CDN_URL) {
      console.log('[Engine] Loading rapfi.data from China CDN (fallback)')
      return CHINA_CDN_URL + 'rapfi.data'
    }
    
    // 本地加载
    console.log('[Engine] Loading rapfi.data from local')
    return engineDirURL + 'rapfi.data'
  }
  
  // 其他文件从本地加载
  return engineDirURL + url
}

function getWasmMemoryArguments(isShared, maximum_memory_mb = 2048) {
  return {
    initial: 64 * ((1024 * 1024) / 65536), // 64MB
    maximum: maximum_memory_mb * ((1024 * 1024) / 65536),
    shared: isShared,
  }
}

function instantiateSharedWasmMemory() {
  let maximum_memory_mb = 2048
  // Find the maximum memory size that can be allocated
  while (maximum_memory_mb > 512) {
    try {
      const memory = new WebAssembly.Memory(getWasmMemoryArguments(true, maximum_memory_mb))
      memory.grow(1)
      return memory
    } catch (e) {
      maximum_memory_mb /= 2
    }
  }
  return new WebAssembly.Memory(getWasmMemoryArguments(true, maximum_memory_mb))
}

/**
 * Select the best WASM variant based on browser capabilities.
 * Fallback chain: rapfi-multi-simd128 > rapfi-multi > rapfi-single-simd128 > rapfi-single
 * @param {boolean} hasThreads - Browser supports SharedArrayBuffer/threads
 * @param {boolean} hasSIMD - Browser supports SIMD
 * @param {boolean} loadFullEngine - Whether to load full engine with NNUE
 * @returns {Object} Selected variant info { name, useThreads }
 */
function selectWasmVariant(hasThreads, hasSIMD, loadFullEngine) {
  // For full engine, try to use SIMD variants
  // For fallback engine, SIMD variants are not available
  const canUseSIMD = hasSIMD && loadFullEngine

  for (const variant of WASM_VARIANTS) {
    // Check if this variant's requirements are met
    const threadsOk = !variant.requiresThreads || hasThreads
    const simdOk = !variant.requiresSIMD || canUseSIMD

    if (threadsOk && simdOk) {
      console.log(`[Engine] Selected WASM variant: ${variant.name}`)
      return {
        name: variant.name,
        useThreads: variant.requiresThreads && hasThreads,
      }
    }
  }

  // Fallback to single-threaded without SIMD (should always be available)
  console.log('[Engine] Fallback to rapfi-single')
  return { name: 'rapfi-single', useThreads: false }
}

/**
 * Check if a WASM variant file exists by attempting to fetch it
 * @param {string} url - URL to check
 * @returns {Promise<boolean>} True if file exists
 */
async function checkWasmExists(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch (e) {
    return false
  }
}

/**
 * Try to load a WASM variant with fallback support
 * @param {boolean} hasThreads - Browser supports threads
 * @param {boolean} hasSIMD - Browser supports SIMD
 * @param {boolean} loadFullEngine - Whether to load full engine
 * @returns {Promise<Object>} { engineURL, useThreads, variantName }
 */
async function selectAndValidateVariant(hasThreads, hasSIMD, loadFullEngine) {
  const engineDir = loadFullEngine ? '/' : '/fallback/'
  const baseURL = `${process.env.BASE_URL}build${engineDir}`

  // For fallback engine, only non-SIMD variants are available
  const effectiveSIMD = hasSIMD && loadFullEngine

  // Try variants in priority order
  for (const variant of WASM_VARIANTS) {
    const threadsOk = !variant.requiresThreads || hasThreads
    const simdOk = !variant.requiresSIMD || effectiveSIMD

    if (threadsOk && simdOk) {
      const engineURL = `${baseURL}${variant.name}.js`
      const wasmURL = `${baseURL}${variant.name}.wasm`

      // Check if the WASM file exists
      const exists = await checkWasmExists(wasmURL)
      if (exists) {
        console.log(`[Engine] Loading WASM variant: ${variant.name}`)
        return {
          engineURL,
          useThreads: variant.requiresThreads && hasThreads,
          variantName: variant.name,
        }
      } else {
        console.log(`[Engine] Variant ${variant.name} not available, trying next...`)
      }
    }
  }

  // Final fallback - rapfi-single should always exist
  const fallbackURL = `${baseURL}rapfi-single.js`
  console.log('[Engine] Using final fallback: rapfi-single')
  return {
    engineURL: fallbackURL,
    useThreads: false,
    variantName: 'rapfi-single',
  }
}

// Init engine and setup callback function for receiving engine output
async function init(callbackFn_, loadFullEngine) {
  console.log('[Engine] init called with loadFullEngine:', loadFullEngine)
  callback = callbackFn_
  dataLoaded = false

  // Detect browser capabilities first
  supportThreads = await threads()
  const supportSIMD = await simd()
  const supportRelaxedSIMD = supportThreads && (await relaxedSimd())

  console.log('[Engine] Browser capabilities:', {
    threads: supportThreads,
    simd: supportSIMD,
    relaxedSimd: supportRelaxedSIMD,
  })

  // CDN 预加载只对支持线程的浏览器有效（主线程模式）
  // Worker 模式（fallback）有自己的 locateFile，无法使用预加载的 buffer
  if (loadFullEngine && CHINA_CDN_URL && supportThreads) {
    console.log('[Engine] Starting CDN preload for rapfi.data (threads mode)...')
    try {
      await preloadRapfiData((loaded, total) => {
        callback({
          loading: {
            progress: loaded / total,
            loadedBytes: loaded,
            totalBytes: total,
          },
        })
      })
      console.log('[Engine] CDN preload completed, preloadedDataBuffer:', preloadedDataBuffer ? 'OK' : 'NULL')
    } catch (error) {
      console.error('[Engine] CDN preload failed, will load from local:', error)
      preloadedDataBuffer = null
    }
  } else {
    console.log('[Engine] Skipping CDN preload - loadFullEngine:', loadFullEngine, 'CHINA_CDN_URL:', CHINA_CDN_URL, 'supportThreads:', supportThreads)
  }

  console.log('[Engine] Browser capabilities:', {
    threads: supportThreads,
    simd: supportSIMD,
    relaxedSimd: supportRelaxedSIMD,
  })

  // Select and validate WASM variant with fallback chain
  const { engineURL, useThreads, variantName } = await selectAndValidateVariant(
    supportThreads,
    supportSIMD,
    loadFullEngine
  )

  // Add relaxed SIMD suffix if supported and using SIMD variant
  let finalEngineURL = engineURL
  if (supportRelaxedSIMD && loadFullEngine && variantName.includes('simd128')) {
    const relaxedURL = engineURL.replace('.js', '-relaxed.js')
    const relaxedWasmURL = relaxedURL.replace('.js', '.wasm')
    if (await checkWasmExists(relaxedWasmURL)) {
      finalEngineURL = relaxedURL
      console.log('[Engine] Using relaxed SIMD variant')
    }
  }

  console.log(`[Engine] Final engine URL: ${finalEngineURL}`)

  if (useThreads) {
    try {
      console.log('[Engine] Loading engine script...')
      await script.import(/* webpackIgnore: true */ finalEngineURL)
      console.log('[Engine] Engine script loaded, initializing Rapfi...')

      const engineDirURL = finalEngineURL.substring(0, finalEngineURL.lastIndexOf('/') + 1)

      engineInstance = await self['Rapfi']({
        locateFile: (url) => locateFile(url, engineDirURL),
        onReceiveStdout: (o) => onEngineStdout(o),
        onReceiveStderr: (o) => onEngineStderr(o),
        onExit: (c) => onEngineExit(c),
        setStatus: (s) => onEngineStatus(s),
        wasmMemory: instantiateSharedWasmMemory(),
      })
      console.log('[Engine] Rapfi initialized successfully')
      dataLoaded = true
      callback({ ok: true })
    } catch (error) {
      console.error('[Engine] Failed to load engine with threads:', error)
      // 回退到 Worker 模式
      console.log('[Engine] Falling back to Worker mode...')
      supportThreads = false
      engineInstance = new Worker()

      engineInstance.onmessage = (e) => {
        const { type, data } = e.data
        if (type === 'stdout') onEngineStdout(data)
        else if (type === 'stderr') onEngineStderr(data)
        else if (type === 'exit') onEngineExit(data)
        else if (type === 'status') onEngineStatus(data)
        else if (type === 'ready') (dataLoaded = true), callback({ ok: true })
        else console.error('received unknown message from worker: ', e.data)
      }

      engineInstance.onerror = (err) => {
        console.error('worker error: ' + err.message + '\nretrying after 0.5s...')
        engineInstance.terminate()
        setTimeout(() => init(callback), 500)
      }

      // 使用 fallback 引擎
      const fallbackURL = `${process.env.BASE_URL}build/fallback/rapfi-single.js`
      engineInstance.postMessage({
        type: 'engineScriptURL',
        data: {
          engineURL: fallbackURL,
          memoryArgs: getWasmMemoryArguments(false),
        },
      })
    }
  } else {
    engineInstance = new Worker()

    engineInstance.onmessage = (e) => {
      const { type, data } = e.data
      if (type === 'stdout') onEngineStdout(data)
      else if (type === 'stderr') onEngineStderr(data)
      else if (type === 'exit') onEngineExit(data)
      else if (type === 'status') onEngineStatus(data)
      else if (type === 'ready') (dataLoaded = true), callback({ ok: true })
      else console.error('received unknown message from worker: ', e.data)
    }

    engineInstance.onerror = (err) => {
      console.error('worker error: ' + err.message + '\nretrying after 0.5s...')
      engineInstance.terminate()
      setTimeout(() => init(callback), 500)
    }

    engineInstance.postMessage({
      type: 'engineScriptURL',
      data: {
        engineURL: finalEngineURL,
        memoryArgs: getWasmMemoryArguments(false),
      },
    })
  }

  return finalEngineURL
}

// Stop current engine's thinking process
// Returns true if force stoped, otherwise returns false
function stopThinking() {
  if (supportThreads) {
    sendCommand('YXSTOP')
    return false
  } else {
    engineInstance.terminate()
    init(callback) // Use previous callback function
    return true
  }
}

// Send a command to engine
function sendCommand(cmd) {
  if (typeof cmd !== 'string' || cmd.length == 0) return

  if (supportThreads) engineInstance.sendCommand(cmd)
  else engineInstance.postMessage({ type: 'command', data: cmd })
}

// process output from engine and call callback function
function onEngineStdout(output) {
  let i = output.indexOf(' ')

  if (i == -1) {
    if (output == 'OK') return
    else if (output == 'SWAP') callback({ swap: true })
    else {
      const coord = output.split(',')
      callback({ pos: [+coord[0], +coord[1]] })
    }
    return
  }

  let head = output.substring(0, i)
  let tail = output.substring(i + 1)

  if (head == 'MESSAGE') {
    if (tail.startsWith('REALTIME')) {
      let r = tail.split(' ')
      if (r.length < 3) {
        callback({
          realtime: {
            type: r[1],
          },
        })
      } else {
        let coord = r[2].split(',')
        callback({
          realtime: {
            type: r[1],
            pos: [+coord[0], +coord[1]],
          },
        })
      }
    } else {
      callback({ msg: tail })
    }
  } else if (head == 'INFO') {
    i = tail.indexOf(' ')
    head = tail.substring(0, i)
    tail = tail.substring(i + 1)

    if (head == 'PV') callback({ multipv: tail })
    else if (head == 'NUMPV') callback({ numpv: +tail })
    else if (head == 'DEPTH') callback({ depth: +tail })
    else if (head == 'SELDEPTH') callback({ seldepth: +tail })
    else if (head == 'NODES') callback({ nodes: +tail })
    else if (head == 'TOTALNODES') callback({ totalnodes: +tail })
    else if (head == 'TOTALTIME') callback({ totaltime: +tail })
    else if (head == 'SPEED') callback({ speed: +tail })
    else if (head == 'EVAL') callback({ eval: tail })
    else if (head == 'WINRATE') callback({ winrate: parseFloat(tail) })
    else if (head == 'BESTLINE')
      callback({ bestline: tail.match(/\d+,\d+/g).map((s) => s.split(',').map(Number)) })
  } else if (head == 'FORBID') {
    callback({
      forbid: (tail.match(/.{4}/g) || []).map((s) => {
        let coord = s.match(/([0-9][0-9])([0-9][0-9])/)
        let x = +coord[1]
        let y = +coord[2]
        return [x, y]
      }),
    })
  } else if (head == 'ERROR') {
    callback({ error: tail })
  } else if (head.indexOf(',') != -1) {
    const coord1 = head.split(',')
    const coord2 = tail.split(',')
    callback({
      pos: [+coord1[0], +coord1[1]],
      pos2: [+coord2[0], +coord2[1]],
    })
  } else {
    callback({ unknown: tail })
  }
}

function onEngineStderr(output) {
  console.error('[Engine Error] ' + output)
}

function onEngineExit(code) {
  console.log('[Engine Exit] ' + code)
}

function onEngineStatus(status) {
  if (dataLoaded) return

  console.log('[Engine] Status:', status)

  if (status === 'Running...' || status === '') {
    dataLoaded = true
    callback({
      loading: {
        progress: 1.0,
      },
    })
    return
  }

  // 匹配 "Downloading data... (12345/67890)" 格式
  const match = status.match(/\((\d+)\/(\d+)\)/)
  if (match) {
    const loadedBytes = parseInt(match[1], 10)
    const totalBytes = parseInt(match[2], 10)
    if (loadedBytes == totalBytes) dataLoaded = true
    callback({
      loading: {
        progress: loadedBytes / totalBytes,
        loadedBytes: loadedBytes,
        totalBytes: totalBytes,
      },
    })
    return
  }

  // 匹配 "Downloading data..." 开始下载
  if (status.includes('Downloading')) {
    callback({
      loading: {
        progress: 0.01, // 显示开始下载
      },
    })
    return
  }

  // 匹配其他状态（如 "Loading..."）
  if (status.includes('Loading') || status.includes('Compiling')) {
    callback({
      loading: {
        progress: 0.95, // 接近完成
      },
    })
  }
}

export { init, sendCommand, stopThinking, selectWasmVariant, WASM_VARIANTS }
