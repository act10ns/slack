import {context} from '@actions/github'
import * as core from '@actions/core'
import {IncomingWebhook, IncomingWebhookResult} from '@slack/webhook'

function jobColor(status: string): string | undefined {
  if (status === 'SUCCESS') return 'good'
  if (status === 'FAILURE') return 'danger'
  if (status === 'CANCELLED') return 'warning'
}

function stepIcon(status: string): string {
  if (status === 'Success') return ':heavy_check_mark:'
  if (status === 'Failure') return ':x:'
  if (status === 'Cancelled') return ':exclamation:'
  if (status === 'Skipped') return ':no_entry_sign:'
  return `:grey_question: ${status}`
}

async function send(
  url: string,
  jobName: string,
  jobStatus: string,
  jobSteps: object,
  channel?: string
): Promise<IncomingWebhookResult> {
  core.debug(JSON.stringify(context.payload, null, 2))
  const sender = context.payload.sender
  const repository = context.payload.repository
  const headCommit = context.payload.head_commit
  const branch = context.ref?.replace('refs/heads/', '')

  const text =
    `*<${headCommit.url}/checks|Workflow _${context.workflow}_ ` +
    `job _${jobName}_ triggered by _${context.eventName}_ is _${jobStatus}_> ` +
    `for <${context.payload.compare}|\`${branch}\`>*\n` +
    `<${headCommit.url}|\`${headCommit.id.slice(0, 8)}\`> - ${headCommit.message}`

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

  const message = {
    username: 'GitHub Action',
    icon_url: 'https://octodex.github.com/images/original.png',
    channel,
    attachments: [
      {
        fallback: `[GitHub]: [${repository?.full_name}] ${context.workflow} ${context.eventName} ${jobStatus}`,
        color: jobColor(jobStatus),
        author_name: sender?.login,
        author_link: sender?.html_url,
        author_icon: sender?.avatar_url,
        mrkdwn_in: ['text' as const],
        text,
        fields,
        footer: `<${repository?.html_url}|${repository?.full_name}>`,
        footer_icon: 'https://github.githubassets.com/favicon.ico',
        ts: repository?.pushed_at
      }
    ]
  }
  core.debug(JSON.stringify(message, null, 2))

  const webhook = new IncomingWebhook(url)
  return await webhook.send(message)
}

export default send
