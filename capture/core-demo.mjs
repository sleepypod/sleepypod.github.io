// Synthetic example schedules and sleep. Rendered by the unmodified Core UI.
// Fixed local date keeps the timeline repeatable; never reads a real bed's data.
export const capturedTime = '2026-09-28T19:00:00-07:00'
const enteredBedAt = new Date('2026-09-27T23:15:00-07:00')
const leftBedAt = new Date('2026-09-28T07:10:00-07:00')
const sleep = {
  enteredBedAt,
  leftBedAt,
  sleepDurationSeconds: 27900,
  timesExitedBed: 1,
  presentIntervals: [[+enteredBedAt / 1000, +leftBedAt / 1000]],
}
const jobs = ['left', 'right']
  .flatMap((side) =>
    [
      ['22:00', 78, '2026-09-28'],
      ['23:15', 74, '2026-09-28'],
      ['03:00', 70, '2026-09-29'],
      ['07:00', 80, '2026-09-29'],
    ].map(([time, temperature, date]) => ({
      id: `${side}-${time}`,
      type: 'temperature',
      side,
      schedule: `${Number(time.split(':')[1])} ${Number(time.split(':')[0])} * * *`,
      oneTime: false,
      nextRun: +new Date(`${date}T${time}:00-07:00`),
      targetTempF: temperature + (side === 'right' ? -2 : 0),
      brightness: null,
    })),
  )
  .sort((a, b) => a.nextRun - b.nextRun)
export function demoData(name, input) {
  if (name === 'health.dataPath')
    return {
      at: +new Date(capturedTime),
      occupancy: { left: 'empty', right: 'empty' },
      nodes: [],
      edges: [],
      verdict: {
        tone: 'warn',
        headline: 'Documentation capture: no physical Pod connected',
        nodeId: null,
        lastGoodId: null,
        fix: null,
        also: [],
      },
    }
  if (name === 'health.hardware')
    return {
      status: 'degraded',
      socketPath: '/tmp/sleepypod-docs-no-device.sock',
      latencyMs: 0,
      error: 'Documentation capture: no physical Pod connected',
    }
  if (name === 'health.scheduler')
    return {
      enabled: true,
      healthy: true,
      jobCounts: {
        temperature: 8,
        powerOn: 0,
        powerOff: 0,
        alarm: 0,
        prime: 0,
        reboot: 0,
        total: 8,
      },
      upcomingJobs: jobs.map((job) => ({ ...job, nextRun: new Date(job.nextRun).toISOString() })),
    }
  if (name === 'health.schedulerTimeline')
    return {
      enabled: true,
      timezone: 'America/Los_Angeles',
      now: +new Date(capturedTime),
      jobs,
      occurrences: Array.from({ length: 7 }, (_, day) =>
        jobs.map((job) => ({
          id: job.id,
          type: job.type,
          side: job.side,
          at: job.nextRun + day * 86400000,
          targetTempF: job.targetTempF,
          brightness: null,
        })),
      )
        .sort((a, b) => a.nextRun - b.nextRun)
        .flat(),
    }

  if (name === 'schedules.getAll') {
    const offset = input?.side === 'right' ? -2 : 0
    return {
      temperature: [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ].flatMap((dayOfWeek) =>
        [
          ['22:00', 78],
          ['23:15', 74],
          ['03:00', 70],
          ['07:00', 80],
        ].map(([time, temperature]) => ({
          dayOfWeek,
          time,
          temperature: temperature + offset,
          enabled: true,
        })),
      ),
      alarm: [],
      power: [],
    }
  }
  if (name === 'biometrics.getLatestSleep') return sleep
  if (name === 'biometrics.getSleepRecords') return [sleep]
  if (name === 'biometrics.getVitalsSummary')
    return { avgHeartRate: 56, avgHRV: 48, avgBreathingRate: 14 }
  if (name === 'health.thermalHistory')
    return {
      bucketSec: 240,
      points: Array.from({ length: 136 }, (_, i) => ({
        t: +new Date('2026-09-27T22:00:00-07:00') + i * 240000,
        leftTarget: 74,
        rightTarget: 72,
      })),
    }
}
