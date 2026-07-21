/** Rôles des abeilles (utilisateurs) */
export const ROLES = Object.freeze({
  BUTINEUSE: "Butineuse",
  MACONNE: "Maçonne",
  REINE: "Reine",
});

export const ROLE_LIST = Object.freeze(Object.values(ROLES));

export const DEFAULT_ROLE = ROLES.BUTINEUSE;

/** Seule la Reine peut ajouter, modifier et supprimer des outils */
export const OUTILS_MANAGE_ROLES = Object.freeze([ROLES.REINE]);

export function isValidRole(role) {
  return ROLE_LIST.includes(role);
}

export function canManageOutils(role) {
  return OUTILS_MANAGE_ROLES.includes(role);
}

/** Reine ou créateur de l'entrée */
export function canManageEntree(user, entree) {
  if (!user || !entree) return false;
  if (user.role === ROLES.REINE) return true;
  if (entree.created_by == null) return false;
  return Number(entree.created_by) === Number(user.id);
}
