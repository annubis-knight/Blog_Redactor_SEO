/**
 * AUTHORITY: dérivation d'affichage — `ProposedArticle[]` (stratégie du cocon)
 *            + `capitainesMap` (GET /cocoons/:name/capitaines) → `Article[]`
 * READS FROM: cocoonStrategyStore.proposedArticles, useMoteurArticleSync.capitainesMap
 * CONSUMERS: MoteurView → MoteurContextRecap (barre du haut du Moteur)
 * RELATED FR: FR-MOT-RECAP-LOCK-SYNC
 *
 * Les articles affichés dans la barre du haut du Moteur viennent de la
 * stratégie du cocon, pas de la table `articles`. Il faut donc leur
 * reconstituer les champs d'un `Article`, dont `captainKeywordLocked` : c'est
 * lui qui décide si le mot-clé s'affiche en « suggéré » (pointillés, estompé)
 * ou en « verrouillé ».
 *
 * Ce champ était écrit `null` en dur : un Capitaine verrouillé restait donc
 * affiché comme une simple suggestion, y compris après rechargement. La
 * distinction visuelle ne servait à rien. On lit maintenant `capitainesMap`,
 * déjà rafraîchie à chaque verrouillage et déverrouillage.
 */
import type { Article, ProposedArticle } from '@shared/types/index.js'

/**
 * @param proposed  Articles de la stratégie du cocon.
 * @param capitaines Map `articleId → mot-clé Capitaine verrouillé` (absent = non verrouillé).
 */
export function buildRecapArticles(
  proposed: ProposedArticle[],
  capitaines: Record<number, string>,
): Article[] {
  return proposed.map(p => {
    // Une chaîne vide en base signifie « pas de Capitaine » : on la traite
    // comme une absence, jamais comme un mot-clé verrouillé nommé « ».
    const locked = capitaines[p.dbId]
    return {
      id: p.dbId,
      title: p.title,
      type: p.type,
      slug: p.suggestedSlug,
      topic: null,
      status: 'à rédiger' as const,
      phase: 'proposed' as const,
      completedChecks: [],
      suggestedKeyword: p.suggestedKeyword || null,
      captainKeywordLocked: locked || null,
      painPoint: p.painPoint || null,
      painIntentExpected: p.painIntentExpected,
    }
  })
}
