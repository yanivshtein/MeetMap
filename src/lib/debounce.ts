export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  ms: number,
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: TArgs) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, ms);
  };
}
