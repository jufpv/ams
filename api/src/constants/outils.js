/** Types de fonctionnement des outils */
export const OUTIL_TYPES = Object.freeze({
  LISTE_ENTREES: "liste_entrees",
  MEMBRES: "membres",
});

export const OUTIL_TYPE_LIST = Object.freeze(Object.values(OUTIL_TYPES));

export const OUTIL_TYPE_LABELS = Object.freeze({
  [OUTIL_TYPES.LISTE_ENTREES]: "Liste d'entrées",
  [OUTIL_TYPES.MEMBRES]: "Membres",
});

export const DEFAULT_OUTIL_TYPE = OUTIL_TYPES.LISTE_ENTREES;

export function isValidOutilType(type) {
  return OUTIL_TYPE_LIST.includes(type);
}

export function normalizeOutilType(type, fallback = DEFAULT_OUTIL_TYPE) {
  const value = String(type || fallback).trim();
  return isValidOutilType(value) ? value : fallback;
}
