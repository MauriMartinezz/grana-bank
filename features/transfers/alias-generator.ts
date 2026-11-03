import { randomInt } from "node:crypto";

/**
 * Short Spanish words without accents or ñ, so every combination fits the
 * alias rule (features/transfers/alias.ts). The migration
 * 20261103200000_pronounceable_aliases holds the same list for existing rows.
 */
export const ALIAS_WORDS = [
  "mate", "tango", "lluvia", "faro", "nube", "rio", "sol", "luna", "cielo", "mar",
  "pampa", "ceibo", "hornero", "puerto", "campo", "fuego", "viento", "roble", "sauce", "trigo",
  "arena", "piedra", "lago", "bosque", "flor", "gato", "perro", "oso", "lobo", "zorro",
  "tigre", "puma", "condor", "delta", "isla", "monte", "valle", "playa", "ola", "coral",
  "miel", "pan", "cafe", "vino", "queso", "uva", "pera", "limon", "mango", "coco",
  "lapiz", "papel", "libro", "mesa", "silla", "barco", "tren", "globo", "cometa", "faro",
  "nieve", "brisa", "trueno", "rayo", "aurora", "ocaso", "jardin", "patio", "balcon", "techo",
  "guitarra", "bombo", "piano", "violin", "flauta", "canto", "baile", "ronda", "plaza", "barrio",
].filter((word, index, all) => all.indexOf(word) === index);

/**
 * A random default alias of three words, e.g. "mate.lluvia.faro". It is easy
 * to read aloud and share, unlike a random code. Uniqueness is checked by the
 * caller against the database.
 */
export function generateAlias(pick: (size: number) => number = randomInt) {
  return Array.from({ length: 3 }, () => ALIAS_WORDS[pick(ALIAS_WORDS.length)]).join(".");
}
