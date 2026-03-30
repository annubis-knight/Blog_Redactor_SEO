/**
 * Configuration du système de logs.
 *
 * Ce fichier contrôle le comportement de tous les logs du projet.
 * Modifie-le pour ajuster la verbosité sans toucher au code source.
 */
export const logsConfig = {

  /**
   * Niveau minimum de logs affiché.
   *
   * Les niveaux disponibles (du plus verbeux au plus silencieux) :
   *   "DEBUG" → Tout afficher. Utile pendant le développement pour voir
   *             les valeurs de variables, les entrées/sorties de fonctions.
   *   "INFO"  → Afficher les étapes clés (démarrage, requêtes, résultats).
   *             C'est le bon réglage par défaut pour le développement.
   *   "WARN"  → Afficher uniquement les situations inhabituelles
   *             (retries, fallbacks, valeurs manquantes).
   *   "ERROR" → N'afficher que les erreurs. Utile en production
   *             pour réduire le bruit.
   */
  level: 'DEBUG' as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',

  /**
   * Afficher l'heure dans chaque ligne de log.
   * Utile pour mesurer le temps entre deux opérations.
   * Format : HH:MM:SS.mmm
   */
  showTimestamp: true,

  /**
   * Afficher le nom du fichier et la ligne d'origine du log.
   * Aide à retrouver rapidement d'où vient un message.
   * Exemple : server/index.ts:42
   */
  showFilePath: true,

  /**
   * Ajouter des emojis devant chaque log pour un repérage visuel rapide.
   *   🔍 DEBUG | ✅ INFO | ⚠️ WARN | ❌ ERROR
   * Désactiver si le terminal ne supporte pas bien les emojis.
   */
  emoji: true,
}
