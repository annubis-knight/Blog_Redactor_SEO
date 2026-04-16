/** Propulsite block annotations for outline sections */
export type OutlineAnnotation =
  | 'content-valeur'
  | 'content-reminder'
  | 'sommaire-cliquable'
  | 'answer-capsule'

/** Lifecycle status of an outline section */
export type OutlineSectionStatus = 'suggested' | 'accepted' | 'generated'

/** A single section in the article outline */
export interface OutlineSection {
  id: string
  level: 1 | 2 | 3
  title: string
  annotation?: OutlineAnnotation | null
  status: OutlineSectionStatus
}

/** Generated article outline */
export interface Outline {
  sections: OutlineSection[]
}
