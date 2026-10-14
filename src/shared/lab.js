// Settings shared by every GeoSENSE Lab tool (HREP, Extreme Precipitation, ...).
// This folder (src/shared/) is the template to copy into new tools.

// Full address of the lab website, ending in "/".
// When the custom domain is connected, change this to e.g. "https://geosenselab.org/".
export const LAB_URL = 'https://shaheen0901.github.io/geosense/'

export const LAB_NAME = 'GeoSENSE Lab'
export const LAB_HOME = 'School of Public Health, LSU Health Sciences Center New Orleans'
// Footer name, matching the lab website's footer.
export const LAB_FOOTER_NAME = 'GeoSENSE Lab, LSU Health New Orleans'

// Links into the lab website, e.g. siteUrl('#tools') or siteUrl('#contact').
// When the tool is served from the website itself (…/tools/<name>/), use a relative link so it
// keeps working after the domain changes. Otherwise (e.g. the standalone github.io copy) use LAB_URL.
export function siteUrl(hash = '') {
  if (typeof window !== 'undefined' && /\/tools\/[^/]+\/?/.test(window.location.pathname)) {
    return `../../${hash}`
  }
  return `${LAB_URL}${hash}`
}

export const toolsUrl = () => siteUrl('#tools')
export const contactUrl = () => siteUrl('#contact')
