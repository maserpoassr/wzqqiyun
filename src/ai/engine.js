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

function locateFile(url, engineDirURL) {
  // Redirect 'rapfi.*\.data' to 'rapfi.data'
  if (/^rapfi.*\.data$/.test(url)) url = 'rapfi.data'
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
  callback = callbackFn_
  dataLoaded = false

  // Detect browser capabilities
  supportThreads = await threads()
  const supportSIMD = await simd()
  const supportRelaxedSIMD = supportThreads && (await relaxedSimd())

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
    await script.import(/* webpackIgnore: true */ finalEngineURL)

    const engineDirURL = finalEngineURL.substring(0, finalEngineURL.lastIndexOf('/') + 1)

    engineInstance = await self['Rapfi']({
      locateFile: (url) => locateFile(url, engineDirURL),
      onReceiveStdout: (o) => onEngineStdout(o),
      onReceiveStderr: (o) => onEngineStderr(o),
      onExit: (c) => onEngineExit(c),
      setStatus: (s) => onEngineStatus(s),
      wasmMemory: instantiateSharedWasmMemory(),
    })
    dataLoaded = true
    callback({ ok: true })
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

  if (status === 'Running...' || status === '') {
    dataLoaded = true
    callback({
      loading: {
        progress: 1.0,
      },
    })
  }

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
  }
}

export { init, sendCommand, stopThinking, selectWasmVariant, WASM_VARIANTS }
