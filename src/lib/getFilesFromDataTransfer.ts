/** Collect all files from a DataTransfer (files and recursive directory contents). */
export async function getFilesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
  const files: File[] = []
  const items = dataTransfer.items
  if (!items) {
    const dtFiles = dataTransfer.files
    if (dtFiles) for (let i = 0; i < dtFiles.length; i++) files.push(dtFiles[i])
    return files
  }

  const getEntry = (item: DataTransferItem): FileSystemEntry | null =>
    (item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null }).webkitGetAsEntry?.() ?? null

  // Read all entries synchronously before any await (DataTransfer can be cleared after drop).
  const entries: { entry: FileSystemEntry; file?: File }[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const entry = getEntry(item)
    if (entry) {
      if (entry.isFile) {
        const file = item.getAsFile()
        if (file) entries.push({ entry, file })
        else entries.push({ entry })
      } else {
        entries.push({ entry })
      }
    } else {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }

  async function collectFromEntry(entry: FileSystemEntry, path = ''): Promise<void> {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject)
      })
      // webkitRelativePath is read-only on File; wrap in Proxy so upload code can read the path.
      // Bind methods to target to avoid "Illegal invocation" when FormData/fetch call file.slice() etc.
      const relativePath = path ? `${path}/${file.name}` : file.name
      const fileWithPath = new Proxy(file, {
        get(target, prop) {
          if (prop === 'webkitRelativePath') return relativePath
          const value = Reflect.get(target, prop)
          if (typeof value === 'function') return value.bind(target)
          return value
        },
      }) as File
      files.push(fileWithPath)
      return
    }
    if (entry.isDirectory) {
      const dir = entry as FileSystemDirectoryEntry
      const reader = dir.createReader()
      const base = path ? `${path}/${dir.name}` : dir.name
      let batch: FileSystemEntry[]
      do {
        batch = await new Promise((resolve, reject) => {
          reader.readEntries(resolve, reject)
        })
        for (const e of batch) await collectFromEntry(e, base)
      } while (batch.length > 0)
    }
  }

  for (const { entry, file } of entries) {
    if (entry.isDirectory) {
      await collectFromEntry(entry)
    } else if (file) {
      files.push(file)
    } else {
      await collectFromEntry(entry)
    }
  }

  // Fallback: some environments expose dropped folder files in dataTransfer.files
  if (files.length === 0 && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) files.push(dataTransfer.files[i])
  }
  return files
}
