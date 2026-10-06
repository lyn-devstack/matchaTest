/**
 * Carga de bancos desde un enlace (p. ej. un Gist secreto de GitHub), sin descargar archivos al disco.
 * Solo funcionan orígenes que permiten CORS; para los que no, se devuelve un error explicativo.
 */

export type RemoteKind = 'gist' | 'raw' | 'github-file' | 'blocked' | 'url'

export interface RemoteTarget {
  kind: RemoteKind
  /** URL que se va a pedir con fetch */
  fetchUrl: string
  /** Para la API de gists: id del gist */
  gistId?: string
  reason?: string
}

const BLOCKED: [RegExp, string][] = [
  [/(^|\.)drive\.google\.com$|(^|\.)docs\.google\.com$/, 'Google Drive no permite leer archivos desde otras webs. Sube el banco a un Gist secreto de GitHub y pega ese enlace.'],
  [/(^|\.)dropbox\.com$/, 'Dropbox no permite leer archivos desde otras webs. Usa un Gist secreto de GitHub.'],
  [/(^|\.)onedrive\.live\.com$|(^|\.)1drv\.ms$|sharepoint\.com$/, 'OneDrive no permite leer archivos desde otras webs. Usa un Gist secreto de GitHub.'],
]

export function classifyUrl(input: string): RemoteTarget {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    throw new Error('Eso no parece un enlace. Debe empezar por https://')
  }
  if (url.protocol !== 'https:') throw new Error('El enlace debe empezar por https://')
  const host = url.hostname.toLowerCase()

  for (const [re, reason] of BLOCKED) if (re.test(host)) return { kind: 'blocked', fetchUrl: url.href, reason }

  // https://gist.github.com/usuario/<id>  o  https://gist.github.com/<id>
  if (host === 'gist.github.com') {
    const id = url.pathname.split('/').filter(Boolean).pop()?.replace(/\.git$/, '')
    if (!id || !/^[0-9a-f]{20,}$/i.test(id)) throw new Error('No reconozco el identificador del Gist en ese enlace.')
    return { kind: 'gist', gistId: id, fetchUrl: `https://api.github.com/gists/${id}` }
  }
  // Botón «Raw» de un gist o de un repositorio
  if (host === 'gist.githubusercontent.com' || host === 'raw.githubusercontent.com') {
    return { kind: 'raw', fetchUrl: url.href }
  }
  // https://github.com/<owner>/<repo>/blob/<rama>/<ruta>  →  raw
  if (host === 'github.com') {
    const m = url.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/)
    if (m) return { kind: 'github-file', fetchUrl: `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}` }
    throw new Error('Ese enlace de GitHub no apunta a un archivo. Abre el archivo y copia su enlace.')
  }
  return { kind: 'url', fetchUrl: url.href }
}

interface GistFile {
  filename: string
  content?: string
  truncated?: boolean
  raw_url: string
}

const PREFERRED = /\.(json|md|markdown|txt)$/i

export async function fetchBankText(input: string, fetcher: typeof fetch = fetch): Promise<{ text: string; filename: string }> {
  const target = classifyUrl(input)
  if (target.kind === 'blocked') throw new Error(target.reason)

  let res: Response
  try {
    res = await fetcher(target.fetchUrl, { headers: target.kind === 'gist' ? { Accept: 'application/vnd.github+json' } : {} })
  } catch {
    throw new Error('No se pudo descargar: revisa tu conexión o que el sitio permita leer el archivo desde otras webs.')
  }
  if (res.status === 404) throw new Error('No existe ese enlace (o se ha borrado el Gist).')
  if (res.status === 403) throw new Error('GitHub ha limitado las descargas por ahora. Espera unos minutos y vuelve a intentarlo.')
  if (!res.ok) throw new Error(`El servidor respondió con un error (${res.status}).`)

  if (target.kind === 'gist') {
    const gist = (await res.json()) as { files?: Record<string, GistFile> }
    const files = Object.values(gist.files ?? {})
    const file = files.find((f) => PREFERRED.test(f.filename)) ?? files[0]
    if (!file) throw new Error('El Gist está vacío.')
    if (file.content && !file.truncated) return { text: file.content, filename: file.filename }
    // Archivos grandes (>1 MB) llegan truncados por la API: se pide el contenido completo
    const raw = await fetcher(file.raw_url)
    if (!raw.ok) throw new Error(`No se pudo leer el archivo del Gist (${raw.status}).`)
    return { text: await raw.text(), filename: file.filename }
  }

  const filename = decodeURIComponent(new URL(target.fetchUrl).pathname.split('/').pop() || 'banco')
  return { text: await res.text(), filename }
}
