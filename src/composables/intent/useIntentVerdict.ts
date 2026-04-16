import { computed } from 'vue'
import { useIntentStore } from '@/stores/intent.store'

export interface VerdictItem {
  priority: number
  icon: string
  label: string
  description: string
  type: 'gbp' | 'paa' | 'content' | 'video' | 'opportunity'
}

export function useIntentVerdict() {
  const intentStore = useIntentStore()

  const verdicts = computed<VerdictItem[]>(() => {
    if (!intentStore.intentData) return []

    const items: VerdictItem[] = []
    const modules = intentStore.intentData.modules

    const hasLocalPack = modules.some(m => m.type === 'local_pack' && m.present)
    const hasPaa = modules.some(m => m.type === 'people_also_ask' && m.present)
    const hasVideo = modules.some(m => m.type === 'video' && m.present)
    const hasFeaturedSnippet = modules.some(m => m.type === 'featured_snippet' && m.present)
    const hasNoSpecialModules = modules.every(m => !m.present)

    if (hasLocalPack) {
      items.push({
        priority: 1,
        icon: '\uD83D\uDCCD',
        label: 'Optimiser Google Business Profile',
        description: 'Un Local Pack est present : optimisez votre fiche GBP avant de rediger du contenu.',
        type: 'gbp',
      })
    }

    if (hasPaa) {
      items.push({
        priority: 2,
        icon: '\u2753',
        label: 'Structurer autour des questions PAA',
        description: `${intentStore.paaQuestions.length} question(s) PAA detectee(s). Utilisez-les comme H2 ou section FAQ.`,
        type: 'paa',
      })
    }

    if (hasFeaturedSnippet) {
      items.push({
        priority: 3,
        icon: '\u2B50',
        label: 'Viser la position zero',
        description: 'Un Featured Snippet est present : structurez votre contenu pour y apparaitre.',
        type: 'content',
      })
    }

    if (hasVideo) {
      items.push({
        priority: 4,
        icon: '\uD83C\uDFAC',
        label: 'Creer un contenu video',
        description: 'Des resultats video sont presents : envisagez un YouTube Short ou tutoriel.',
        type: 'video',
      })
    }

    if (hasNoSpecialModules) {
      items.push({
        priority: 1,
        icon: '\uD83D\uDE80',
        label: 'Terrain libre pour un article de fond',
        description: 'Aucun module SERP special detecte. C\'est une opportunite pour un article editorial complet.',
        type: 'opportunity',
      })
    }

    return items.sort((a, b) => a.priority - b.priority)
  })

  const topVerdict = computed(() => verdicts.value[0] ?? null)

  return { verdicts, topVerdict }
}
