// BY plates vary; for MVP we just normalize input and apply a simple mask.

export function normalizeBelarusCarPlate(input: string) {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
}

export function formatBelarusCarPlate(input: string) {
  const raw = normalizeBelarusCarPlate(input)

  // Common: 1234AB-7 (7 is region). We'll format as 1234 AB-7 when possible.
  const digits = raw.slice(0, 4)
  const letters = raw.slice(4, 6)
  const region = raw.slice(6, 7)
  const tail = raw.slice(7)

  let result = ''

  if (digits) result += digits
  if (letters) result += `${result ? ' ' : ''}${letters}`
  if (region) result += `-${region}`
  if (tail) result += tail

  return result
}
