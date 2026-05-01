type ParseResult = { text: string; preview: string }

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function parsePDF(url: string): Promise<ParseResult> {
  const pdfParse = (await import('pdf-parse')).default
  const buf = await fetchBuffer(url)
  const data = await pdfParse(buf)
  const text = data.text.trim().slice(0, 3000)
  return { text, preview: `PDF (${data.numpages} páginas)` }
}

async function parseExcel(url: string): Promise<ParseResult> {
  const XLSX = await import('xlsx')
  const buf = await fetchBuffer(url)
  const wb = XLSX.read(buf, { type: 'buffer' })
  const lines: string[] = []
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })
    lines.push(`[Hoja: ${sheetName}]`)
    for (const row of rows.slice(0, 20)) {
      lines.push((row as unknown[]).join(' | '))
    }
    if (rows.length > 20) lines.push(`... (${rows.length - 20} filas más)`)
  }
  const text = lines.join('\n').slice(0, 3000)
  return { text, preview: `Excel (${wb.SheetNames.length} hojas)` }
}

async function parseWord(url: string): Promise<ParseResult> {
  const mammoth = await import('mammoth')
  const buf = await fetchBuffer(url)
  const result = await mammoth.extractRawText({ buffer: buf })
  const text = result.value.trim().slice(0, 3000)
  return { text, preview: 'Word' }
}

async function parseCSV(url: string): Promise<ParseResult> {
  const buf = await fetchBuffer(url)
  const text = buf.toString('utf-8').slice(0, 3000)
  return { text, preview: 'CSV' }
}

async function parseTXT(url: string): Promise<ParseResult> {
  const buf = await fetchBuffer(url)
  const text = buf.toString('utf-8').slice(0, 3000)
  return { text, preview: 'Texto' }
}

export async function parseFile(url: string, filename: string): Promise<string | null> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  try {
    let result: ParseResult
    if (ext === 'pdf') result = await parsePDF(url)
    else if (['xlsx', 'xls', 'ods'].includes(ext)) result = await parseExcel(url)
    else if (['docx', 'doc'].includes(ext)) result = await parseWord(url)
    else if (ext === 'csv') result = await parseCSV(url)
    else if (['txt', 'md', 'json', 'xml', 'html'].includes(ext)) result = await parseTXT(url)
    else return null
    return `[Contenido del archivo ${result.preview}]\n${result.text}`
  } catch {
    return null
  }
}
