import * as github from '@actions/github'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import {send, ConfigOptions} from '../src/slack'
import {readFileSync} from 'fs'

const url = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
const jobName = 'CI Tests'
const jobStatus = 'failure'
const jobSteps = {
  'install-deps': {
    outputs: {},
    outcome: 'skipped',
    conclusion: 'skipped'
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
    outcome: 'skipped',
    conclusion: 'skipped'
  },
  'integration-test': {
    outputs: {},
    outcome: 'skipped',
    conclusion: 'skipped'
  }
}
const channel = '#github-ci'

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

test('custom config of slack action', async () => {
  const mockAxios = new MockAdapter(axios, {delayResponse: 200})

  mockAxios
    .onPost()
    .reply(config => {
      console.log(config.data)
      return [200, {status: 'ok'}]
    })
    .onAny()
    .reply(500)

  let message = undefined
  let config: ConfigOptions = {
    username: 'Act10ns Slack',
    icon_url: 'https://octodex.github.com/images/mona-the-rivetertocat.png',
    text: '[{{jobStatus}}] {{ workflow }} workflow {{jobName}} job triggered by {{eventName}}',
    fallback: '[GitHub]: [{{repositoryName}}] {{workflow}} workflow triggered on {{eventName}} is {{jobStatus}}',
    footer: '',
    colors: {
      success: '#27AE60',
      failure: '#D35400',
      cancelled: '#FFC300'
    },
    icons: {
      success: ':white_check_mark:',
      failure: ':grimacing:',
      cancelled: ':x:',
      skipped: ':heavy_minus_sign:',
      default: ':interrobang:'
    },
    unfurl_links: true
  }

  let res = await send(url, jobName, jobStatus, jobSteps, channel, message, config)
  await expect(res).toStrictEqual({text: {status: 'ok'}})

  expect(JSON.parse(mockAxios.history.post[0].data)).toStrictEqual({
    username: 'Act10ns Slack',
    icon_url: 'https://octodex.github.com/images/mona-the-rivetertocat.png',
    channel: '#github-ci',
    attachments: [
      {
        fallback: '[GitHub]: [act10ns/slack] build-test workflow triggered on push is failure',
        color: '#D35400',
        author_name: 'satterly',
        author_link: 'https://github.com/satterly',
        author_icon: 'https://avatars0.githubusercontent.com/u/615057?v=4',
        mrkdwn_in: ['text'],
        text: '[failure] build-test workflow CI Tests job triggered by push',
        fields: [
          {
            short: false,
            title: 'Job Steps',
            value:
              ':heavy_minus_sign: install-deps\n:heavy_minus_sign: hooks\n:heavy_minus_sign: lint\n:heavy_minus_sign: types\n:heavy_minus_sign: unit-test\n:heavy_minus_sign: integration-test'
          }
        ],
        footer: '<https://github.com/act10ns/slack|act10ns/slack> #8',
        footer_icon: 'https://github.githubassets.com/favicon.ico',
        ts: expect.stringMatching(/[0-9]+/)
      }
    ]
  })

  message = '[{{jobStatus}}] {{env.GITHUB_WORKFLOW}} workflow {{jobName}} job triggered by {{env.GITHUB_EVENT_NAME}}'
  config = {
    username: 'Act10ns Slack',
    icon_url: 'https://octodex.github.com/images/mona-the-rivetertocat.png',
    text: 'do not use',
    fallback: '[GitHub]: [{{repositoryName}}] {{workflow}} workflow triggered on {{eventName}} is {{jobStatus}}',
    footer: '',
    colors: {
      success: 'good',
      failure: 'danger',
      cancelled: 'warning'
    },
    icons: {
      success: ':white_check_mark:',
      failure: ':grimacing:',
      cancelled: ':x:',
      skipped: ':skier:',
      default: ':interrobang:'
    },
    unfurl_media: true
  }

  res = await send(url, jobName, jobStatus, jobSteps, channel, message, config)
  await expect(res).toStrictEqual({text: {status: 'ok'}})

  expect(JSON.parse(mockAxios.history.post[1].data)).toStrictEqual({
    username: 'Act10ns Slack',
    icon_url: 'https://octodex.github.com/images/mona-the-rivetertocat.png',
    channel: '#github-ci',
    attachments: [
      {
        fallback: '[GitHub]: [act10ns/slack] build-test workflow triggered on push is failure',
        color: 'danger',
        author_name: 'satterly',
        author_link: 'https://github.com/satterly',
        author_icon: 'https://avatars0.githubusercontent.com/u/615057?v=4',
        mrkdwn_in: ['text'],
        text: '[failure] build-test workflow CI Tests job triggered by push',
        fields: [
          {
            short: false,
            title: 'Job Steps',
            value:
              ':skier: install-deps\n:skier: hooks\n:skier: lint\n:skier: types\n:skier: unit-test\n:skier: integration-test'
          }
        ],
        footer: '<https://github.com/act10ns/slack|act10ns/slack> #8',
        footer_icon: 'https://github.githubassets.com/favicon.ico',
        ts: expect.stringMatching(/[0-9]+/)
      }
    ]
  })

  mockAxios.resetHistory()
  mockAxios.reset()
})
