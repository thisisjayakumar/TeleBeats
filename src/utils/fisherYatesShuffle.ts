export function fisherYatesShuffle<T>(input: T[], random = Math.random): T[] {
  const array = [...input];

  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}
