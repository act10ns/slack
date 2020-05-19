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
const dump = JSON.parse(readFileSync('./__tests__/fixtures/pull_request.json', 'utf-8'))
github.context.workflow = dump.workflow
github.context.eventName = dump.event_name
github.context.ref = dump.ref
github.context.payload = dump.event

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

  const res = await send(url, jobName, jobStatus, jobSteps, channel)
  await expect(res).toStrictEqual({text: {status: 'ok'}})

  expect(mockAxios.history.post[0].data).toBe(
    JSON.stringify({
      username: 'GitHub Action',
      icon_url: 'https://octodex.github.com/images/original.png',
      channel: '@override',
      attachments: [
        {
          fallback: '[GitHub]: [act10ns/slack] build-test pull_request Success',
          color: 'good',
          author_name: 'satterly',
          author_link: 'https://github.com/satterly',
          author_icon: 'https://avatars0.githubusercontent.com/u/615057?v=4',
          mrkdwn_in: ['text'],
          text:
            '*<https://github.com/act10ns/slack/pull/17/checks|Workflow _build-test_ job _Build and Test_ triggered by _pull_request_ is _Success_> for <https://github.com/act10ns/slack/pull/17/files|`rename-to-slack`>*\n<https://github.com/act10ns/slack/pull/17|`37b5e3e7`> - Rename to slack',
          fields: [],
          footer: '<https://github.com/act10ns/slack|act10ns/slack>',
          footer_icon: 'https://github.githubassets.com/favicon.ico',
          ts: '2020-05-14T08:59:31Z'
        }
      ]
    })
  )

  mockAxios.resetHistory()
  mockAxios.reset()
})
