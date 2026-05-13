---
purpose: 'Suivi des écarts détectés entre le code et la documentation au fil des migrations'
companion: '_bmad-output/planning-artifacts/prd.md, _bmad-output/planning-artifacts/design-registry.md'
lastUpdated: '2026-05-13T00:00:00Z'
---

# Drift code vs doc — liste vivante

> Au fil des migrations de doc, des sous-agents peuvent découvrir des **divergences entre ce que dit la doc et ce que fait réellement le code**. Au lieu d'alourdir le PRD ou le registry avec ces notes en plein chantier, on les consigne ici pour traitement groupé en fin de chantier.

**État au 2026-05-13** : aucun drift ouvert. Les 23 drifts détectés pendant la refonte `docs/prd-split-spec-design` ont tous été soldés ; cf. archive [drift-code-vs-doc-2026-05-13.md](./_archive/drift-code-vs-doc-2026-05-13.md) pour le détail narratif et les décisions associées.

---

## Convention pour les sous-agents

Quand un sous-agent de migration rencontre un écart entre la doc et le code réel, il doit :

1. **Si l'écart est mineur et corrigeable à chaud** (ex : nom de fichier qui a changé) : corriger directement dans le PRD ou le registry, et signaler dans le résumé final.
2. **Si l'écart est structurel ou demande une décision produit** : appender une entrée `DRIFT-NNN` à ce fichier (numéro suivant, en repartant de 1 si nouvelle session), sans modifier le code ni reformuler la FR concernée.
3. **Mentionner toutes les entrées DRIFT créées** dans le résumé final de l'agent, avec un mot sur le groupe (A/B/C/D — cf. archive pour le tri canonique).

### Format d'une entrée

```markdown
## DRIFT-NNN — Titre court

**Source** : section / module qui a déclenché la détection.

**Constat** : ce que dit la doc vs ce que fait le code, avec refs précises (`fichier.ts:42`).

**Impact** : qu'est-ce que ça casse / masque / induit en erreur.

**Action recommandée** : correction doc, décision produit, ou tech-debt à programmer.
```

### Tri en 4 groupes (à appliquer en fin de chantier)

- **Groupe A** — doc obsolète, le code est correct → corriger doc, aucune décision nécessaire.
- **Groupe B** — décision produit à arbitrer avec l'utilisateur (câbler vs retirer).
- **Groupe C** — dette technique, sprint dédié à planifier (lister dans `tech-debt-from-drifts.md` ou équivalent).
- **Groupe D** — déjà tranchés ou assumés, juste à marquer ✅.

---

*(Liste vide ce jour. Premier drift d'une future migration → ajouter ci-dessous en commençant par `DRIFT-001`.)*
