import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock json-storage before importing the service
vi.mock('../../../server/utils/json-storage', () => ({
  readJson: vi.fn(),
  writeJson: vi.fn(),
}))

// Mock dataforseo.service — we only need fetchDataForSeo and slugify
vi.mock('../../../server/services/external/dataforseo.service', () => ({
  fetchDataForSeo: vi.fn(),
  getBaseUrl: vi.fn(() => 'https://sandbox.dataforseo.com/v3'),
  getAuthHeader: vi.fn(() => 'Basic dGVzdDp0ZXN0'),
  slugify: vi.fn((kw: string) =>
    kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  ),
}))

import { readJson, writeJson } from '../../../server/utils/json-storage'
import { fetchDataForSeo } from '../../../server/services/external/dataforseo.service'
import { fetchCommunityDiscussions } from '../../../server/services/intent/community-discussions.service'
import type { CommunitySignal } from '../../../server/services/intent/community-discussions.service'

const mockReadJson = vi.mocked(readJson)
const mockWriteJson = vi.mocked(writeJson)
const mockFetchDfs = vi.mocked(fetchDataForSeo)

beforeEach(() => {
  mockReadJson.mockReset()
  mockWriteJson.mockReset()
  mockFetchDfs.mockReset()
})

// --- Helper: create a SERP advanced result with discussions_and_forums ---
function makeSerpResult(discussions: Array<{ title: string; url: string; domain: string; timestamp: string; votesCount: number }>, serpPosition = 5) {
  return {
    items: [
      { type: 'organic', rank_group: 1, title: 'Organic result', url: 'https://example.com' },
      {
        type: 'discussions_and_forums',
        rank_group: serpPosition,
        items: discussions.map(d => ({
          type: 'discussions_and_forums_element',
          title: d.title,
          url: d.url,
          domain: d.domain,
          timestamp: d.timestamp,
          rating: { votes_count: d.votesCount },
        })),
      },
    ],
  }
}

function makeEmptySerpResult() {
  return {
    items: [
      { type: 'organic', rank_group: 1, title: 'Organic result', url: 'https://example.com' },
    ],
  }
}

describe('community-discussions.service — fetchCommunityDiscussions', () => {
  it('sends 3 SERP query variants for a keyword', async () => {
    mockReadJson.mockRejectedValue(new Error('no cache'))
    mockFetchDfs.mockResolvedValue(makeEmptySerpResult())

    await fetchCommunityDiscussions('fuite chauffe-eau')

    expect(mockFetchDfs).toHaveBeenCalledTimes(3)

    const calls = mockFetchDfs.mock.calls
    const queries = calls.map(c => (c[1] as Array<{ keyword: string }>)[0].keyword)

    expect(queries).toContain('fuite chauffe-eau forum')
    expect(queries).toContain('fuite chauffe-eau avis problème')
    expect(queries).toContain('fuite chauffe-eau retour expérience')
  })

  it('deduplicates discussions by URL', async () => {
    mockReadJson.mockRejectedValue(new Error('no cache'))

    const now = new Date().toISOString()
    const discussions = [
      { title: 'Discussion 1', url: 'https://forum.example.com/thread-1', domain: 'forum.example.com', timestamp: now, votesCount: 10 },
      { title: 'Discussion 2', url: 'https://other.com/post', domain: 'other.com', timestamp: now, votesCount: 5 },
    ]

    // All 3 variants return the same discussions (should be deduplicated)
    mockFetchDfs.mockResolvedValue(makeSerpResult(discussions))

    const result = await fetchCommunityDiscussions('test keyword')

    // Even though 3 calls returned the same 2 discussions each,
    // deduplication should keep only 2
    expect(result.discussionsCount).toBe(2)
    expect(result.topDiscussions).toHaveLength(2)
  })

  it('aggregates CommunitySignal correctly (domains, freshness, votes)', async () => {
    mockReadJson.mockRejectedValue(new Error('no cache'))

    const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 1 month ago
    const discussions1 = [
      { title: 'Disc A', url: 'https://reddit.com/r/test/1', domain: 'reddit.com', timestamp: recentDate, votesCount: 20 },
      { title: 'Disc B', url: 'https://doctissimo.fr/forum/1', domain: 'doctissimo.fr', timestamp: recentDate, votesCount: 10 },
    ]
    const discussions2 = [
      { title: 'Disc C', url: 'https://hardware.fr/forum/1', domain: 'hardware.fr', timestamp: recentDate, votesCount: 30 },
    ]

    // First variant returns discussions1, second returns discussions2, third empty
    mockFetchDfs
      .mockResolvedValueOnce(makeSerpResult(discussions1, 3))
      .mockResolvedValueOnce(makeSerpResult(discussions2, 7))
      .mockResolvedValueOnce(makeEmptySerpResult())

    const result = await fetchCommunityDiscussions('test')

    expect(result.discussionsCount).toBe(3)
    expect(result.uniqueDomains).toHaveLength(3)
    expect(result.uniqueDomains).toContain('reddit.com')
    expect(result.uniqueDomains).toContain('doctissimo.fr')
    expect(result.uniqueDomains).toContain('hardware.fr')
    expect(result.domainDiversity).toBe(3)
    expect(result.avgVotesCount).toBe(20) // (20+10+30)/3 = 20
    expect(result.freshness).toBe('recent') // all ~1 month ago
    expect(result.serpPosition).toBe(3) // first seen position
    // Top discussions sorted by votes desc
    expect(result.topDiscussions[0].votesCount).toBe(30)
    expect(result.topDiscussions[1].votesCount).toBe(20)
  })

  it('returns empty signal on timeout without throwing', async () => {
    mockReadJson.mockRejectedValue(new Error('no cache'))

    // Simulate a timeout by making fetchDataForSeo hang
    mockFetchDfs.mockImplementation(() => new Promise((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), 6000)
    }))

    const result = await fetchCommunityDiscussions('slow keyword')

    expect(result.discussionsCount).toBe(0)
    expect(result.uniqueDomains).toEqual([])
    expect(result.topDiscussions).toEqual([])
  }, 10000)

  it('returns cached signal when cache is fresh (no API call)', async () => {
    const cachedSignal: CommunitySignal = {
      discussionsCount: 5,
      uniqueDomains: ['reddit.com', 'quora.com'],
      domainDiversity: 2,
      avgVotesCount: 15,
      freshness: 'recent',
      serpPosition: 4,
      topDiscussions: [],
    }

    mockReadJson.mockResolvedValue({
      data: cachedSignal,
      cachedAt: new Date().toISOString(), // fresh cache — CacheEntry format
    })

    const result = await fetchCommunityDiscussions('cached keyword')

    expect(result).toEqual(cachedSignal)
    expect(mockFetchDfs).not.toHaveBeenCalled()
  })

  it('returns empty signal when all SERP calls fail', async () => {
    mockReadJson.mockRejectedValue(new Error('no cache'))
    mockFetchDfs.mockRejectedValue(new Error('API down'))

    const result = await fetchCommunityDiscussions('failing keyword')

    expect(result.discussionsCount).toBe(0)
    expect(result.uniqueDomains).toEqual([])
  })
})
