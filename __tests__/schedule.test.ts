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
const dump = JSON.parse(readFileSync('./__tests__/fixtures/schedule.json', 'utf-8'))

github.context.payload = dump

process.env.CI = 'true'
process.env.GITHUB_WORKFLOW = 'schedule-test'
process.env.GITHUB_JOB = 'build'
process.env.GITHUB_RUN_ID = '363600556'
process.env.GITHUB_RUN_NUMBER = '179'
process.env.GITHUB_ACTION = 'self2'
process.env.GITHUB_ACTIONS = 'true'
process.env.GITHUB_ACTOR = 'satterly'
process.env.GITHUB_REPOSITORY = 'act10ns/slack'
process.env.GITHUB_EVENT_NAME = 'schedule'
process.env.GITHUB_EVENT_PATH = '/home/runner/work/_temp/_github_workflow/event.json'
process.env.GITHUB_WORKSPACE = '/home/runner/work/slack/slack'
process.env.GITHUB_SHA = '09a6b2c984766efb19eb39c97bc8be5d352a102f'
process.env.GITHUB_REF = 'refs/heads/master'
process.env.GITHUB_HEAD_REF = ''
process.env.GITHUB_BASE_REF = ''
process.env.GITHUB_SERVER_URL = 'https://github.com'
process.env.GITHUB_API_URL = 'https://github.com'
process.env.GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'
process.env.INVOCATION_ID = '1a1f065e457f48ea96eb5d289fa1bb9f'

test('schedule event to slack', async () => {
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
        fallback: '[GitHub]: [act10ns/slack] schedule-test schedule Success',
        color: 'good',
        author_name: 'github',
        author_link: 'https://github.com/github',
        author_icon: 'https://avatars1.githubusercontent.com/u/9919?s=200&v=4',
        mrkdwn_in: ['pretext', 'text', 'fields'],
        pretext: '',
        text:
          '*<https://github.com/act10ns/slack/actions?query=schedule-test|Workflow _schedule-test_ job _Build and Test_ triggered by _schedule_ is _Success_>* for <https://github.com/act10ns/slack/commits/master|`master`>\n<https://github.com/act10ns/slack/commit/09a6b2c9|`09a6b2c9`> - Schedule `*/15 * * * *`',
        title: '',
        fields: [],
        footer: '<https://github.com/act10ns/slack|act10ns/slack> #179',
        footer_icon: 'https://github.githubassets.com/favicon.ico',
        ts: expect.stringMatching(/[0-9]+/)
      }
    ]
  })

  mockAxios.resetHistory()
  mockAxios.reset()
})
