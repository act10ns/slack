import * as core from '@actions/core'
import * as github from '@actions/github'
import {IncomingWebhook, IncomingWebhookResult} from '@slack/webhook'
import {EventPayloads} from '@octokit/webhooks'
import Handlebars from './handlebars'

interface ColorOptions {
  success?: string | undefined
  failure?: string | undefined
  cancelled?: string | undefined
  default?: string | undefined
}

function jobColor(status: string, opts?: ColorOptions): string | undefined {
  if (status.toLowerCase() === 'success') return opts?.success || 'good'
  if (status.toLowerCase() === 'failure') return opts?.failure || 'danger'
  if (status.toLowerCase() === 'cancelled') return opts?.cancelled || 'warning'
  return opts?.default || '#C0C0C0' // silver
}

interface IconOptions {
  success?: string | undefined
  failure?: string | undefined
  cancelled?: string | undefined
  skipped?: string | undefined
  default?: string | undefined
}

function stepIcon(status: string, opts?: IconOptions): string {
  if (status.toLowerCase() === 'success') return opts?.success || ':heavy_check_mark:'
  if (status.toLowerCase() === 'failure') return opts?.failure || ':x:'
  if (status.toLowerCase() === 'cancelled') return opts?.cancelled || ':exclamation:'
  if (status.toLowerCase() === 'skipped') return opts?.skipped || ':no_entry_sign:'
  return `:grey_question: ${status}`
}

interface Field {
  title: string
  value: string
  short: boolean
  if?: string | undefined
}

export interface ConfigOptions {
  username?: string | undefined
  icon_url?: string | undefined
  pretext?: string | undefined
  title?: string | undefined
  title_link?: string | undefined
  text?: string | undefined
  fallback?: string | undefined
  fields?: Field[] | undefined
  footer?: string | undefined
  colors?: object | undefined
  icons?: object | undefined
  unfurl_links?: boolean | undefined
  unfurl_media?: boolean | undefined
}

export async function send(
  url: string,
  jobName: string,
  jobStatus: string,
  jobSteps: object,
  channel?: string,
  message?: string,
  opts?: ConfigOptions
): Promise<IncomingWebhookResult> {
  const eventName = process.env.GITHUB_EVENT_NAME
  const workflow = process.env.GITHUB_WORKFLOW
  const repositoryName = process.env.GITHUB_REPOSITORY
  const repositoryUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`

  const runId = process.env.GITHUB_RUN_ID
  const runNumber = process.env.GITHUB_RUN_NUMBER
  const workflowUrl = `${repositoryUrl}/actions?query=${workflow}`
  const workflowRunUrl = `${repositoryUrl}/actions/runs/${runId}`

  const sha = process.env.GITHUB_SHA as string
  const shortSha = sha.slice(0, 8)
  const branch = process.env.GITHUB_HEAD_REF || (process.env.GITHUB_REF?.replace('refs/heads/', '') as string)
  const refType = process.env.GITHUB_REF_TYPE
  const actor = process.env.GITHUB_ACTOR

  let payload
  let action
  let ref = branch
  let refUrl = `${repositoryUrl}/commits/${branch}`
  let diffRef = shortSha
  let diffUrl = `${repositoryUrl}/commit/${shortSha}`
  let description
  let sender
  const ts = Math.round(new Date().getTime() / 1000)

  switch (eventName) {
    case 'issues':
      payload = github.context.payload as EventPayloads.WebhookPayloadIssues
    // falls through
    case 'issue_comment': {
      payload = github.context.payload as EventPayloads.WebhookPayloadIssueComment
      action = payload.action
      ref = `#${payload.issue.number}`
      refUrl = payload.issue.html_url
      diffUrl = payload.issue.comments_url
      description = payload.issue.title
      sender = payload.sender
      // ts = new Date(payload.issue.updated_at).getTime() / 1000
      break
    }
    case 'pull_request': {
      payload = github.context.payload as EventPayloads.WebhookPayloadPullRequest
      action = payload.action
      ref = `#${payload.number}`
      refUrl = payload.pull_request.html_url
      diffUrl = `${payload.pull_request.html_url}/files`
      diffRef = payload.pull_request.head.ref
      description = payload.pull_request.title
      sender = payload.sender
      // ts = new Date(payload.pull_request.updated_at).getTime() / 1000
      break
    }
    case 'push': {
      payload = github.context.payload as EventPayloads.WebhookPayloadPush
      action = null
      ref = payload.ref.replace('refs/heads/', '')
      diffUrl = payload.compare
      description = `${payload.commits.length} commits`
      sender = payload.sender
      // ts = new Date(payload.commits[0].timestamp).getTime() / 1000
      break
    }
    case 'schedule':
      action = null
      ref = (process.env.GITHUB_REF as string).replace('refs/heads/', '')
      description = `Schedule \`${github.context.payload.schedule}\``
      sender = {
        login: 'github',
        html_url: 'https://github.com/github',
        avatar_url: 'https://avatars1.githubusercontent.com/u/9919?s=200&v=4'
      }
      break
    default: {
      core.info('Unsupported webhook event type. Using environment variables.')
      action = process.env.GITHUB_ACTION?.startsWith('self') ? '' : process.env.GITHUB_ACTION
      ref = (process.env.GITHUB_REF as string).replace('refs/heads/', '')
      sender = {
        login: actor,
        html_url: `https://github.com/${actor}`,
        avatar_url: ''
      }
    }
  }

  Handlebars.registerHelper('icon', status => stepIcon(status, opts?.icons))

  const pretextTemplate = Handlebars.compile(opts?.pretext || '')
  const titleTemplate = Handlebars.compile(opts?.title || '')

  const defaultText = `${
    '*<{{{workflowUrl}}}|Workflow _{{workflow}}_ ' +
    'job _{{jobName}}_ triggered by _{{eventName}}_ is _{{jobStatus}}_>* ' +
    'for <{{refUrl}}|`{{ref}}`>\n'
  }${description ? '<{{diffUrl}}|`{{diffRef}}`> - {{{description}}}' : ''}`
  const textTemplate = Handlebars.compile(message || opts?.text || defaultText)

  const defaultFallback = `[GitHub]: [{{repositoryName}}] {{workflow}} {{eventName}} ${
    action ? '{{action}} ' : ''
  }{{jobStatus}}`
  const fallbackTemplate = Handlebars.compile(opts?.fallback || defaultFallback)

  const defaultFields = Object.entries(jobSteps).length
    ? [
        {
          title: 'Job Steps',
          value: '{{#each jobSteps}}{{icon this.outcome}} {{@key}}\n{{~/each}}',
          short: false,
          if: 'always()'
        }
      ]
    : []

  const filteredFields: object[] = []
  for (const field of opts?.fields || defaultFields) {
    const field_if = field?.if || 'always()'
    if (field_if === 'always()' || field_if.startsWith(jobStatus.toLowerCase())) {
      filteredFields.push({
        title: field.title,
        value: field.value,
        short: JSON.parse(field.short.toString())
      })
    }
  }
  const fieldsTemplate = Handlebars.compile(JSON.stringify(filteredFields))

  const defaultFooter = '<{{repositoryUrl}}|{{repositoryName}}> #{{runNumber}}'
  const footerTemplate = Handlebars.compile(opts?.footer || defaultFooter)

  const data = {
    env: process.env,
    payload: payload || {},
    jobName,
    jobStatus,
    jobSteps,
    eventName,
    workflow,
    workflowUrl,
    workflowRunUrl,
    repositoryName,
    repositoryUrl,
    runId,
    runNumber,
    sha,
    shortSha,
    branch,
    actor,
    action,
    ref,
    refType,
    refUrl,
    diffRef,
    diffUrl,
    description,
    sender,
    ts
  }

  const pretext = pretextTemplate(data)
  const title = titleTemplate(data)
  const text = textTemplate(data)
  const fallback = fallbackTemplate(data)
  const fields = JSON.parse(fieldsTemplate(data))
  const footer = footerTemplate(data)

  const postMessage = {
    username: opts?.username || 'GitHub Actions',
    icon_url: opts?.icon_url || 'https://octodex.github.com/images/original.png',
    channel,
    attachments: [
      {
        mrkdwn_in: ['pretext' as const, 'text' as const, 'fields' as const],
        color: jobColor(jobStatus, opts?.colors),
        pretext,
        author_name: sender?.login,
        author_link: sender?.html_url,
        author_icon: sender?.avatar_url,
        title,
        title_link: opts?.title_link,
        text,
        fields,
        fallback,
        footer,
        footer_icon: 'https://github.githubassets.com/favicon.ico',
        ts: ts.toString()
      }
    ]
  }
  core.debug(JSON.stringify(postMessage, null, 2))

  const webhook = new IncomingWebhook(url)
  return await webhook.send(postMessage)
}
