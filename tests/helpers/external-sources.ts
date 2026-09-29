/**
 * Sources externes dont un test peut dépendre.
 *
 * DataForSEO : même son bac à sable (gratuit) exige de vrais identifiants.
 * Sans eux — c'est le cas de la CI publique, dont le `.env` porte
 * `DATAFORSEO_LOGIN=test` — il répond 401, et tout test qui mesure un mot-clé
 * échoue pour une raison qui n'est pas un défaut du produit. Ces tests se
 * déclarent alors « ignorés » (NFR-TEST-BEHAVIORAL), jamais « réussis ».
 */
import 'dotenv/config'

export function dataForSeoConfigured(): boolean {
  const login = (process.env.DATAFORSEO_LOGIN ?? '').trim()
  return login !== '' && login !== 'test'
}
