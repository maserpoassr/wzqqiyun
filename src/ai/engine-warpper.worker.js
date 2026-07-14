var EngineInstance = null

self.onmessage = function (e) {
  const { type, data } = e.data
  if (type == 'command') {
    EngineInstance.sendCommand(data)
  } else if (type == 'engineScriptURL') {
    const { engineURL, memoryArgs, cdnURL, preloadedData } = data
    const engineDirURL = engineURL.substring(0, engineURL.lastIndexOf('/') + 1)
    self.importScripts(engineURL)

    let dataBlobURL = null
    if (preloadedData) {
      const blob = new Blob([preloadedData], { type: 'application/octet-stream' })
      dataBlobURL = URL.createObjectURL(blob)
    }

    self['Rapfi']({
      locateFile: (url) => {
        if (/^rapfi.*\.data$/.test(url)) {
          if (dataBlobURL) return dataBlobURL
          if (cdnURL) return cdnURL + 'rapfi.data'
          return engineDirURL + 'rapfi.data'
        }
        return engineDirURL + url
      },
      onReceiveStdout: (o) => self.postMessage({ type: 'stdout', data: o }),
      onReceiveStderr: (o) => self.postMessage({ type: 'stderr', data: o }),
      onExit: (c) => self.postMessage({ type: 'exit', data: c }),
      setStatus: (s) => self.postMessage({ type: 'status', data: s }),
      wasmMemory: memoryArgs ? new WebAssembly.Memory(memoryArgs) : undefined,
    }).then((instance) => ((EngineInstance = instance), self.postMessage({ type: 'ready' })))
  } else {
    console.error('worker received unknown payload: ' + e.data) // eslint-disable-line no-console
  }
}
