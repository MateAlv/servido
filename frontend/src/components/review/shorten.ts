/** The first `length` characters of a text, cut at the last whole word, with «…». */
export function shorten(text: string, length: number): string {
  const cut = text.slice(0, length)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}
