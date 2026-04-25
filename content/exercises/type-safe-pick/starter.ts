// TODO: implement pick with strict generic typing.
// Constraints:
//   - K must be a key of T (caught at compile time).
//   - Return type is Pick<T, K> (precise, not widened).
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  // your code here
  return {} as Pick<T, K>;
}
