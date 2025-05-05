import fs from 'fs'
import path from 'path'
import { DateTime } from 'luxon'

export default function (config) {
  const baseurl = process.env.ELEVENTY_ENV === 'prod' ? '/Pixoprint' : ''

  const translations = JSON.parse(fs.readFileSync(path.resolve('src/_data/lang.json'), 'utf8'))

  const lookup = (obj, key) => {
    if (!key || typeof key !== 'string') return key
    return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj)
  }

  config.addFilter('t', (key, lang = 'fi') => {
    const raw = lookup(translations, key)
    if (raw === undefined) return key
    if (
      typeof raw === 'object' &&
      raw !== null &&
      Object.prototype.hasOwnProperty.call(raw, lang)
    ) {
      return raw[lang]
    }
    return raw
  })

  config.addFilter('i18n', (key, lang) => config.getFilter('t')(key, lang))

  // 🆕 Добавляем фильтр date
  config.addFilter('date', (value, format = 'yyyy') => {
    return DateTime.fromJSDate(new Date(value)).toFormat(format)
  })

  config.addGlobalData('baseurl', baseurl)
  config.addPassthroughCopy('assets')
  config.addPassthroughCopy('.nojekyll')

  return {
    dir: { input: 'src', includes: '_includes', output: 'docs' },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk'
  }
}
