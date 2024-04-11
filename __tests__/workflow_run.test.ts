import * as github from '@actions/github'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import {send, ConfigOptions} from '../src/slack'
import {readFileSync} from 'fs'
import * as yaml from 'js-yaml'

// mock github context
const dump = JSON.parse(readFileSync('./__tests__/fixtures/workflow_run.json', 'utf-8'))

github.context.payload = dump
github.context.eventName = dump.event_name
github.context.sha = dump.sha
github.context.ref = dump.ref
github.context.workflow = dump.workflow
github.context.action = dump.action
github.context.actor = dump.actor

process.env.CI = 'true'
process.env.GITHUB_WORKFLOW = 'workflow-run'
process.env.GITHUB_JOB = 'on-success'
process.env.GITHUB_RUN_ID = '1452345894'
process.env.GITHUB_RUN_NUMBER = '4'
process.env.GITHUB_ACTION = '__act10ns_slack'
process.env.GITHUB_ACTIONS = 'true'
process.env.GITHUB_ACTOR = 'satterly'
process.env.GITHUB_REPOSITORY = 'act10ns/slack'
process.env.GITHUB_EVENT_NAME = 'workflow_run'
process.env.GITHUB_EVENT_PATH = '/home/runner/work/_temp/_github_workflow/event.json'
process.env.GITHUB_WORKSPACE = '/home/runner/work/slack/slack'
process.env.GITHUB_SHA = '0d05b90e3bf469738248c462d36be1a78520a02e'
process.env.GITHUB_REF = 'refs/heads/master'
process.env.GITHUB_HEAD_REF = ''
process.env.GITHUB_BASE_REF = ''
process.env.GITHUB_SERVER_URL = 'https://github.com'
process.env.GITHUB_API_URL = 'https://github.com'
process.env.GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'

process.env.INPUT_CHANNEL = '#actions'
process.env.INPUT_CONFIG = '__tests__/fixtures/slack-workflow.yml'
process.env.INPUT_STATUS = 'success'
process.env.INPUT_STEPS = ''

process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'

const url = process.env.SLACK_WEBHOOK_URL as string
const jobName = process.env.GITHUB_JOB as string
const jobStatus = (process.env.INPUT_STATUS as string).toUpperCase()
const jobSteps = process.env.INPUT_STEPS || {}
const jobMatrix = {}
const jobInputs = {}
const channel = process.env.INPUT_CHANNEL as string
const message = process.env.INPUT_MESSAGE as string

test('workflow_run event to slack', async () => {
  const mockAxios = new MockAdapter(axios, {delayResponse: 200})

  mockAxios
    .onPost()
    .reply(config => {
      console.log(config.data)
      return [200, {status: 'ok'}]
    })
    .onAny()
    .reply(500)

  let config = yaml.load(readFileSync('./__tests__/fixtures/slack-workflow.yml', 'utf-8'), {
    schema: yaml.FAILSAFE_SCHEMA
  }) as ConfigOptions

  const res = await send(url, jobName, jobStatus, jobSteps, jobMatrix, jobInputs, channel, message, config)
  await expect(res).toStrictEqual({text: {status: 'ok'}})

  expect(JSON.parse(mockAxios.history.post[0].data)).toStrictEqual({
    username: 'GitHub-CI',
    icon_url: 'https://octodex.github.com/images/femalecodertocat.png',
    channel: '#actions',
    timeout: 0,
    attachments: [
      {
        mrkdwn_in: ['pretext', 'text', 'fields'],
        color: '#5DADE2',
        pretext: 'Triggered via workflow_run by satterly __act10ns_slack master `0d05b90e`',
        author_name: 'satterly',
        author_link: 'https://github.com/satterly',
        author_icon: 'https://avatars.githubusercontent.com/u/615057?v=4',
        title: 'GitHub Actions',
        title_link: 'https://support.github.com',
        text: '*<https://github.com/act10ns/slack/actions?query=workflow:%22workflow-run%22|Workflow _workflow-run_ job _on-success_ triggered by _workflow_run_ is _SUCCESS_>* for <https://github.com/act10ns/slack/commits/master|`master`>\n',
        fields: [],
        fallback: '[GitHub] workflow-run #4 is SUCCESS',
        footer: '<https://github.com/act10ns/slack|act10ns/slack> workflow-run #4',
        footer_icon: 'https://github.githubassets.com/favicon.ico',
        ts: expect.stringMatching(/[0-9]+/)
      },
      {
        color: '#5DADE2',
        fallback: '[GitHub] workflow-run #4 is SUCCESS',
        blocks: [
          {
            type: 'context',
            elements: [
              {type: 'image', image_url: 'https://avatars.githubusercontent.com/u/615057?v=4', alt_text: 'satterly'},
              {type: 'mrkdwn', text: '*<https://github.com/satterly|satterly>*'}
            ]
          },
          {
            type: 'section',
            text: {type: 'mrkdwn', text: 'Workflow build-test completed with success after 1 attempt'},
            accessory: {
              type: 'button',
              text: {type: 'plain_text', text: 'View'},
              value: 'workflow_run_1237076',
              url: 'https://github.com/act10ns/slack/actions/runs/1452342609',
              action_id: 'button-action'
            }
          },
          {
            type: 'section',
            fields: [
              {type: 'mrkdwn', text: '*Jobs*\nhttps://api.github.com/repos/act10ns/slack/actions/runs/1452342609/jobs'},
              {type: 'mrkdwn', text: '*Logs*\nhttps://api.github.com/repos/act10ns/slack/actions/runs/1452342609/logs'}
            ]
          },
          {
            type: 'context',
            elements: [
              {type: 'image', image_url: 'https://github.githubassets.com/favicon.ico', alt_text: 'github'},
              {
                type: 'mrkdwn',
                text: expect.stringMatching(
                  /<https:\/\/github.com\/act10ns\/slack|act10ns\/slack> build-test #8 | <!date^[0-9]+^{date_short_pretty} at {time}|[0-9]+>/
                )
              }
            ]
          }
        ]
      }
    ]
  })

  mockAxios.resetHistory()
  mockAxios.reset()
})
