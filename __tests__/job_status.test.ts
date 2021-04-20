import * as github from '@actions/github'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import send from '../src/slack'
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

test('push event to slack', async () => {
  const mockAxios = new MockAdapter(axios, {delayResponse: 200})

  mockAxios
    .onPost()
    .reply(config => {
      console.log(config.data)
      return [200, {status: 'ok'}]
    })
    .onAny()
    .reply(500)

  const res = await send(url, jobName, jobStatus, jobSteps, channel)
  await expect(res).toStrictEqual({text: {status: 'ok'}})

  expect(JSON.parse(mockAxios.history.post[0].data)).toStrictEqual({
    username: 'GitHub Action',
    icon_url: 'https://octodex.github.com/images/original.png',
    channel: '#github-ci',
    attachments: [
      {
        fallback: '[GitHub]: [act10ns/slack] build-test push failure',
        color: 'danger',
        author_name: 'satterly',
        author_link: 'https://github.com/satterly',
        author_icon: 'https://avatars0.githubusercontent.com/u/615057?v=4',
        mrkdwn_in: ['text'],
        text:
          '*<https://github.com/act10ns/slack/actions/runs/100143423|Workflow _build-test_ job _CI Tests_ triggered by _push_ is _failure_>* for <https://github.com/act10ns/slack/commits/master|`master`>\n<https://github.com/act10ns/slack/compare/db9fe60430a6...68d48876e079|`68d48876`> - 4 commits',
        fields: [
          {
            title: '',
            value:
              '<https://github.com/act10ns/slack/commit/b1f512300ea6e925e095c51a441fcf30104523aa|b1f51230> - wip\n<https://github.com/act10ns/slack/commit/b246b5fdcc2722909503d5a43eb635885aa5fd25|b246b5fd> - wip\n<https://github.com/act10ns/slack/commit/553c22356fadc36947653de987dabd8da40cb06b|553c2235> - wip\n<https://github.com/act10ns/slack/commit/68d48876e0794fba714cb331a1624af6b20942d8|68d48876> - wip',
            short: false
          },
          {
            short: false,
            title: 'Job Steps',
            value:
              ':no_entry_sign: install-deps\n:no_entry_sign: hooks\n:no_entry_sign: lint\n:no_entry_sign: types\n:no_entry_sign: unit-test\n:no_entry_sign: integration-test'
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
