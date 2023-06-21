const collapseAdjacentDuplicates = (arrays) =>
  arrays.filter((value, index, arr) => arr[index + 1] !== value);

export { collapseAdjacentDuplicates };
