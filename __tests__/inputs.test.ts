import * as github from '@actions/github'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import {send, ConfigOptions} from '../src/slack'
import {readFileSync} from 'fs'
import * as yaml from 'js-yaml'

const url = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
const jobName = 'CI Tests'
const jobStatus = 'in progress'
const jobSteps = {
  'install-deps': {
    outputs: {},
    outcome: 'success',
    conclusion: 'success'
  },
  hooks: {
    outputs: {},
    outcome: 'skipped',
    conclusion: 'skipped'
  },
  lint: {
    outputs: {},
    outcome: 'skipped',
    conclusion: 'skipped'
  },
  types: {
    outputs: {},
    outcome: 'skipped',
    conclusion: 'skipped'
  },
  'unit-test': {
    outputs: {},
    outcome: 'failure',
    conclusion: 'failure'
  },
  'integration-test': {
    outputs: {},
    outcome: 'cancelled',
    conclusion: 'cancelled'
  }
}
const jobMatrix = undefined
const channel = '#deploy'
let message = 'Successfully deployed to {{ env.ENVIRONMENT }}!'

// mock github context
const dump = JSON.parse(readFileSync('./__tests__/fixtures/push.json', 'utf-8'))

github.context.payload = dump.event
github.context.eventName = dump.event_name
github.context.sha = dump.sha
github.context.ref = dump.ref
github.context.workflow = dump.workflow
github.context.action = dump.action
github.context.actor = dump.actor

process.env.ENVIRONMENT = 'dev'
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
process.env.GITHUB_REF_TYPE = 'branch'
process.env.GITHUB_REF_NAME = 'master'
process.env.GITHUB_HEAD_REF = ''
process.env.GITHUB_BASE_REF = ''
process.env.GITHUB_SERVER_URL = 'https://github.com'
process.env.GITHUB_API_URL = 'https://github.com'
process.env.GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'

test('custom config of slack action using inputs for channel and message', async () => {
  const mockAxios = new MockAdapter(axios, {delayResponse: 200})

  mockAxios
    .onPost()
    .reply(config => {
      console.log(config.data)
      return [200, {status: 'ok'}]
    })
    .onAny()
    .reply(500)

  let config = yaml.load(readFileSync('./__tests__/fixtures/slack-legacy.yml', 'utf-8'), {
    schema: yaml.FAILSAFE_SCHEMA
  }) as ConfigOptions

  let res = await send(url, jobName, jobStatus, jobSteps, jobMatrix, channel, message, config)
  await expect(res).toStrictEqual({text: {status: 'ok'}})

  expect(JSON.parse(mockAxios.history.post[0].data)).toStrictEqual({
    username: 'GitHub-CI',
    icon_url: 'https://octodex.github.com/images/mona-the-rivetertocat.png',
    channel: '#deploy',
    attachments: [
      {
        fallback: '[GitHub] build-test #8 CI Tests is in progress',
        color: '#7D3C98',
        author_name: 'satterly',
        author_link: 'https://github.com/satterly',
        author_icon: 'https://avatars0.githubusercontent.com/u/615057?v=4',
        mrkdwn_in: ['pretext', 'text', 'fields'],
        pretext: 'Triggered via push by satterly action master `68d48876`',
        text: 'Successfully deployed to dev!',
        title: 'GitHub Actions',
        title_link: 'https://support.github.com',
        fields: [
          {
            short: false,
            title: 'Job Steps',
            value: ':white_check_mark: install-deps\n:grimacing: unit-test\n:x: integration-test\n'
          },
          {
            short: true,
            title: 'Workflow',
            value: '<https://github.com/act10ns/slack/actions?query=workflow:build-test|build-test>'
          },
          {
            short: true,
            title: 'Git Ref',
            value: 'master (branch)'
          },
          {
            short: true,
            title: 'Run ID',
            value: '<https://github.com/act10ns/slack/actions/runs/100143423|100143423>'
          },
          {
            short: true,
            title: 'Run Number',
            value: '8'
          },
          {
            short: true,
            title: 'Actor',
            value: 'satterly'
          },
          {
            short: true,
            title: 'Job Status',
            value: 'in progress'
          }
        ],
        footer: '<https://github.com/act10ns/slack|act10ns/slack> build-test #8',
        footer_icon: 'https://github.githubassets.com/favicon.ico',
        ts: expect.stringMatching(/[0-9]+/)
      }
    ]
  })

  mockAxios.resetHistory()
  mockAxios.reset()
})
