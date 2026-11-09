import { describe, expect, it } from 'vitest'
import { KEELWISE_WAITLIST_HREF, keelwiseWaitlistHref, pieceCode } from '../src/data/products.js'

describe('código de pieza en el link de la lista de espera', () => {
  it('lee ?c= y lo deja pasar solo si es seguro', () => {
    expect(pieceCode('?c=A')).toBe('A')
    expect(pieceCode('?utm=x&c=reel-3')).toBe('reel-3')
    expect(pieceCode('')).toBe('')
    expect(pieceCode('?c=')).toBe('')
    expect(pieceCode('?c=a b')).toBe('')
    expect(pieceCode('?c=<script>')).toBe('')
    expect(pieceCode('?c=abcdefghijklm')).toBe('')
  })

  it('suma el código al final del mensaje y sin código usa el de siempre', () => {
    expect(keelwiseWaitlistHref('')).toBe(KEELWISE_WAITLIST_HREF)
    const url = new URL(keelwiseWaitlistHref('B'))
    expect(url.searchParams.get('text')).toBe('Hola, quiero anotarme en el acceso anticipado de Keelwise (B)')
  })
})
