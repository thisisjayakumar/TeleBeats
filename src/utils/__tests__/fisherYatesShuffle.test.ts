import { fisherYatesShuffle } from "../fisherYatesShuffle";

describe("fisherYatesShuffle", () => {
  it("returns a new array and keeps the original untouched", () => {
    const input = [1, 2, 3, 4];
    const output = fisherYatesShuffle(input, () => 0.5);

    expect(output).not.toBe(input);
    expect(input).toEqual([1, 2, 3, 4]);
  });

  it("keeps all elements after shuffling", () => {
    const input = ["a", "b", "c", "d", "e"];
    const output = fisherYatesShuffle(input);

    expect(output).toHaveLength(input.length);
    expect([...output].sort()).toEqual([...input].sort());
  });
});
