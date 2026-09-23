/**
 * AUTHORITY: PostgreSQL `article_keywords.lexique` TEXT[] (termes verrouillés
 *            par l'utilisateur, source de vérité pour le check workflow
 *            MOTEUR_LEXIQUE_VALIDATED). Pinia store `useArticleKeywordsStore`.
 * READS FROM: useArticleKeywordsStore.keywords.lexique (proxy lecture pour
 *             les computeds isLocked / lockedTerms).
 * WRITES TO: articleKeywordsStore.addLexiqueTerm / removeLexiqueTerm puis
 *            saveDecisions(id) → PUT /articles/:id/keywords (1 par toggle).
 *            Aucun GET /articles/:id/explorations — famille VERROUILLAGE
 *            stricte (FR-LEX-LECTURE-VS-VERROUILLAGE).
 * CONSUMERS: LexiquePanel.vue).
 * RELATED FR: FR-LEX-LECTURE-VS-VERROUILLAGE (AC.LEX-SEP.2, AC.LEX-SEP.3),
 *             FR-LEX-CHECKBOX-LOCK-IMMEDIATE (toggle = lock/unlock immédiat
 *             persistant en DB).
 */
import { computed, type ComputedRef, type Ref } from 'vue'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { log } from '@/utils/logger'

export interface UseLexiqueLockingInput {
  articleId: Ref<number | undefined>
}

export interface UseLexiqueLockingApi {
  lockedTerms: ComputedRef<string[]>
  isLocked: ComputedRef<boolean>
  toggleTerm: (term: string) => void
  lockMany: (terms: string[]) => void
}

export function useLexiqueLocking(input: UseLexiqueLockingInput): UseLexiqueLockingApi {
  const store = useArticleKeywordsStore()

  const lockedTerms = computed<string[]>(() => store.keywords?.lexique ?? [])
  const isLocked = computed<boolean>(() => lockedTerms.value.length > 0)

  /**
   * FR-LEX-CHECKBOX-LOCK-IMMEDIATE — chaque toggle persiste immédiatement
   * en DB via saveDecisions (1 PUT /articles/:id/keywords). Pas de GET
   * /explorations (famille LECTURE séparée).
   */
  function toggleTerm(term: string): void {
    const id = input.articleId.value
    if (!id) {
      log.debug('[useLexiqueLocking] toggleTerm noop — articleId absent')
      return
    }
    if (!store.keywords) {
      store.initEmpty(id)
    }
    if (lockedTerms.value.includes(term)) {
      store.removeLexiqueTerm(term)
    } else {
      store.addLexiqueTerm(term)
    }
    void store.saveDecisions(id)
  }

  /**
   * FR-LEX-PRECHECK-PERSISTE — verrouille d'un coup les termes que l'écran
   * vient de pré-cocher, en un seul enregistrement.
   *
   * Le pré-cochage cochait les cases sans rien écrire : l'écran annonçait
   * « 38 termes sélectionnés » alors que la base n'en connaissait aucun, et
   * l'étape ne se validait jamais. Pour la débloquer il fallait décocher puis
   * recocher un terme — un geste que personne ne devine.
   */
  function lockMany(terms: string[]): void {
    const id = input.articleId.value
    if (!id || terms.length === 0) return
    if (!store.keywords) store.initEmpty(id)

    const deja = new Set(lockedTerms.value)
    const nouveaux = terms.filter(t => !deja.has(t))
    if (nouveaux.length === 0) return

    for (const terme of nouveaux) store.addLexiqueTerm(terme)
    log.debug('[useLexiqueLocking] lockMany', { articleId: id, count: nouveaux.length })
    void store.saveDecisions(id)
  }

  return { lockedTerms, isLocked, toggleTerm, lockMany }
}
