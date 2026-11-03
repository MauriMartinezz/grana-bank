/** The name shown to people: first and last name, or only the first one. */
export function fullName({ firstName, lastName }: { firstName: string; lastName: string }) {
  return `${firstName} ${lastName}`.trim();
}
