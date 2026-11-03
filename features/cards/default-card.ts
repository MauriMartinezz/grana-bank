/**
 * Each account's default card: the one the user chose, or the oldest card
 * when none is chosen or the chosen one was removed. Pure, so every picker,
 * the Home carousel and the movements agree. Cards come oldest first.
 */

export function defaultCardId(cards: { id: string }[], chosenId: string | null): string | null {
  if (chosenId && cards.some((card) => card.id === chosenId)) return chosenId;
  return cards[0]?.id ?? null;
}

/** The cards with the default one first, the rest in their order. */
export function defaultFirst<T extends { id: string }>(cards: T[], chosenId: string | null): T[] {
  const id = defaultCardId(cards, chosenId);
  return [...cards.filter((card) => card.id === id), ...cards.filter((card) => card.id !== id)];
}
