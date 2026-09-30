// Synthetic example schedules and sleep. Rendered by the unmodified Core UI.
// Fixed local date keeps the timeline repeatable; never reads a real bed's data.
import { richData, capturedTime } from './core-rich-data.mjs'
export { capturedTime }
const jobs = ['left', 'right']
  .flatMap((side) =>
    [
      ['22:00', 78, '2026-09-30'],
      ['23:15', 74, '2026-09-30'],
      ['03:00', 70, '2026-10-01'],
      ['07:00', 80, '2026-10-01'],
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
  const rich = richData(name, input)
  if (rich !== undefined) return rich
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
  if (name === 'biometrics.getVitalsSummary')
    return { avgHeartRate: 56, avgHRV: 48, avgBreathingRate: 14 }
  if (name === 'health.thermalHistory')
    return {
      bucketSec: 240,
      points: Array.from({ length: 136 }, (_, i) => ({
        t: +new Date('2026-09-29T22:00:00-07:00') + i * 240000,
        leftTarget: 74,
        rightTarget: 72,
        leftBed: 74 + Math.sin(i / 12),
        rightBed: 72 + Math.sin(i / 13),
        leftSurface: 74 + Math.sin(i / 12),
        rightSurface: 72 + Math.sin(i / 13),
        leftWater: 76 + Math.sin(i / 12),
        rightWater: 70 + Math.sin(i / 13),
        leftRpm: 2200,
        rightRpm: 2200,
        ambient: 75,
        heatsink: 86,
      })),
    }
}
