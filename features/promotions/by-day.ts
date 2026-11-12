/** The promotion list grouped by weekday. Pure, so the page only renders. */

/** Singular heading of each weekday, Monday first. */
const DAY_TITLES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export type WeekdayGroup<T> = { weekday: number; title: string; promotions: T[] };

/**
 * Monday to Sunday, each day with the promotions valid on it in the list's
 * order; a promotion of several days shows in each. Only `onlyWeekday` when
 * the list is filtered by one day. Days without promotions are left out.
 */
export function groupByWeekday<T extends { weekdays: number[] }>(
  promotions: T[],
  onlyWeekday: number | null,
): WeekdayGroup<T>[] {
  return DAY_TITLES.flatMap((title, index) => {
    const weekday = index + 1;
    if (onlyWeekday !== null && weekday !== onlyWeekday) return [];
    const ofDay = promotions.filter((promotion) => promotion.weekdays.includes(weekday));
    return ofDay.length > 0 ? [{ weekday, title, promotions: ofDay }] : [];
  });
}
