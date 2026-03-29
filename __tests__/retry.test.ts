import * as github from '@actions/github'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import {send} from '../src/slack'
import {readFileSync} from 'fs'

const url = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
const jobName = 'Build and Test'
const jobStatus = 'Success'
const jobSteps = {}
const jobMatrix = {}
const jobInputs = {}
const channel = '#github-ci'
const message = undefined

// mock github context
const dump = JSON.parse(readFileSync('./__tests__/fixtures/push.json', 'utf-8'))

github.context.payload = dump.event
github.context.eventName = dump.event_name
github.context.sha = dump.sha
github.context.ref = dump.ref
github.context.workflow = dump.workflow
github.context.action = dump.action
github.context.actor = dump.actor

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

test('retries on transient network error then succeeds', async () => {
  const mockAxios = new MockAdapter(axios, {delayResponse: 50})

  let callCount = 0
  mockAxios.onPost().reply(() => {
    callCount++
    if (callCount < 3) {
      return [500, 'Internal Server Error']
    }
    return [200, {status: 'ok'}]
  })

  const res = await send(url, jobName, jobStatus, jobSteps, jobMatrix, jobInputs, channel, message)
  await expect(res).toStrictEqual({text: {status: 'ok'}})
  expect(callCount).toBe(3)

  mockAxios.resetHistory()
  mockAxios.reset()
})

test('throws after exhausting all retries', async () => {
  const mockAxios = new MockAdapter(axios, {delayResponse: 50})

  mockAxios.onPost().reply(500, 'Internal Server Error')

  await expect(send(url, jobName, jobStatus, jobSteps, jobMatrix, jobInputs, channel, message)).rejects.toThrow()

  mockAxios.resetHistory()
  mockAxios.reset()
})
