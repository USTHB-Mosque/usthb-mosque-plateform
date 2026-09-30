import { spawn, spawnSync } from 'node:child_process'

const name = process.env.E2E_MAILPIT_CONTAINER_NAME || 'usthb-e2e-mailpit'
const smtpPort = process.env.E2E_MAILPIT_SMTP_PORT || '54325'
const apiPort = process.env.E2E_MAILPIT_API_PORT || '54326'
// Recover from a prior run that was interrupted before global teardown.
spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore' })
const container = spawn(
  'docker',
  [
    'run',
    '--rm',
    '--name',
    name,
    '-p',
    `127.0.0.1:${smtpPort}:1025`,
    '-p',
    `127.0.0.1:${apiPort}:8025`,
    'axllent/mailpit:v1.30.2',
  ],
  { stdio: 'inherit' },
)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    // Playwright terminates the webServer command after the suite; stop the
    // attached container as well so the next run can bind the same ports.
    const stop = spawn('docker', ['stop', name], { stdio: 'ignore' })
    stop.on('exit', () => process.exit(0))
  })
}

container.on('exit', (code) => process.exit(code ?? 1))
