import * as core from '@actions/core'
import * as yaml from 'js-yaml'
import {ConfigOptions, send} from './slack'
import {existsSync, readFileSync} from 'fs'

async function run(): Promise<void> {
  try {
    // debug output of environment variables and event payload
    for (const k of Object.keys(process.env).sort((a, b) => a.localeCompare(b))) {
      core.debug(`${k} = ${process.env[k]}`)
    }
    const event = process.env.GITHUB_EVENT_PATH as string
    const readEvent = (): object => JSON.parse(readFileSync(event, 'utf8'))
    core.debug(JSON.stringify(readEvent()))

    const configFile = core.getInput('config', {required: false})
    let config: ConfigOptions = {}
    try {
      core.info(`Reading config file ${configFile}...`)
      if (existsSync(configFile)) {
        config = yaml.load(readFileSync(configFile, 'utf-8'), {schema: yaml.FAILSAFE_SCHEMA}) as ConfigOptions
      }
    } catch (error) {
      if (error instanceof Error) core.info(error.message)
    }
    core.debug(yaml.dump(config))

    const url = core.getInput('webhook-url', {required: false}) || (process.env.SLACK_WEBHOOK_URL as string)
    const jobName = process.env.GITHUB_JOB as string
    const jobStatus = core.getInput('status', {required: true}).toUpperCase()
    const jobSteps = JSON.parse(core.getInput('steps', {required: false}) || '{}')
    const jobMatrix = JSON.parse(core.getInput('matrix', {required: false}) || '{}')
    const jobInputs = JSON.parse(core.getInput('inputs', {required: false}) || '{}')
    const channel = core.getInput('channel', {required: false})
    const message = core.getInput('message', {required: false})
    core.debug(`jobName: ${jobName}, jobStatus: ${jobStatus}`)
    core.debug(`channel: ${channel}, message: ${message}`)
    core.debug(`jobMatrix: ${JSON.stringify(jobMatrix)}`)
    core.debug(`jobInputs: ${JSON.stringify(jobInputs)}`)

    if (url) {
      await send(url, jobName, jobStatus, jobSteps, jobMatrix, jobInputs, channel, message, config)
      core.info(`Sent ${jobName} status of ${jobStatus} to Slack!`)
    } else {
      core.warning('No "SLACK_WEBHOOK_URL"s env or "webhook-url" input configured. Skip.')
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
