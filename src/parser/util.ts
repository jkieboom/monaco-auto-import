export const getMatches = (s: string, regex: RegExp) => {
  const matches = [];
  let match = regex.exec(s);

  while (match) {
    matches.push(match);
    match = regex.exec(s);
  }
  return matches;
};
