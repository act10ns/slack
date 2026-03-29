import * as github from '@actions/github'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import {send, ConfigOptions} from '../src/slack'
import {readFileSync} from 'fs'
import * as yaml from 'js-yaml'

const url = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
const jobName = 'Build and Test'
const jobStatus = 'Success'
const jobSteps = {}
const jobMatrix = {}
const jobInputs = {}
const channel = '#github-ci'
const message = undefined

const dump = JSON.parse(readFileSync('./__tests__/fixtures/push.json', 'utf-8'))

process.env.CI = 'true'
process.env.GITHUB_WORKFLOW = 'build-test'
process.env.GITHUB_RUN_ID = '100143423'
process.env.GITHUB_RUN_NUMBER = '8'
process.env.GITHUB_ACTION = 'self2'
process.env.GITHUB_ACTIONS = 'true'
process.env.GITHUB_ACTOR = 'satterly'
process.env.GITHUB_REPOSITORY = 'act10ns/slack'
process.env.GITHUB_EVENT_NAME = 'push'
process.env.GITHUB_EVENT_PATH = '/home/runner/work/_temp/_github_workflow/event.json'
process.env.GITHUB_WORKSPACE = '/home/runner/work/slack/slack'
process.env.GITHUB_SHA = '68d48876e0794fba714cb331a1624af6b20942d8'
process.env.GITHUB_REF = 'refs/heads/master'
process.env.GITHUB_HEAD_REF = ''
process.env.GITHUB_BASE_REF = ''
process.env.GITHUB_SERVER_URL = 'https://github.com'
process.env.GITHUB_API_URL = 'https://github.com'
process.env.GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'

function setupContext(commitMessage: string): void {
  const fixture = JSON.parse(JSON.stringify(dump))
  fixture.event.commits[0].message = commitMessage
  github.context.payload = fixture.event
  github.context.eventName = fixture.event_name
  github.context.sha = fixture.sha
  github.context.ref = fixture.ref
  github.context.workflow = fixture.workflow
  github.context.action = fixture.action
  github.context.actor = fixture.actor
}

async function sendAndExpectSuccess(mockAxios: MockAdapter): Promise<void> {
  const res = await send(url, jobName, jobStatus, jobSteps, jobMatrix, jobInputs, channel, message)
  await expect(res).toStrictEqual({text: {status: 'ok'}})
  mockAxios.resetHistory()
  mockAxios.reset()
}

let mockAxios: MockAdapter

beforeEach(() => {
  mockAxios = new MockAdapter(axios, {delayResponse: 50})
  mockAxios.onPost().reply(200, {status: 'ok'}).onAny().reply(500)
})

afterEach(() => {
  mockAxios.resetHistory()
  mockAxios.reset()
})

test('commit message with {{variable}} handlebars expression', async () => {
  setupContext('fix: handle {{user}} placeholder in config')
  await sendAndExpectSuccess(mockAxios)
})

test('commit message with triple braces {{{raw}}}', async () => {
  setupContext('feat: add {{{rawHelper}}} support')
  await sendAndExpectSuccess(mockAxios)
})

test('commit message with handlebars block helper {{#if}}', async () => {
  setupContext('docs: explain {{#if condition}}true{{/if}} syntax')
  await sendAndExpectSuccess(mockAxios)
})

test('commit message with handlebars each loop {{#each items}}', async () => {
  setupContext('fix: {{#each items}}{{this}}{{/each}} rendering')
  await sendAndExpectSuccess(mockAxios)
})

test('commit message with nested braces {{{{raw}}}}', async () => {
  setupContext('fix: escaped {{{{raw}}}} block')
  await sendAndExpectSuccess(mockAxios)
})

test('commit message with partial syntax {{> partial}}', async () => {
  setupContext('refactor: move to {{> headerPartial}} layout')
  await sendAndExpectSuccess(mockAxios)
})

test('commit message with only opening braces {{', async () => {
  setupContext('fix: unmatched {{ in template')
  await sendAndExpectSuccess(mockAxios)
})

test('commit message with curly braces in JSON {key: value}', async () => {
  setupContext('fix: parse {"key": "value"} correctly')
  await sendAndExpectSuccess(mockAxios)
})

test('commit message with multiple handlebars expressions', async () => {
  setupContext('fix: {{foo}} and {{bar}} and {{#if baz}}{{qux}}{{/if}}')
  await sendAndExpectSuccess(mockAxios)
})

test('commit message with no special characters', async () => {
  setupContext('fix: normal commit message with no braces')
  await sendAndExpectSuccess(mockAxios)
})

test('commit message with backticks and braces', async () => {
  setupContext('fix: `{{something}}` in markdown')
  await sendAndExpectSuccess(mockAxios)
})

test('empty commit message', async () => {
  setupContext('')
  await sendAndExpectSuccess(mockAxios)
})

// Tests with blocks config — these exercise JSON template interpolation
// which is where newlines in commit messages cause JSON.parse failures

const blocksConfig = yaml.load(readFileSync('./__tests__/fixtures/slack-blocks.yml', 'utf-8'), {
  schema: yaml.FAILSAFE_SCHEMA
}) as ConfigOptions

async function sendWithBlocksAndExpectSuccess(mockAxios: MockAdapter): Promise<void> {
  const res = await send(url, jobName, jobStatus, jobSteps, jobMatrix, jobInputs, channel, message, blocksConfig)
  await expect(res).toStrictEqual({text: {status: 'ok'}})
  mockAxios.resetHistory()
  mockAxios.reset()
}

test('multi-line commit message with blocks config', async () => {
  setupContext('fix: some bug\n\nThis is a detailed description\nwith multiple lines.')
  await sendWithBlocksAndExpectSuccess(mockAxios)
})

test('commit message with tabs and carriage returns with blocks config', async () => {
  setupContext('feat: add feature\r\n\r\n\tindented detail')
  await sendWithBlocksAndExpectSuccess(mockAxios)
})

test('commit message with quotes and backslashes with blocks config', async () => {
  setupContext('fix: handle "quoted" strings')
  await sendWithBlocksAndExpectSuccess(mockAxios)
})

test('commit message with handlebars syntax and newlines with blocks config', async () => {
  setupContext('fix: handle {{user}} placeholder\n\nCo-Authored-By: bot <bot@example.com>')
  await sendWithBlocksAndExpectSuccess(mockAxios)
})
