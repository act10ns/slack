import {context} from '@actions/github'
import * as core from '@actions/core'
import {IncomingWebhook, IncomingWebhookResult} from '@slack/webhook'

function jobColor(status: string): string | undefined {
  if (status.toLowerCase() === 'success') return 'good'
  if (status.toLowerCase() === 'failure') return 'danger'
  if (status.toLowerCase() === 'cancelled') return 'warning'
}

function stepIcon(status: string): string {
  if (status.toLowerCase() === 'success') return ':heavy_check_mark:'
  if (status.toLowerCase() === 'failure') return ':x:'
  if (status.toLowerCase() === 'cancelled') return ':exclamation:'
  if (status.toLowerCase() === 'skipped') return ':no_entry_sign:'
  return `:grey_question: ${status}`
}

async function send(
  url: string,
  jobName: string,
  jobStatus: string,
  jobSteps: object,
  channel?: string
): Promise<IncomingWebhookResult> {
  const workflow = process.env.GITHUB_WORKFLOW
  const eventName = process.env.GITHUB_EVENT_NAME
  const repositoryName = process.env.GITHUB_REPOSITORY
  const repositoryUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`

  const runId = process.env.GITHUB_RUN_ID
  const runNumber = process.env.GITHUB_RUN_NUMBER

  core.debug(JSON.stringify(context.payload))

  const commit = process.env.GITHUB_SHA as string
  const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF?.replace('refs/heads/', '') as string

  let ref = branch
  let refUrl = `${repositoryUrl}/tree/${ref}`
  let diffUrl = context.payload?.compare ? context.payload.compare : ''
  let title = 'no title'
  let ts = new Date()

  if (context?.issue.number) {
    ref = `#${context.issue.number}`
    refUrl = `${repositoryUrl}/pull/${context.issue.number}`
    diffUrl = `${refUrl}/files`
    title = context.payload.pull_request?.title
    ts = new Date(context.payload.pull_request?.updated_at)
  }

  const text =
    `*<${repositoryUrl}/actions/runs/${runId}|Workflow _${workflow}_ ` +
    `job _${jobName}_ triggered by _${eventName}_ is _${jobStatus}_>* ` +
    `for <${refUrl}|\`${ref}\`>\n` +
    `<${diffUrl}|\`${commit.slice(0, 8)}\`> - ${title}`

  // add job steps, if provided
  const checks: string[] = []
  // eslint-disable-next-line github/array-foreach
  Object.entries(jobSteps).forEach(([step, status]) => {
    checks.push(`${stepIcon(status.outcome)} ${step}`)
  })
  const fields = []
  if (checks.length) {
    fields.push({
      title: 'Job Steps',
      value: checks.join('\n'),
      short: false
    })
  }

  let sender
  if (context.payload?.sender) {
    sender = context.payload?.sender
  } else {
    sender = {
      login: process.env.GITHUB_ACTOR,
      html_url: null,
      avatar_url: null
    }
  }

  const message = {
    username: 'GitHub Action',
    icon_url: 'https://octodex.github.com/images/original.png',
    channel,
    attachments: [
      {
        fallback: `[GitHub]: [${repositoryName}] ${workflow} ${eventName} ${jobStatus}`,
        color: jobColor(jobStatus),
        author_name: sender?.login,
        author_link: sender?.html_url,
        author_icon: sender?.avatar_url,
        mrkdwn_in: ['text' as const],
        text,
        fields,
        footer: `<${repositoryUrl}|${repositoryName}> #${runNumber}`,
        footer_icon: 'https://github.githubassets.com/favicon.ico',
        ts: ts.getTime().toString()
      }
    ]
  }
  core.debug(JSON.stringify(message, null, 2))

  const webhook = new IncomingWebhook(url)
  return await webhook.send(message)
}

export default send
