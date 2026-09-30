/**
 * AUTHORITY: mode effectif et fournisseur d'IA du serveur (store `runtime-mode`,
 *            GET /api/runtime-mode : `effective`, `aiProvider`).
 * READS FROM: useRuntimeModeStore (hydraté et resynchronisé par AppNavbar).
 * WRITES TO: rien.
 * CONSUMERS: CaptainSidePanel, CaptainPanel (confirmation « Régénérer l'avis
 *            expert IA ? … »).
 * RELATED FR: FR-CAP-AI-PANEL, FR-INFRA-RUNTIME-MODE.
 *
 * La phrase de coût d'une régénération, suivie en direct : le fournisseur
 * d'IA du moment en réel, « sans appel payant » en mode simulé.
 */
import { computed, type ComputedRef } from 'vue'
import { useRuntimeModeStore } from '@/stores/ui/runtime-mode.store'
import { paidAiCallNotice } from '@shared/ai-call-notice.js'

export function useAiCallNotice(): ComputedRef<string> {
  const runtimeMode = useRuntimeModeStore()
  return computed(() => paidAiCallNotice(runtimeMode.effective, runtimeMode.aiProvider))
}
