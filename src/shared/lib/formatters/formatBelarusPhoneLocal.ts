export function formatBelarusPhoneLocal(input: string) {
  const digitsOnly = input.replace(/\D/g, '')
  const hasClosingParen = input.includes(')')

  if (!digitsOnly) {
    return ''
  }

  const digits = digitsOnly.slice(0, 9)

  const code = digits.slice(0, 2)
  const subscriberDigits = digits.slice(2, 9)

  const part1 = subscriberDigits.slice(0, 3)
  const part2 = subscriberDigits.slice(3, 5)
  const part3 = subscriberDigits.slice(5, 7)

  let result = ''

  if (code.length) {
    result += `(${code}`
    if (code.length === 2 && (subscriberDigits.length > 0 || hasClosingParen)) {
      result += ')'
    }
  }

  if (part1.length) {
    result += `${result ? ' ' : ''}${part1}`
  }

  if (part2.length) {
    result += `-${part2}`
  }

  if (part3.length) {
    result += `-${part3}`
  }

  return result
}

export function buildBelarusFullPhone(localFormatted: string) {
  const trimmed = localFormatted.trim()

  if (!trimmed) {
    return ''
  }

  return `+375 ${trimmed}`
}

export function getBelarusLocalPhone(fullPhone: string) {
  const trimmed = fullPhone.trim()

  if (!trimmed) {
    return ''
  }

  if (!trimmed.startsWith('+375')) {
    return trimmed
  }

  return trimmed.slice(4).trim()
}
