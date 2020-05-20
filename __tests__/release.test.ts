import * as github from '@actions/github'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import send from '../src/slack'
import {readFileSync} from 'fs'

const url = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
const jobName = 'Build and Test'
const jobStatus = 'Success'
const jobSteps = {}
const channel = '@override'

// mock github context
const dump = JSON.parse(readFileSync('./__tests__/fixtures/release.json', 'utf-8'))

github.context.payload = dump.event
github.context.eventName = dump.event_name
github.context.sha = dump.sha
github.context.ref = dump.ref
github.context.workflow = dump.workflow
github.context.action = dump.action
github.context.actor = dump.actor

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

  const res = await send(url, jobName, jobStatus, jobSteps, channel)
  await expect(res).toStrictEqual({text: {status: 'ok'}})

  console.log(mockAxios.history.post[0].data)
  expect(mockAxios.history.post[0].data).toBe(
    JSON.stringify({
      username: 'GitHub Action',
      icon_url: 'https://octodex.github.com/images/original.png',
      channel: '@override',
      attachments: [
        {
          fallback: '[GitHub]: [act10ns/slack] build-test release Success',
          color: 'good',
          author_name: 'satterly',
          author_link: 'https://github.com/satterly',
          author_icon: 'https://avatars0.githubusercontent.com/u/615057?v=4',
          mrkdwn_in: ['text'],
          text:
            '*<https://github.com/act10ns/slack/commit/21bd808031091c03bebc3472e13e91acd0b1de9e/checks|Workflow _build-test_ job _Build and Test_ triggered by _release_ is _Success_>* for <https://github.com/act10ns/slack/commit/21bd808031091c03bebc3472e13e91acd0b1de9e|`v1.0.6`>\n<https://github.com/act10ns/slack/commit/21bd808031091c03bebc3472e13e91acd0b1de9e|`21bd8080`> - new branch or tag',
          fields: [],
          footer: '<https://github.com/act10ns/slack|act10ns/slack>',
          footer_icon: 'https://github.githubassets.com/favicon.ico',
          ts: '1589964626000'
        }
      ]
    })
  )

  mockAxios.resetHistory()
  mockAxios.reset()
})
