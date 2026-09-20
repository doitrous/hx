/**
 * Google Analytics 4, loaded only when the server supplies a measurement ID
 * (env GA_MEASUREMENT_ID) and the visitor has not asked not to be tracked.
 *
 * Hard rule: nothing a doctor types ever goes here. Events carry a name and,
 * at most, a mode. No note text, no field values, no URLs with content.
 */
type Gtag = (...args: unknown[]) => void
declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

let started = false

export function startAnalytics(id: string | undefined | null) {
  if (started || !id || !/^G-[A-Z0-9]+$/.test(id)) return
  if (navigator.doNotTrack === '1') return
  started = true
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  // Measurement only: no advertising storage, no ad personalisation.
  window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' })
  window.gtag('js', new Date())
  window.gtag('config', id, { send_page_view: false })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
  document.head.appendChild(s)
  pageView()
}

export function pageView() {
  // Path only: query strings are dropped so nothing typed can ever ride along.
  window.gtag?.('event', 'page_view', { page_path: location.pathname, page_location: location.origin + location.pathname })
}

export function track(name: 'example_run' | 'first_analysis' | 'sheet_view' | 'dictation_start', params?: { mode?: string; view?: string }) {
  window.gtag?.('event', name, params)
}
