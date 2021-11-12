import Handlebars from 'handlebars'

// utilities
Handlebars.registerHelper('json', value => new Handlebars.SafeString(JSON.stringify(value)))

Handlebars.registerHelper('truncate', (text, size) => text.substring(0, size))

Handlebars.registerHelper('default', (want, fallback) => (want || want === 0 || want === false ? want : fallback))

Handlebars.registerHelper('pluralize', (items, ...args) => {
  const count = typeof items === 'number' ? items : items.length
  const singular = args.length === 1 ? 'item' : args[0]
  const plural = args.length === 3 ? args[1] : `${singular}s`

  if (count === 0) return `no ${plural}`
  if (count === 1) return `1 ${singular}`
  return `${count} ${plural}`
})

// equality
Handlebars.registerHelper('eq', (a, b) => a === b)

Handlebars.registerHelper('neq', (a, b) => a !== b)

// logical operators
Handlebars.registerHelper('not', a => !a)

Handlebars.registerHelper('and', (a, b) => a && b)

Handlebars.registerHelper('or', (a, b) => a || b)

// conditionals
Handlebars.registerHelper('ifeq', function (this: Handlebars.HelperDelegate, a, b, options) {
  return a === b ? options.fn(this) : options.inverse(this) // eslint-disable-line no-invalid-this
})

Handlebars.registerHelper('ifneq', function (this: Handlebars.HelperDelegate, a, b, options) {
  return a !== b ? options.fn(this) : options.inverse(this) // eslint-disable-line no-invalid-this
})

export default Handlebars
