/**
 * FR-INFRA-GATE-WAIVER — l'alarme graduée, telle que l'utilisateur la voit.
 *
 * Tests négatifs d'abord (NFR-TEST-BEHAVIORAL) : on ne passe pas tant qu'une
 * réponse manque, une raison trop courte laisse le bouton grisé, et un défaut
 * ⛔ ne se déroge jamais.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import type { GateEvaluation, GateIssue } from '@shared/verifiers/gate.js'

const mockApiPost = vi.fn()
vi.mock('@/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
}))
vi.mock('@/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { useGateAlarmStore } = await import('@/stores/ui/gate-alarm.store')
const GateAlarm = (await import('@/components/shared/GateAlarm.vue')).default

const attention: GateIssue = { rule: 'captain-autocomplete-empty', level: 'attention', message: 'Google ne suggère rien.' }
const risque: GateIssue = {
  rule: 'captain-volume-unknown',
  level: 'risque',
  message: 'Volume de recherche inconnu.',
  risk: 'Personne ne cherche peut-être ce mot-clé.',
  alternatives: ['agence web toulouse (320/mois)'],
}
const technique: GateIssue = { rule: 'content-empty', level: 'technique', message: 'L’article est vide.' }

function evaluation(blocking: GateIssue[], passed = false): GateEvaluation {
  return { gateId: 'captain-lock', passed, inputHash: 'h1', issues: blocking, blocking, waived: [] }
}

function openAlarm(blocking: GateIssue[]) {
  const store = useGateAlarmStore()
  const decision = store.open(7, 'captain-lock', evaluation(blocking), { keyword: 'plombier' })
  return { store, decision }
}

describe('GateAlarm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('reste invisible tant qu’aucune porte ne refuse', () => {
    const wrapper = mount(GateAlarm)
    expect(wrapper.find('[data-testid="gate-alarm"]').exists()).toBe(false)
  })

  it('montre le risque et les alternatives d’un point 🔴', async () => {
    openAlarm([risque])
    const wrapper = mount(GateAlarm)
    await flushPromises()
    const issue = wrapper.get('[data-rule="captain-volume-unknown"]')
    expect(issue.attributes('data-level')).toBe('risque')
    expect(issue.text()).toContain('Personne ne cherche peut-être ce mot-clé.')
    expect(issue.text()).toContain('agence web toulouse (320/mois)')
    expect(wrapper.get('[data-testid="gate-alarm"]').text()).toContain('Avant de verrouiller le capitaine')
  })

  it('🔴 le bouton reste grisé tant que la raison fait moins de 20 caractères', async () => {
    openAlarm([risque])
    const wrapper = mount(GateAlarm)
    await flushPromises()
    const accept = wrapper.get('[data-testid="gate-accept"]')
    expect(accept.attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="gate-category"]').setValue('longue-traine')
    await wrapper.get('[data-testid="gate-reason"]').setValue('trop court')
    expect(wrapper.get('[data-testid="gate-reason-counter"]').text()).toBe('10 / 20')
    expect(accept.attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="gate-reason"]').setValue('Demandes réelles reçues au téléphone')
    expect(accept.attributes('disabled')).toBeUndefined()
  })

  it('🟠 une case « J’ai lu » suffit', async () => {
    openAlarm([attention])
    const wrapper = mount(GateAlarm)
    await flushPromises()
    const accept = wrapper.get('[data-testid="gate-accept"]')
    expect(accept.text()).toBe('J’ai lu, je continue')
    expect(accept.attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="gate-ack"]').setValue(true)
    expect(accept.attributes('disabled')).toBeUndefined()
  })

  it('⛔ aucun champ de dérogation, et le bouton ne s’active jamais', async () => {
    openAlarm([technique, attention])
    const wrapper = mount(GateAlarm)
    await flushPromises()
    const issue = wrapper.get('[data-rule="content-empty"]')
    expect(issue.find('[data-testid="gate-reason"]').exists()).toBe(false)
    expect(issue.find('[data-testid="gate-ack"]').exists()).toBe(false)
    await wrapper.get('[data-testid="gate-ack"]').setValue(true)
    const accept = wrapper.get('[data-testid="gate-accept"]')
    expect(accept.text()).toBe('Correction nécessaire')
    expect(accept.attributes('disabled')).toBeDefined()
  })

  it('envoie les dérogations et se ferme quand le serveur laisse passer', async () => {
    mockApiPost.mockResolvedValueOnce({ evaluation: evaluation([], true), refused: [] })
    const { decision } = openAlarm([attention, risque])
    const wrapper = mount(GateAlarm)
    await flushPromises()
    await wrapper.get('[data-testid="gate-ack"]').setValue(true)
    await wrapper.get('[data-testid="gate-category"]').setValue('donnee-manquante')
    await wrapper.get('[data-testid="gate-reason"]').setValue('  Le client reçoit ces demandes chaque semaine  ')
    await wrapper.get('[data-testid="gate-accept"]').trigger('click')
    await flushPromises()

    expect(mockApiPost).toHaveBeenCalledWith('/articles/7/gates/captain-lock/waivers', {
      keyword: 'plombier',
      waivers: [
        { rule: attention.rule },
        { rule: risque.rule, category: 'donnee-manquante', reason: 'Le client reçoit ces demandes chaque semaine' },
      ],
    })
    await expect(decision).resolves.toBe(true)
    expect(wrapper.find('[data-testid="gate-alarm"]').exists()).toBe(false)
  })

  it('« Revenir corriger » ferme l’alarme sans rien enregistrer', async () => {
    const { decision } = openAlarm([risque])
    const wrapper = mount(GateAlarm)
    await flushPromises()
    await wrapper.get('[data-testid="gate-cancel"]').trigger('click')
    await expect(decision).resolves.toBe(false)
    expect(mockApiPost).not.toHaveBeenCalled()
  })

  it('un clic sur le fond ne ferme pas l’alarme : une raison en cours de saisie ne se perd pas', async () => {
    const { store } = openAlarm([risque])
    const wrapper = mount(GateAlarm)
    await flushPromises()
    await wrapper.get('[data-testid="gate-reason"]').setValue('Une raison déjà bien entamée')
    await wrapper.get('[data-testid="gate-alarm"]').trigger('click')
    expect(store.current).not.toBeNull()
    expect((wrapper.get('[data-testid="gate-reason"]').element as HTMLTextAreaElement).value).toBe('Une raison déjà bien entamée')
  })

  it('Échap revient corriger ; chaque champ est nommé d’après son alerte', async () => {
    const { decision } = openAlarm([risque])
    const wrapper = mount(GateAlarm)
    await flushPromises()
    expect(wrapper.get('[data-testid="gate-reason"]').attributes('aria-label')).toContain('Volume de recherche inconnu.')
    expect(wrapper.get('[data-testid="gate-category"]').attributes('aria-label')).toContain('Volume de recherche inconnu.')
    await wrapper.get('[role="alertdialog"]').trigger('keydown', { key: 'Escape' })
    await expect(decision).resolves.toBe(false)
  })

  it('affiche le motif quand le serveur refuse une dérogation', async () => {
    mockApiPost.mockResolvedValueOnce({
      evaluation: evaluation([risque]),
      refused: [{ rule: risque.rule, problem: 'Cette alerte n’existe plus : les données ont changé, relancez la vérification.' }],
    })
    openAlarm([risque])
    const wrapper = mount(GateAlarm)
    await flushPromises()
    await wrapper.get('[data-testid="gate-category"]').setValue('autre')
    await wrapper.get('[data-testid="gate-reason"]').setValue('Une raison suffisamment détaillée')
    await wrapper.get('[data-testid="gate-accept"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="gate-refused"]').text()).toContain('les données ont changé')
    expect(wrapper.find('[data-testid="gate-alarm"]').exists()).toBe(true)
  })
})
