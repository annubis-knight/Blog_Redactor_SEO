# Bench perf — Décomposition `keyword_metrics` (Story D1)

Date : 2026-05-09T15:16:01.671Z
Top-5 keywords avec `serp_raw_json` (les plus lourds en DB).

| Keyword | Before bytes | After bytes | Réduction | Before ms | After ms |
|---|---:|---:|---:|---:|---:|
| `creation site web entreprises Toulouse` | 265 212 | 2 598 | **99%** | 6.1 | 2.3 |
| `creation site web` | 186 768 | 4 723 | **97.5%** | 3.8 | 1.3 |
| `creation site web entreprises` | 173 824 | 4 033 | **97.7%** | 3.7 | 1.3 |
| `plombier toulouse` | 138 805 | 4 184 | **97%** | 2.4 | 1.4 |
| `creation site` | 130 170 | 4 657 | **96.4%** | 3.0 | 1.4 |

**Réduction moyenne payload : 97.5%**

AC.D1.1 : ≥ 80 % attendu sur top-5 keywords avec serp_raw_json rempli — ✅ atteint

AC.D1.2 : le SELECT Capitaine post-C4 n'inclut plus `serp_raw_json` (vérifié par lecture du source — `getKeywordMetrics` n'a plus la colonne dans son SELECT).
