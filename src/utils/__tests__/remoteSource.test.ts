import { describe, expect, it } from 'vitest'
import { classifyUrl, fetchBankText } from '../remoteSource'

const ID = '0123456789abcdef0123456789abcdef'

describe('classifyUrl', () => {
  it('convierte un enlace de Gist en la API de gists', () => {
    expect(classifyUrl(`https://gist.github.com/lyn-devstack/${ID}`)).toMatchObject({
      kind: 'gist',
      gistId: ID,
      fetchUrl: `https://api.github.com/gists/${ID}`,
    })
    expect(classifyUrl(`https://gist.github.com/${ID}`).gistId).toBe(ID)
  })
  it('acepta enlaces Raw tal cual', () => {
    const raw = `https://gist.githubusercontent.com/lyn-devstack/${ID}/raw/banco.json`
    expect(classifyUrl(raw)).toEqual({ kind: 'raw', fetchUrl: raw })
  })
  it('pasa un archivo de GitHub a su versión raw', () => {
    expect(classifyUrl('https://github.com/a/b/blob/main/bancos/x.json').fetchUrl).toBe(
      'https://raw.githubusercontent.com/a/b/main/bancos/x.json',
    )
  })
  it('avisa de Google Drive en vez de fallar en silencio', () => {
    const t = classifyUrl('https://drive.google.com/file/d/abc/view')
    expect(t.kind).toBe('blocked')
    expect(t.reason).toMatch(/Gist/)
  })
  it('rechaza texto que no es un enlace https', () => {
    expect(() => classifyUrl('hola')).toThrow()
    expect(() => classifyUrl('http://example.com/x.json')).toThrow(/https/)
  })
})

describe('fetchBankText', () => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

  it('lee el contenido de un Gist', async () => {
    const fake = (async () => json({ files: { 'b.json': { filename: 'b.json', content: '[1]', raw_url: 'x' } } })) as typeof fetch
    await expect(fetchBankText(`https://gist.github.com/u/${ID}`, fake)).resolves.toEqual({ text: '[1]', filename: 'b.json' })
  })
  it('descarga el archivo completo si la API lo trunca', async () => {
    const fake = (async (url: string) =>
      url.startsWith('https://api.github.com')
        ? json({ files: { 'b.json': { filename: 'b.json', content: '[', truncated: true, raw_url: 'https://raw/b.json' } } })
        : new Response('[1,2,3]')) as unknown as typeof fetch
    await expect(fetchBankText(`https://gist.github.com/u/${ID}`, fake)).resolves.toEqual({ text: '[1,2,3]', filename: 'b.json' })
  })
  it('explica un 404', async () => {
    const fake = (async () => new Response('', { status: 404 })) as typeof fetch
    await expect(fetchBankText(`https://gist.github.com/u/${ID}`, fake)).rejects.toThrow(/borrado/)
  })
})
