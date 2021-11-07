import * as core from '@actions/core'
import {existsSync, readFileSync} from 'fs'
import {send, ConfigOptions} from './slack'
import * as yaml from 'js-yaml'

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
      core.info(error.message)
    }
    core.debug(yaml.dump(config))

    const url = process.env.SLACK_WEBHOOK_URL as string
    const jobName = process.env.GITHUB_JOB as string
    const jobStatus = core.getInput('status', {required: true}).toUpperCase()
    const jobSteps = JSON.parse(core.getInput('steps', {required: false}) || '{}')
    const channel = core.getInput('channel', {required: false})
    const message = core.getInput('message', {required: false})
    core.debug(`jobName: ${jobName}, jobStatus: ${jobStatus}`)
    core.debug(`channel: ${channel}, message: ${message}`)

    if (url) {
      await send(url, jobName, jobStatus, jobSteps, channel, message, config)
      core.debug('Sent to Slack.')
    } else {
      core.info('No "SLACK_WEBHOOK_URL" secret configured. Skip.')
    }
  } catch (error) {
    core.setFailed(error.message)
    core.error(error.stack)
  }
}

run()
