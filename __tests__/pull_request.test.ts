import * as github from '@actions/github'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import {send} from '../src/slack'
import {readFileSync} from 'fs'

const url = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
const jobName = 'Build and Test'
const jobStatus = 'Success'
const jobSteps = {}
const channel = '@override'
const message = undefined

// mock github context
const dump = JSON.parse(readFileSync('./__tests__/fixtures/pull_request.json', 'utf-8'))

github.context.payload = dump.event
github.context.eventName = dump.event_name
github.context.sha = dump.sha
github.context.ref = dump.ref
github.context.workflow = dump.workflow
github.context.action = dump.action
github.context.actor = dump.actor

process.env.CI = 'true'
process.env.GITHUB_WORKFLOW = 'build-test'
process.env.GITHUB_RUN_ID = '360703544'
process.env.GITHUB_RUN_NUMBER = '760'
process.env.GITHUB_ACTION = 'self2'
process.env.GITHUB_ACTIONS = 'true'
process.env.GITHUB_ACTOR = 'satterly'
process.env.GITHUB_REPOSITORY = 'act10ns/slack'
process.env.GITHUB_EVENT_NAME = 'pull_request'
process.env.GITHUB_EVENT_PATH = '/home/runner/work/_temp/_github_workflow/event.json'
process.env.GITHUB_WORKSPACE = '/home/runner/work/slack/slack'
process.env.GITHUB_SHA = 'f4c103c8121b97a235791468fd31ce98e89a5e9e'
process.env.GITHUB_REF = 'refs/pull/17/merge'
process.env.GITHUB_HEAD_REF = 'rename-to-slack'
process.env.GITHUB_BASE_REF = 'master'
process.env.GITHUB_SERVER_URL = 'https://github.com'
process.env.GITHUB_API_URL = 'https://github.com'
process.env.GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'

test('pull request event to slack', async () => {
  const mockAxios = new MockAdapter(axios, {delayResponse: 200})

  mockAxios
    .onPost()
    .reply(config => {
      console.log(config.data)
      return [200, {status: 'ok'}]
    })
    .onAny()
    .reply(500)

  const res = await send(url, jobName, jobStatus, jobSteps, channel, message)
  await expect(res).toStrictEqual({text: {status: 'ok'}})

  expect(JSON.parse(mockAxios.history.post[0].data)).toStrictEqual({
    username: 'GitHub Action',
    icon_url: 'https://octodex.github.com/images/original.png',
    channel: '@override',
    attachments: [
      {
        fallback: '[GitHub]: [act10ns/slack] build-test pull_request opened Success',
        color: 'good',
        author_name: 'satterly',
        author_link: 'https://github.com/satterly',
        author_icon: 'https://avatars0.githubusercontent.com/u/615057?v=4',
        mrkdwn_in: ['pretext', 'text', 'fields'],
        pretext: '',
        text:
          '*<https://github.com/act10ns/slack/actions?query=build-test|Workflow _build-test_ job _Build and Test_ triggered by _pull_request_ is _Success_>* for <https://github.com/act10ns/slack/pull/17|`#17`>\n<https://github.com/act10ns/slack/pull/17/files|`rename-to-slack`> - Rename to slack',
        title: '',
        fields: [],
        footer: '<https://github.com/act10ns/slack|act10ns/slack> #760',
        footer_icon: 'https://github.githubassets.com/favicon.ico',
        ts: expect.stringMatching(/[0-9]+/)
      }
    ]
  })

  mockAxios.resetHistory()
  mockAxios.reset()
})
