/**
 * Règle produit U6 : garde anti-pollution UI quand l'utilisateur change d'article
 * en plein milieu d'une requête async (scan Radar, stream IA, validation KPIs).
 *
 * Côté serveur : l'`article_id` est lu depuis le path URL donc la persistance DB
 * est toujours correcte. Côté front en revanche, les stores Pinia sont globaux
 * (singletons non scopés par article). Une réponse tardive peut arriver sur un
 * article désormais "inactif" et écraser l'état du nouvel article courant.
 *
 * Ces helpers permettent aux composants de vérifier si une réponse reçue
 * concerne toujours l'article actuellement sélectionné AVANT d'appliquer
 * des mutations côté store/UI.
 */

/**
 * Retourne true si la réponse concerne bien l'article actuellement sélectionné.
 * Retourne false si l'utilisateur a navigué vers un autre article entre-temps.
 *
 * @param responseArticleId — l'article_id lié à la requête au moment de son envoi
 *   (capturé au début de l'appel, pas au retour).
 * @param currentArticleId — l'article_id actuellement sélectionné dans le store/UI.
 */
export function isResponseForCurrentArticle(
  responseArticleId: number | null | undefined,
  currentArticleId: number | null | undefined,
): boolean {
  if (responseArticleId == null || currentArticleId == null) return false
  return responseArticleId === currentArticleId
}

/**
 * Retourne un objet `{ articleId, signal }` utile pour lancer une requête async
 * dans un composant Moteur. Capture l'article_id au moment T et fournit un signal
 * d'abort à passer au fetch. Usage :
 *
 *   const scope = captureArticleScope(selectedArticle.value.id)
 *   const res = await fetch(url, { signal: scope.signal })
 *   if (!scope.isStillCurrent(selectedArticle.value?.id)) return // pollution
 *
 * Cette API est utilisable en dehors de tout framework (pas d'accès Pinia).
 */
export function captureArticleScope(articleId: number): {
  articleId: number
  controller: AbortController
  signal: AbortSignal
  isStillCurrent: (currentId: number | null | undefined) => boolean
} {
  const controller = new AbortController()
  return {
    articleId,
    controller,
    signal: controller.signal,
    isStillCurrent: (currentId) => isResponseForCurrentArticle(articleId, currentId),
  }
}
