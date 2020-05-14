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
const dump = JSON.parse(readFileSync('./__tests__/fixtures/push.json', 'utf-8'))
github.context.workflow = dump.workflow
github.context.eventName = dump.event_name
github.context.ref = dump.ref
github.context.payload = dump.event

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

  expect(mockAxios.history.post[0].data).toBe(
    JSON.stringify({
      username: 'GitHub Action',
      icon_url: 'https://octodex.github.com/images/original.png',
      channel: '@override',
      attachments: [
        {
          fallback: '[GitHub]: [act10ns/slacky] build-test push Success',
          author_name: 'satterly',
          author_link: 'https://github.com/satterly',
          author_icon: 'https://avatars0.githubusercontent.com/u/615057?v=4',
          mrkdwn_in: ['text'],
          text:
            '*<https://github.com/act10ns/slacky/commit/68d48876e0794fba714cb331a1624af6b20942d8/checks|Workflow _build-test_ job _Build and Test_ triggered by _push_ is _Success_> for <https://github.com/act10ns/slacky/compare/db9fe60430a6...68d48876e079|`master`>*\n<https://github.com/act10ns/slacky/commit/68d48876e0794fba714cb331a1624af6b20942d8|`68d48876`> - wip',
          fields: [],
          footer: '<https://github.com/act10ns/slacky|act10ns/slacky>',
          footer_icon: 'https://github.githubassets.com/favicon.ico',
          ts: 1589052147
        }
      ]
    })
  )

  mockAxios.resetHistory()
  mockAxios.reset()
})
