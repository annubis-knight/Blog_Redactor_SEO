import { log } from '../../../utils/logger.js'
import type { SerpResult, PaaQuestion } from '../../../../shared/types/index.js'
import { DEFAULT_LOCATION_CODE, DEFAULT_LANGUAGE_CODE, fetchDataForSeo } from './_client.js'

interface SerpRawResult {
  items: Array<{
    type: string
    rank_group: number
    title: string
    url: string
    description: string
    domain: string
  }>
}

export async function fetchSerp(
  keyword: string,
  locationCode = DEFAULT_LOCATION_CODE,
  languageCode = DEFAULT_LANGUAGE_CODE,
): Promise<SerpResult[]> {
  log.debug(`fetchSerp start`, { keyword, locationCode, languageCode })
  const result = await fetchDataForSeo<SerpRawResult>(
    '/serp/google/organic/live/regular',
    [{ keyword, location_code: locationCode, language_code: languageCode }],
  )

  const items = (result.items ?? [])
    .filter((item) => item.type === 'organic')
    .slice(0, 10)
    .map((item) => ({
      position: item.rank_group,
      title: item.title ?? '',
      url: item.url ?? '',
      description: item.description ?? '',
      domain: item.domain ?? '',
    }))
  log.debug(`fetchSerp done`, { keyword, organicResults: items.length, totalItems: result.items?.length ?? 0 })
  return items
}

interface PaaRawResult {
  items: Array<{
    type: string
    title: string
    expanded_element?: Array<{
      description?: string
    }>
  }>
}

export async function fetchPaa(
  keyword: string,
  locationCode = DEFAULT_LOCATION_CODE,
  languageCode = DEFAULT_LANGUAGE_CODE,
): Promise<PaaQuestion[]> {
  log.debug(`fetchPaa start`, { keyword, locationCode, languageCode })
  const result = await fetchDataForSeo<PaaRawResult>(
    '/serp/google/organic/live/advanced',
    [{ keyword, location_code: locationCode, language_code: languageCode }],
  )

  const questions = (result.items ?? [])
    .filter((item) => item.type === 'people_also_ask')
    .map((item) => ({
      question: item.title ?? '',
      answer: item.expanded_element?.[0]?.description ?? null,
    }))
  log.debug(`fetchPaa done`, { keyword, questionsFound: questions.length })
  return questions
}
