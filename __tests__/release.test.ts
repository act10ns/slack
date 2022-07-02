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
const dump = JSON.parse(readFileSync('./__tests__/fixtures/release.json', 'utf-8'))

github.context.payload = dump.event
github.context.eventName = dump.event_name
github.context.sha = dump.sha
github.context.ref = dump.ref
github.context.workflow = dump.workflow
github.context.action = dump.action
github.context.actor = dump.actor
console.log(github.context)

process.env.CI = 'true'
process.env.GITHUB_WORKFLOW = 'build-test'
process.env.GITHUB_JOB = 'build'
process.env.GITHUB_RUN_ID = '361391443'
process.env.GITHUB_RUN_NUMBER = '817'
process.env.GITHUB_ACTION = 'self'
process.env.GITHUB_ACTION_REF = 'v2'
process.env.GITHUB_ACTIONS = 'true'
process.env.GITHUB_ACTOR = 'satterly'
process.env.GITHUB_REPOSITORY = 'act10ns/slack'
process.env.GITHUB_EVENT_NAME = 'release'
process.env.GITHUB_EVENT_PATH = 'fixtures/release.json'
process.env.GITHUB_WORKSPACE = '/home/runner/work/slack/slack'
process.env.GITHUB_SHA = '332b8416cd15a8f77816a5d3df21423b16b46756'
process.env.GITHUB_REF = 'refs/tags/v1.0.13'
process.env.GITHUB_HEAD_REF = ''
process.env.GITHUB_BASE_REF = ''
process.env.GITHUB_SERVER_URL = 'https://github.com'
process.env.GITHUB_API_URL = 'https://api.github.com'
process.env.GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'

test('release event to slack', async () => {
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
    username: 'GitHub Actions',
    icon_url: 'https://octodex.github.com/images/original.png',
    channel: '@override',
    attachments: [
      {
        fallback: '[GitHub]: [act10ns/slack] build-test release Success',
        color: 'good',
        author_name: 'satterly',
        author_link: 'https://github.com/satterly',
        author_icon: '',
        mrkdwn_in: ['pretext', 'text', 'fields'],
        pretext: '',
        text: '*<https://github.com/act10ns/slack/actions?query=workflow:build-test|Workflow _build-test_ job _Build and Test_ triggered by _release_ is _Success_>* for <https://github.com/act10ns/slack/commits/refs/tags/v1.0.13|`refs/tags/v1.0.13`>\n',
        title: '',
        fields: [],
        footer: '<https://github.com/act10ns/slack|act10ns/slack> #817',
        footer_icon: 'https://github.githubassets.com/favicon.ico',
        ts: expect.stringMatching(/[0-9]+/)
      }
    ]
  })

  mockAxios.resetHistory()
  mockAxios.reset()
})
