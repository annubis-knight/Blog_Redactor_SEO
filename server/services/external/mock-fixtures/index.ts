/**
 * Mock fixtures registry (2026-04-22).
 *
 * Enregistre toutes les fixtures disponibles pour le provider `mock`.
 * Chaque fixture simule la réponse d'un tool call ou d'un stream IA.
 *
 * L'ordre compte : la première réponse dont le matcher répond est servie. En
 * tête, les réponses reconnues à leur consigne propre, dont la demande embarque
 * un texte saisi ou un article (qui peut citer « radar », « lexique »,
 * « capitaine »…) ; ensuite seulement celles qui se reconnaissent à un mot du
 * message utilisateur (`streams.ts`, `generate.ts`). NFR-COST-AI-MOCK.
 */
import './article-draft.js'
import './cocoon-child.js'
import './enrichment.js'
import './reduce-section.js'
import './auto-meta-priority.js'
import './discovery.js'
import './radar.js'
import './intent.js'
import './content-gap.js'
import './contexte.js'
import './cerveau.js'
import './strategy.js'
import './streams.js'
import './generate.js'
import './long-tail-suggest.js'
import './captain-paa-judge.js'
import './auto-intake.js'
import './auto-placement.js'
