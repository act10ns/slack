import Handlebars from '../src/handlebars'

const data = {
  foo: 'bar',
  fu: 'bar',
  baz: 'quux',
  obj: {
    a: 'b',
    c: 123,
    d: ['x', 'y', 'z']
  },
  text: 'this is a long line of text',
  uuid: 'CFE20509-E7CF-4401-9733-7615EF3E8A25',
  want: 0,
  t: true,
  f: false,
  empty: [],
  empty_str: '',
  commits: ['088fcd5a5bc73a6733edcc58d0d30869ddbe2e2f'],
  numbers: [1, 2, 3, 4],
  letters: ['abc', 'def', 'ghi'],
  foobars: [
    {foo: true, bar: 1},
    {foo: false, bar: 3},
    {foo: true, bar: 3}
  ],
  attendees: ['dave', 'mike', 'jane', 'betty'],
  items: [1, 2, 3],
  payload: {
    workflow_run: {
      run_attempt: 7
    }
  }
}

// utilities
test('json stringify', () => {
  const template = Handlebars.compile('{{{json obj}}}')
  const text = template(data)
  expect(text).toStrictEqual('{"a":"b","c":123,"d":["x","y","z"]}')
})

test('truncate uuid', () => {
  const template = Handlebars.compile('{{truncate uuid 8}}')
  const text = template(data)
  expect(text).toStrictEqual('CFE20509')
})

test('want when exists', () => {
  const template = Handlebars.compile('{{default foo "fallback"}}')
  const text = template(data)
  expect(text).toStrictEqual('bar')
})

test('want when false', () => {
  const template = Handlebars.compile('{{default f "fallback"}}')
  const text = template(data)
  expect(text).toStrictEqual('false')
})

test('want when 0', () => {
  const template = Handlebars.compile('{{default want "fallback"}}')
  const text = template(data)
  expect(text).toStrictEqual('0')
})

test('default value when not exists', () => {
  const template = Handlebars.compile('{{default fallback baz}}')
  const text = template(data)
  expect(text).toStrictEqual('quux')
})

test('default string when not exists', () => {
  const template = Handlebars.compile('{{default fallback "fallback"}}')
  const text = template(data)
  expect(text).toStrictEqual('fallback')
})

test('default when empty string', () => {
  const template = Handlebars.compile('{{default empty_str "fallback"}}')
  const text = template(data)
  expect(text).toStrictEqual('fallback')
})

test('pluralize empty list', () => {
  const template = Handlebars.compile('{{pluralize empty}}')
  const text = template(data)
  expect(text).toStrictEqual('no items')
})

test('pluralize numeric value', () => {
  const template = Handlebars.compile('{{pluralize payload.workflow_run.run_attempt "attempt"}}')
  const text = template(data)
  expect(text).toStrictEqual('7 attempts')
})

test('pluralize commits', () => {
  const template = Handlebars.compile('{{pluralize commits "commit"}}')
  const text = template(data)
  expect(text).toStrictEqual('1 commit')
})

test('pluralize attendees', () => {
  const template = Handlebars.compile('{{pluralize attendees "attendee"}}')
  const text = template(data)
  expect(text).toStrictEqual('4 attendees')
})

test('pluralize people', () => {
  const template = Handlebars.compile('{{pluralize attendees "person" "people"}}')
  const text = template(data)
  expect(text).toStrictEqual('4 people')
})

// equality
test('eq is true', () => {
  const template = Handlebars.compile('{{#if (eq foo fu)}}yes{{else}}no{{/if}}')
  const text = template(data)
  expect(text).toStrictEqual('yes')
})

test('eq is false', () => {
  const template = Handlebars.compile('{{#if (eq foo "foo")}}yes{{else}}no{{/if}}')
  const text = template(data)
  expect(text).toStrictEqual('no')
})

test('neq is true', () => {
  const template = Handlebars.compile('{{#if (neq foo fu)}}yes{{else}}no{{/if}}')
  const text = template(data)
  expect(text).toStrictEqual('no')
})

test('neq is false', () => {
  const template = Handlebars.compile('{{#if (neq foo "foo")}}yes{{else}}no{{/if}}')
  const text = template(data)
  expect(text).toStrictEqual('yes')
})

// boolean operators
test('not false', () => {
  const template = Handlebars.compile('{{#if (not f)}}yes{{else}}no{{/if}}')
  const text = template(data)
  expect(text).toStrictEqual('yes')
})

test('not true', () => {
  const template = Handlebars.compile('{{#if (not t)}}yes{{else}}no{{/if}}')
  const text = template(data)
  expect(text).toStrictEqual('no')
})

test('not false and (true or false)', () => {
  const template = Handlebars.compile('{{#if (and (not f) (or t f))}}yes{{else}}no{{/if}}')
  const text = template(data)
  expect(text).toStrictEqual('yes')
})

test('or is true', () => {
  const template = Handlebars.compile('{{#if (or t f)}}yes{{else}}no{{/if}}')
  const text = template(data)
  expect(text).toStrictEqual('yes')
})

test('and is false', () => {
  const template = Handlebars.compile('{{#if (and t f)}}yes{{else}}no{{/if}}')
  const text = template(data)
  expect(text).toStrictEqual('no')
})

// conditionals
test('#ifeq is true', () => {
  const template = Handlebars.compile('{{#ifeq foo fu}}yes{{else}}no{{/ifeq}}')
  const text = template(data)
  expect(text).toStrictEqual('yes')
})

test('#ifeq is false', () => {
  const template = Handlebars.compile('{{#ifeq foo "foo"}}yes{{else}}no{{/ifeq}}')
  const text = template(data)
  expect(text).toStrictEqual('no')
})

test('#ifneq is true', () => {
  const template = Handlebars.compile('{{#ifneq foo fu}}yes{{else}}no{{/ifneq}}')
  const text = template(data)
  expect(text).toStrictEqual('no')
})

test('#ifneq is false', () => {
  const template = Handlebars.compile('{{#ifneq foo "foo"}}yes{{else}}no{{/ifneq}}')
  const text = template(data)
  expect(text).toStrictEqual('yes')
})
