// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockReadFile } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
}))

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>()
  return {
    ...actual,
    readFile: mockReadFile,
  }
})

import { loadPrompt } from '../../../server/utils/prompt-loader'

beforeEach(() => {
  mockReadFile.mockReset()
})

describe('prompt-loader — loadPrompt', () => {
  it('reads the prompt file and returns content', async () => {
    mockReadFile.mockResolvedValueOnce('Hello world')

    const result = await loadPrompt('test-prompt')

    expect(result).toBe('Hello world')
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('test-prompt.md'),
      'utf-8',
    )
  })

  it('replaces {{variable}} placeholders', async () => {
    mockReadFile.mockResolvedValueOnce('Hello {{name}}, you are {{role}}.')

    const result = await loadPrompt('test', { name: 'Alice', role: 'admin' })

    expect(result).toBe('Hello Alice, you are admin.')
  })

  it('replaces all occurrences of the same variable', async () => {
    mockReadFile.mockResolvedValueOnce('{{x}} and {{x}} again')

    const result = await loadPrompt('test', { x: 'foo' })

    expect(result).toBe('foo and foo again')
  })

  it('leaves unmatched placeholders untouched', async () => {
    mockReadFile.mockResolvedValueOnce('{{known}} and {{unknown}}')

    const result = await loadPrompt('test', { known: 'yes' })

    expect(result).toBe('yes and {{unknown}}')
  })

  it('propagates file read errors', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'))

    await expect(loadPrompt('missing')).rejects.toThrow('ENOENT')
  })

  it('loads actions/simplify prompt with variables', async () => {
    mockReadFile.mockResolvedValueOnce(
      'Simplifie : """{{selectedText}}"""\n{{keywordInstruction}}',
    )

    const result = await loadPrompt('actions/simplify', {
      selectedText: 'Un texte complexe.',
      keywordInstruction: 'Mot-clé : SEO',
    })

    expect(result).toBe('Simplifie : """Un texte complexe."""\nMot-clé : SEO')
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('simplify.md'),
      'utf-8',
    )
  })

  it('loads actions/convert-list prompt with variables', async () => {
    mockReadFile.mockResolvedValueOnce(
      'Convertis : """{{selectedText}}"""\n{{keywordInstruction}}',
    )

    const result = await loadPrompt('actions/convert-list', {
      selectedText: 'Paragraphe à convertir.',
      keywordInstruction: '',
    })

    expect(result).toBe('Convertis : """Paragraphe à convertir."""\n')
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('convert-list.md'),
      'utf-8',
    )
  })

  it('loads actions/pme-example prompt with variables', async () => {
    mockReadFile.mockResolvedValueOnce(
      'Exemple PME : """{{selectedText}}"""\n{{keywordInstruction}}',
    )

    const result = await loadPrompt('actions/pme-example', {
      selectedText: 'Le marketing digital permet de toucher une audience large.',
      keywordInstruction: 'Mot-clé : marketing digital',
    })

    expect(result).toBe(
      'Exemple PME : """Le marketing digital permet de toucher une audience large."""\nMot-clé : marketing digital',
    )
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('pme-example.md'),
      'utf-8',
    )
  })

  it('loads actions/keyword-optimize prompt with variables', async () => {
    mockReadFile.mockResolvedValueOnce(
      'Optimise : """{{selectedText}}"""\n{{keywordInstruction}}',
    )

    const result = await loadPrompt('actions/keyword-optimize', {
      selectedText: 'Un paragraphe sans mot-clé.',
      keywordInstruction: 'Mot-clé principal de l\'article : SEO local.',
    })

    expect(result).toBe(
      'Optimise : """Un paragraphe sans mot-clé."""\nMot-clé principal de l\'article : SEO local.',
    )
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('keyword-optimize.md'),
      'utf-8',
    )
  })

  it('loads actions/add-statistic prompt with variables', async () => {
    mockReadFile.mockResolvedValueOnce(
      'Statistique : """{{selectedText}}"""\n{{keywordInstruction}}',
    )

    const result = await loadPrompt('actions/add-statistic', {
      selectedText: 'Les réseaux sociaux sont essentiels.',
      keywordInstruction: '',
    })

    expect(result).toBe('Statistique : """Les réseaux sociaux sont essentiels."""\n')
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('add-statistic.md'),
      'utf-8',
    )
  })

  it('loads actions/answer-capsule prompt with variables', async () => {
    mockReadFile.mockResolvedValueOnce(
      'Capsule : """{{selectedText}}"""\n{{keywordInstruction}}',
    )

    const result = await loadPrompt('actions/answer-capsule', {
      selectedText: 'Un long paragraphe expliquant les bienfaits du SEO local pour les PME.',
      keywordInstruction: 'Mot-clé : SEO local',
    })

    expect(result).toBe(
      'Capsule : """Un long paragraphe expliquant les bienfaits du SEO local pour les PME."""\nMot-clé : SEO local',
    )
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('answer-capsule.md'),
      'utf-8',
    )
  })

  it('loads actions/question-heading prompt with variables', async () => {
    mockReadFile.mockResolvedValueOnce(
      'Question : """{{selectedText}}"""\n{{keywordInstruction}}',
    )

    const result = await loadPrompt('actions/question-heading', {
      selectedText: 'Les avantages du SEO local',
      keywordInstruction: 'Mot-clé : SEO local',
    })

    expect(result).toBe(
      'Question : """Les avantages du SEO local"""\nMot-clé : SEO local',
    )
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('question-heading.md'),
      'utf-8',
    )
  })
})
