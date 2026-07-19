/** Fabrique le contexte de run initial (état mutable porté par les phases). */

import type { AutoRunConfig, AutoRunContext, InitialInput } from './types.js'

export function createContext(config: AutoRunConfig, input: InitialInput): AutoRunContext {
  return {
    config,
    input,
    cocoonName: input.cocoonName,
    articleId: config.resumeArticleId,
    articleTitle: '',
    pilierKeyword: '',
    articleType: input.articleType,
    painPoint: '',
    strategy: {},
    intake: null,
    treeRender: '',
    placement: null,
    placementOptions: [],
    radarCandidates: [],
    serpPaa: [],
    hnStructure: [],
    hnStructureBrief: '',
    capitaine: null,
    cannibalization: [],
    lieutenants: [],
    lexique: [],
    articleContent: null,
    metaTitle: null,
    metaDescription: null,
    exportPath: null,
    resume: { active: false, skipCerveau: false, skipMoteur: false, skipRedaction: false },
  }
}
