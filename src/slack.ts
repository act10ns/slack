import * as core from '@actions/core'
import * as github from '@actions/github'
import {Block, KnownBlock, MessageAttachment} from '@slack/types'
import {IncomingWebhook, IncomingWebhookResult} from '@slack/webhook'
import {EventPayloads} from '@octokit/webhooks'
import Handlebars from './handlebars'

const DEFAULT_USERNAME = 'GitHub Actions'
const DEFAULT_ICON_URL = 'https://octodex.github.com/images/original.png'
const DEFAULT_FOOTER_ICON = 'https://github.githubassets.com/favicon.ico'

interface ColorOptions {
  success?: string
  failure?: string
  cancelled?: string
  default?: string
}

function jobColor(status: string, opts?: ColorOptions): string {
  if (status.toLowerCase() === 'success') return opts?.success || 'good'
  if (status.toLowerCase() === 'failure') return opts?.failure || 'danger'
  if (status.toLowerCase() === 'cancelled') return opts?.cancelled || 'warning'
  return opts?.default || '#C0C0C0' // silver
}

interface IconOptions {
  success?: string
  failure?: string
  cancelled?: string
  skipped?: string
  default?: string
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
  if?: string
}

interface Actions {
  type: string
  elements: object[]
  block_id?: string
  if?: string
}

interface Context {
  type: string
  elements: object[]
  block_id?: string
  if?: string
}

interface Divider {
  type: string
  block_id?: string
  if?: string
}

interface File {
  type: string
  external_id: string
  source: string
  block_id?: string
  if?: string
}

interface Header {
  type: string
  text: object
  block_id?: string
  if?: string
}

interface Image {
  type: string
  image_url: string
  alt_text: string
  title?: object
  block_id?: string
  if?: string
}

interface Input {
  type: string
  label: object
  element: object
  dispatch_action?: boolean
  block_id?: string
  hint?: object
  optional?: boolean
  if?: string
}

interface Section {
  type: string
  text?: object
  block_id?: string
  fields?: object[]
  accessory?: object
  if?: string
}

export interface ConfigOptions {
  username?: string
  icon_url?: string
  pretext?: string
  title?: string
  title_link?: string
  text?: string
  fallback?: string
  fields?: Field[]
  blocks?: (Actions | Context | Divider | File | Header | Image | Input | Section)[]
  footer?: string
  colors?: object
  icons?: object
  unfurl_links?: boolean
  unfurl_media?: boolean
}

export async function send(
  url: string,
  jobName: string,
  jobStatus: string,
  jobSteps: object,
  jobMatrix: object,
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
  const workflowUrl = `${repositoryUrl}/actions?query=workflow:${workflow}`
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
      payload = github.context.payload
      action = process.env.GITHUB_ACTION?.startsWith('self') ? '' : process.env.GITHUB_ACTION
      ref = (process.env.GITHUB_REF as string).replace('refs/heads/', '')
      sender = payload?.sender
        ? payload.sender
        : {
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

  const defaultFields = []
  if (Object.entries(jobSteps).length) {
    defaultFields.push({
      title: 'Job Steps',
      value: '{{#each jobSteps}}{{icon this.outcome}} {{@key}}\n{{~/each}}',
      short: false,
      if: 'always()'
    })
  }
  if (Object.entries(jobMatrix).length) {
    defaultFields.push({
      title: 'Job Matrix',
      value: '{{#each jobMatrix}}{{@key}}: {{this}}\n{{~/each}}',
      short: false,
      if: 'always()'
    })
  }

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
    jobMatrix,
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
  const fieldsJson = fieldsTemplate(data)
  core.debug(fieldsJson.toString())
  const fields = JSON.parse(fieldsTemplate(data))
  const footer = footerTemplate(data)

  const filteredBlocks: object[] = []
  for (const block of opts?.blocks || []) {
    const block_if = block?.if || 'always()'
    if (block_if === 'always()' || block_if.startsWith(jobStatus.toLowerCase())) {
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const {if: string, ...blockWithoutIf} = block
      filteredBlocks.push(blockWithoutIf as KnownBlock | Block)
    }
  }
  const blocksTemplate = Handlebars.compile(JSON.stringify(filteredBlocks))

  // allow blocks to reference templated fields
  const blockContext = {
    pretext,
    title,
    title_link: opts?.title_link,
    text,
    fallback,
    footer,
    footer_icon: DEFAULT_FOOTER_ICON
  }
  const blocksJson = blocksTemplate({...data, ...blockContext})
  core.debug(blocksJson.toString())
  const blocks = JSON.parse(blocksTemplate({...data, ...blockContext}))

  const attachments: MessageAttachment[] = [
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
      footer_icon: DEFAULT_FOOTER_ICON,
      ts: ts.toString()
    }
  ]

  if (opts?.blocks) {
    attachments.push({
      color: jobColor(jobStatus, opts?.colors),
      fallback,
      blocks
    })
  }

  const postMessage = {
    username: opts?.username || DEFAULT_USERNAME,
    icon_url: opts?.icon_url || DEFAULT_ICON_URL,
    channel,
    attachments
  }
  core.debug(JSON.stringify(postMessage))

  const webhook = new IncomingWebhook(url)
  return await webhook.send(postMessage)
}
