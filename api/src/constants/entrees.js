/** Types de contenu des entrées */
export const ENTREE_TYPES = Object.freeze({
  LIEN: "lien",
  NOTE: "note",
});

export const ENTREE_TYPE_LIST = Object.freeze(Object.values(ENTREE_TYPES));

export const ENTREE_TYPE_LABELS = Object.freeze({
  [ENTREE_TYPES.LIEN]: "Lien externe",
  [ENTREE_TYPES.NOTE]: "Note",
});

export const DEFAULT_ENTREE_TYPE = ENTREE_TYPES.LIEN;

export function isValidEntreeType(type) {
  return ENTREE_TYPE_LIST.includes(type);
}
