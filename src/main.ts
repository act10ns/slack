import * as core from '@actions/core'
import send from './slack'

async function run(): Promise<void> {

  try {
    const url = process.env.SLACK_WEBHOOK_URL as string
    const jobName = process.env.GITHUB_JOB as string

    const jobStatus = core.getInput('status', {required: true}).toUpperCase()
    const jobSteps = JSON.parse(core.getInput('steps', {required: false}) || '{}')
    const channel = core.getInput('channel', {required: false})

    await send(url, jobName, jobStatus, jobSteps, channel)
  } catch (error) {
    core.setFailed(error.message)
    core.debug(error.stack)
  }
}

run()
