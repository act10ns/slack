import * as core from '@actions/core'
import * as github from '@actions/github'
import {IncomingWebhook} from '@slack/webhook'

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

async function run(): Promise<void> {
  try {
    const url: string = process.env.SLACK_WEBHOOK_URL!
    const jobName: string = process.env.GITHUB_JOB!

    const jobStatus = core.getInput('status', {required: true}).toUpperCase()
    const jobSteps = JSON.parse(core.getInput('steps', {required: false}) || '{}')
    const channel = core.getInput('channel', {required: false})

    // const runId: string = process.env.GITHUB_RUN_ID!
    // const runNumber: string = process.env.GITHUB_RUN_NUMBER!

    const context = (github as any).context
    core.debug(JSON.stringify(context, null, 2))

    const sender = context.payload.sender
    const repository = context.payload.repository
    const headCommit = context.payload.head_commit
    const branch: string = context.ref.replace('refs/heads/', '')

    const text = `*<${headCommit.url}/checks|Workflow _${context.workflow}_ ` +
    `job _${jobName}_ triggered by _${context.eventName}_ is _${jobStatus}_> ` +
    `for <${context.payload.compare}|\`${branch}\`>*\n` +
    `<${headCommit.url}|\`${headCommit.id.slice(0,8)}\`> - ${headCommit.message}`

    let checks: string[] = []
    Object.keys(jobSteps).forEach(step => {
      checks.push(`${stepIcon(jobSteps[step].outcome)} ${step}`)
    })

    let fields = []
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
      channel: channel,
      attachments: [
        {
          fallback: `[GitHub]: [${repository.full_name}] ${context.workflow} ${context.eventName} ${jobStatus}`,
          // color: '#2eb886',
          color: jobColor(jobStatus),
          // pretext: `${context.workflow} ${jobStatus} ${statusIcon}`,
          author_name: sender.login,
          author_link: sender.html_url,
          author_icon: sender.avatar_url,
          // title: `${context.eventName} to ${context.ref}`,
          mrkdwn_in: ['text' as const],
          text,
          fields,
          // image_url: 'https://octodex.github.com/images/welcometocat.png',
          // thumb_url: 'https://octodex.github.com/images/original.png',
          // thumb_url: 'https://octodex.github.com/images/codercat.jpg',
          footer: `<${repository.html_url}|${repository.full_name}>`,
          footer_icon: 'https://github.githubassets.com/favicon.ico',
          ts: repository.pushed_at
        }
      ]
    }

    const webhook = new IncomingWebhook(url)
    await webhook.send(message)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
