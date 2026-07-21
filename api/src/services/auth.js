import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { getDb } from "../db/index.js";
import { DEFAULT_ROLE, isValidRole } from "../constants/roles.js";

const SALT_ROUNDS = 10;

const USER_SELECT = `
  SELECT
    u.id,
    u.email,
    u.password_hash,
    u.prenom,
    u.nom,
    u.role,
    u.ruche_id,
    u.created_at,
    r.code AS ruche_code,
    r.nom AS ruche_nom,
    r.description AS ruche_description
  FROM users u
  LEFT JOIN ruches r ON r.id = u.ruche_id
`;

function assertRole(role) {
  if (!isValidRole(role)) {
    const err = new Error(`Rôle invalide : ${role}`);
    err.status = 400;
    throw err;
  }
  return role;
}

export function findUserByEmail(email) {
  return getDb()
    .prepare(`${USER_SELECT} WHERE u.email = ? COLLATE NOCASE`)
    .get(email.trim());
}

export function findUserById(id) {
  return getDb()
    .prepare(`${USER_SELECT} WHERE u.id = ?`)
    .get(id);
}

export function createUser({
  email,
  password,
  prenom = null,
  nom = null,
  role = DEFAULT_ROLE,
  ruche_id = null,
}) {
  assertRole(role);
  const password_hash = bcrypt.hashSync(password, SALT_ROUNDS);
  const result = getDb()
    .prepare(
      `INSERT INTO users (email, password_hash, prenom, nom, role, ruche_id)
       VALUES (@email, @password_hash, @prenom, @nom, @role, @ruche_id)`
    )
    .run({
      email: email.trim().toLowerCase(),
      password_hash,
      prenom,
      nom,
      role,
      ruche_id,
    });

  return findUserById(result.lastInsertRowid);
}

export function ensureUser({
  email,
  password,
  prenom = null,
  nom = null,
  role = DEFAULT_ROLE,
  ruche_id = null,
}) {
  assertRole(role);
  const existing = findUserByEmail(email);
  if (existing) {
    const password_hash = bcrypt.hashSync(password, SALT_ROUNDS);
    getDb()
      .prepare(
        `UPDATE users
         SET password_hash = @password_hash,
             prenom = COALESCE(@prenom, prenom),
             nom = COALESCE(@nom, nom),
             role = @role,
             ruche_id = COALESCE(@ruche_id, ruche_id),
             updated_at = datetime('now')
         WHERE id = @id`
      )
      .run({
        id: existing.id,
        password_hash,
        prenom,
        nom,
        role,
        ruche_id,
      });
    return findUserById(existing.id);
  }
  return createUser({ email, password, prenom, nom, role, ruche_id });
}

export function updateUserProfile(userId, { prenom, nom, email, password }) {
  const current = findUserById(userId);
  if (!current) {
    const err = new Error("Utilisateur introuvable.");
    err.status = 404;
    throw err;
  }

  const nextEmail = email != null ? String(email).trim().toLowerCase() : current.email;
  if (!nextEmail || !nextEmail.includes("@")) {
    const err = new Error("Adresse email invalide.");
    err.status = 400;
    throw err;
  }

  if (nextEmail !== current.email.toLowerCase()) {
    const taken = findUserByEmail(nextEmail);
    if (taken && taken.id !== userId) {
      const err = new Error("Cet email est déjà utilisé.");
      err.status = 409;
      throw err;
    }
  }

  const nextPrenom = prenom != null ? String(prenom).trim() || null : current.prenom;
  const nextNom = nom != null ? String(nom).trim() || null : current.nom;

  let password_hash = current.password_hash;
  if (password != null && String(password).length > 0) {
    if (String(password).length < 4) {
      const err = new Error("Le mot de passe doit contenir au moins 4 caractères.");
      err.status = 400;
      throw err;
    }
    password_hash = bcrypt.hashSync(String(password), SALT_ROUNDS);
  }

  getDb()
    .prepare(
      `UPDATE users
       SET email = @email,
           prenom = @prenom,
           nom = @nom,
           password_hash = @password_hash,
           updated_at = datetime('now')
       WHERE id = @id`
    )
    .run({
      id: userId,
      email: nextEmail,
      prenom: nextPrenom,
      nom: nextNom,
      password_hash,
    });

  return findUserById(userId);
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compareSync(password, passwordHash);
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      ruche_id: user.ruche_id ?? null,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

export function toPublicUser(user) {
  if (!user) return null;

  const ruche =
    user.ruche_id != null
      ? {
          id: user.ruche_id,
          code: user.ruche_code,
          nom: user.ruche_nom,
          description: user.ruche_description ?? null,
        }
      : null;

  return {
    id: user.id,
    email: user.email,
    prenom: user.prenom,
    nom: user.nom,
    role: user.role,
    ruche_id: user.ruche_id ?? null,
    ruche,
    created_at: user.created_at,
  };
}
