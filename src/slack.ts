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
  core.debug(JSON.stringify(context.payload, null, 2))

  const workflow = context.workflow
  const eventName = context.eventName
  const repository = context.payload.repository
  const repositoryName = repository?.full_name
  const repositoryUrl = repository?.html_url
  const sender = context.payload.sender

  if (context.payload.action) {
    core.debug('******** ACTION ********')
    core.debug(context.payload.action)
    // fields.push({
    //   title: 'Action',
    //   value: context.payload.action,
    //   short: false
    // })
  }

  if (context.payload.installation) {
    core.debug('******** INSTALLATION ********')

    core.debug(JSON.stringify(context.payload.installation, null, 2))
    // fields.push({
    //   title: 'Installation',
    //   value: JSON.stringify(context.payload.installation, null, 2),
    //   short: false
    // })
  }

  if (context.payload.issue) {
    core.debug('******** ISSUE ********')
    core.debug(JSON.stringify(context.payload.issue, null, 2))
    // fields.push({
    //   title: 'Issue',
    //   value: JSON.stringify(context.payload.issue, null, 2),
    //   short: false
    // })
  }

  if (context.payload.pull_request) {
    core.debug('******** PULL_REQUEST ********')
    core.debug(JSON.stringify(context.payload.pull_request, null, 2))
    core.debug(context.payload.pull_request.base.repo.pushed_at)
    core.debug(context.payload.pull_request.head.pushed_at)
    core.debug(context.payload.pull_request.updated_at)
    // fields.push({
    //   title: 'Pull Request',
    //   value: JSON.stringify(context.payload.pull_request, null, 2),
    //   short: false
    // })
  }

  if (context.payload.repository) {
    core.debug('******** REPO ********')
    core.debug(JSON.stringify(context.payload.repository, null, 2))
    core.debug(context.payload.repository.pushed_at)
    core.debug(context.payload.repository.updated_at)
    // fields.push({
    //   title: 'Repo',
    //   value: JSON.stringify(context.payload.repository, null, 2),
    //   short: false
    // })
  }

  if (context.payload.sender) {
    core.debug('******** SENDER ********')
    core.debug(JSON.stringify(context.payload.sender, null, 2))
    // fields.push({
    //   title: 'Sender',
    //   value: JSON.stringify(context.payload.sender, null, 2),
    //   short: false
    // })
  }

  let commit = {
    id: context.sha,
    url: `${repositoryUrl}/commit/${context.sha}`,
    message: 'new branch or tag'
  },
  branch = context.ref?.replace('refs/tags/', '').replace('refs/heads/', ''),
  compare = `${commit.url}` // FIXME - not sure this makes sense

if (context.eventName === 'push') {
    commit = context.payload.head_commit
    branch = context.ref?.replace('refs/heads/', '')
    compare = context.payload.compare
  } else if (context.eventName === 'pull_request') {
    commit = {
      id: context.payload.pull_request?.head.sha,
      url: context.payload.pull_request?.html_url || '',
      message: context.payload.pull_request?.title
    }
    branch = context.payload.pull_request?.head.ref
    compare = `${commit.url}/files`
  } else {
    core.setFailed(`Unsupported event type "${context.eventName}"`)
  }

  const text =
    `*<${commit.url}/checks|Workflow _${workflow}_ ` +
    `job _${jobName}_ triggered by _${eventName}_ is _${jobStatus}_>* ` +
    `for <${compare}|\`${branch}\`>\n` +
    `<${commit.url}|\`${commit.id.slice(0, 8)}\`> - ${commit.message}`

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

  const ts = new Date(context.payload.repository?.pushed_at)

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
        footer: `<${repositoryUrl}|${repositoryName}>`,
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
