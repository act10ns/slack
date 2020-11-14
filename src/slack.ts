import * as core from '@actions/core'
import * as github from '@actions/github'
import {EventPayloads} from '@octokit/webhooks'
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
  const eventName = process.env.GITHUB_EVENT_NAME
  const workflow = process.env.GITHUB_WORKFLOW
  const repositoryName = process.env.GITHUB_REPOSITORY
  const repositoryUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`

  const runId = process.env.GITHUB_RUN_ID
  const runNumber = process.env.GITHUB_RUN_NUMBER
  const workflowUrl = `${repositoryUrl}/actions/runs/${runId}`

  const sha = process.env.GITHUB_SHA as string
  const shortSha = sha.slice(0, 8)
  const branch = process.env.GITHUB_HEAD_REF || (process.env.GITHUB_REF?.replace('refs/heads/', '') as string)

  // const eventName = github.context.eventName
  let payload,
    action,
    ref = branch,
    refUrl,
    diffRef = shortSha,
    diffUrl,
    title,
    sender,
    ts = new Date()

  switch (eventName) {
    case 'create': {
      payload = github.context.payload as EventPayloads.WebhookPayloadCreate
      action = null
      ref = payload.ref.replace('refs/heads/', '')
      refUrl = payload.repository.html_url
      diffUrl = payload.repository.commits_url
      title = payload.description
      sender = payload.sender
      ts = new Date(payload.repository.updated_at)
      break
    }
    case 'delete': {
      payload = github.context.payload as EventPayloads.WebhookPayloadDelete
      action = null
      ref = payload.ref.replace('refs/heads/', '')
      refUrl = payload.repository.html_url
      diffUrl = payload.repository.commits_url
      title = `Deleted ${ref}`
      sender = payload.sender
      ts = new Date(payload.repository.updated_at)
      break
    }
    case 'issues':
      payload = github.context.payload as EventPayloads.WebhookPayloadIssues
    // falls through
    case 'issue_comment': {
      payload = github.context.payload as EventPayloads.WebhookPayloadIssueComment
      action = payload.action
      ref = `#${payload.issue.number}`
      refUrl = payload.issue.html_url
      diffUrl = payload.issue.comments_url
      title = payload.issue.title
      sender = payload.sender
      ts = new Date(payload.issue.updated_at)
      break
    }
    case 'pull_request': {
      payload = github.context.payload as EventPayloads.WebhookPayloadPullRequest
      action = payload.action
      ref = `#${payload.number}`
      refUrl = payload.pull_request.html_url
      diffUrl = `${payload.pull_request.html_url}/files`
      diffRef = payload.pull_request.head.ref
      title = payload.pull_request.title
      sender = payload.sender
      ts = new Date(payload.pull_request.updated_at)
      break
    }
    case 'push': {
      payload = github.context.payload as EventPayloads.WebhookPayloadPush
      action = null
      ref = payload.ref.replace('refs/heads/', '')
      refUrl = payload.repository.html_url
      diffUrl = payload.compare
      title = `${payload.commits.length} commits`
      sender = payload.sender
      ts = new Date(payload.commits[0].timestamp)
      break
    }
    case 'release': {
      payload = github.context.payload as EventPayloads.WebhookPayloadRelease
      action = payload.action
      ref = `${payload.release.id}`
      refUrl = payload.release.html_url
      diffUrl = payload.release.assets_url
      title = payload.release.name
      sender = payload.sender
      ts = new Date(payload.release.published_at)
      break
    }
    case 'schedule':
      action = null
      ref = (process.env.GITHUB_REF as string).replace('refs/heads/', '')
      refUrl = repositoryUrl
      diffUrl = repositoryUrl
      title = `Schedule \`${github.context.payload.schedule}\``
      sender = {
        login: 'github',
        html_url: 'https://github.com/github',
        avatar_url: 'https://avatars1.githubusercontent.com/u/9919?s=200&v=4'
      }
      ts = new Date()
      break
    case 'workflow_dispatch': {
      payload = github.context.payload as EventPayloads.WebhookPayloadWorkflowDispatch
      action = null
      ref = payload.ref.replace('refs/heads/', '')
      refUrl = null
      diffUrl = payload.inputs
      title = payload.workflow
      sender = payload.sender
      ts = new Date()
      break
    }
    default: {
      core.info('Unsupported webhook event type')
    }
  }

  const text =
    `*<${workflowUrl}|Workflow _${workflow}_ ` +
    `job _${jobName}_ triggered by _${eventName}_ is _${jobStatus}_>* ` +
    `for <${refUrl}|\`${ref}\`>\n` +
    `<${diffUrl}|\`${diffRef}\`> - ${title}`

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

  const message = {
    username: 'GitHub Action',
    icon_url: 'https://octodex.github.com/images/original.png',
    channel,
    attachments: [
      {
        fallback: `[GitHub]: [${repositoryName}] ${workflow} ${eventName} ${action ? `${action} ` : ''}${jobStatus}`,
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
