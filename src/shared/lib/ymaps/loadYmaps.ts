let ymapsLoadingPromise: Promise<unknown> | null = null

type YMapsLike = {
  ready: (cb: () => void) => void
}

function buildYmapsScriptSrc(apiKey: string, suggestApiKey?: string) {
  const params = new URLSearchParams({
    apikey: apiKey,
    lang: 'ru_RU',
  })

  if (suggestApiKey) {
    params.set('suggest_apikey', suggestApiKey)
  }

  return `https://api-maps.yandex.ru/2.1/?${params.toString()}`
}

export function loadYmaps(): Promise<unknown> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Yandex Maps can be loaded only in browser'))
  }

  if (window.ymaps) {
    return new Promise((resolve) => {
      const ymaps = window.ymaps as unknown as YMapsLike
      ymaps.ready(() => resolve(window.ymaps))
    })
  }

  if (ymapsLoadingPromise) {
    return ymapsLoadingPromise
  }

  const apiKey = import.meta.env.VITE_YMAPS_API_KEY
  if (!apiKey) {
    return Promise.reject(new Error('VITE_YMAPS_API_KEY is not set'))
  }

  const suggestApiKey =
    import.meta.env.VITE_YMAPS_SUGGEST_API_KEY || import.meta.env.VITE_YMAPS_API_KEY

  ymapsLoadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-ymaps="true"]'
    )

    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (!window.ymaps) {
          reject(new Error('Yandex Maps script loaded, but ymaps is not available'))
          return
        }

        const ymaps = window.ymaps as unknown as YMapsLike
        ymaps.ready(() => resolve(window.ymaps))
      })
      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load Yandex Maps script'))
      })
      return
    }

    const script = document.createElement('script')
    script.src = buildYmapsScriptSrc(apiKey, suggestApiKey)
    script.async = true
    script.defer = true
    script.type = 'text/javascript'
    script.dataset.ymaps = 'true'

    script.onload = () => {
      if (!window.ymaps) {
        reject(new Error('Yandex Maps script loaded, but ymaps is not available'))
        return
      }

      const ymaps = window.ymaps as unknown as YMapsLike
      ymaps.ready(() => resolve(window.ymaps))
    }

    script.onerror = () => {
      reject(new Error('Failed to load Yandex Maps script'))
    }

    document.head.appendChild(script)
  })

  return ymapsLoadingPromise
}
