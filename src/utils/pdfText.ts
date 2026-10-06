/**
 * Extrae el texto de un PDF en el propio navegador (pdf.js se carga bajo demanda,
 * así que no penaliza la carga inicial de la app).
 */
export async function extractPdfText(file: File, maxPages = 40): Promise<string> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages: string[] = []
  for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const lines: string[] = []
    let current = ''
    for (const item of content.items) {
      if (!('str' in item)) continue
      current += item.str
      if (item.hasEOL) {
        lines.push(current)
        current = ''
      } else {
        current += ' '
      }
    }
    if (current.trim()) lines.push(current)
    pages.push(lines.join('\n'))
  }
  await doc.destroy()
  return pages.join('\n\n').replace(/[ \t]+/g, ' ')
}

export async function readFileText(file: File): Promise<string> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return extractPdfText(file)
  return file.text()
}
