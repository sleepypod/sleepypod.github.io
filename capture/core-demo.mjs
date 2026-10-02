// Synthetic example schedules and sleep. Rendered by the unmodified Core UI.
// Fixed local date keeps the timeline repeatable; never reads a real bed's data.
import { richData, capturedTime } from './core-rich-data.mjs'
import settings from './core-settings.json' with { type: 'json' }
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
  .concat({
    // Weekday wake alarm on the left side; matches schedules.getAll below.
    id: 'left-alarm-06:45',
    type: 'alarm',
    side: 'left',
    schedule: '45 6 * * 1-5',
    oneTime: false,
    nextRun: +new Date('2026-10-01T06:45:00-07:00'),
    targetTempF: 82,
    brightness: null,
  })
  .sort((a, b) => a.nextRun - b.nextRun)
export function demoData(name, input) {
  const rich = richData(name, input)
  if (rich !== undefined) return rich
  if (name === 'homekit.getStatus') return settings.homekit
  if (name === 'mqtt.getSettings') return settings.mqtt.settings
  if (name === 'mqtt.getStatus') return settings.mqtt.status
  if (name === 'archivePush.getConfig') return settings.archivePush
  if (name === 'health.scheduler')
    return {
      enabled: true,
      healthy: true,
      jobCounts: {
        temperature: 8,
        powerOn: 0,
        powerOff: 0,
        alarm: 1,
        prime: 0,
        reboot: 0,
        total: 9,
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
        // The alarm skips the weekend (fixture days 2 and 3 are Sat and Sun).
        jobs
          .filter((job) => job.type !== 'alarm' || (day !== 2 && day !== 3))
          .map((job) => ({
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
      alarm:
        input?.side === 'right'
          ? []
          : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((dayOfWeek, i) => ({
              id: i + 1,
              side: 'left',
              dayOfWeek,
              time: '06:45',
              vibrationIntensity: 100,
              vibrationPattern: 'rise',
              duration: 30,
              alarmTemperature: 82,
              enabled: true,
              createdAt: new Date(capturedTime),
              updatedAt: new Date(capturedTime),
            })),
      power: [],
    }
  }
  if (name === 'biometrics.getVitalsSummary')
    return { avgHeartRate: 56, avgHRV: 48, avgBreathingRate: 14 }
  if (name === 'health.thermalHistory') {
    // Matches Core's v3 contract: range-sized buckets ending at the fixture time.
    const seconds = { '1h': 3600, '12h': 43200, '24h': 86400, '48h': 172800, '7d': 604800 }
    const range = input?.range || '12h'
    const bucketSec = Math.max(60, Math.ceil(seconds[range] / 360))
    const to = +new Date(capturedTime)
    const from = to - seconds[range] * 1000
    const count = Math.floor((to - from) / (bucketSec * 1000))
    return {
      range,
      from,
      to,
      bucketSec,
      points: Array.from({ length: count }, (_, i) => {
        const t = from + i * bucketSec * 1000
        const m = t / 60000
        return {
          t,
          leftTarget: 74,
          rightTarget: 72,
          leftBed: 74 + Math.sin(m / 48),
          rightBed: 72 + Math.sin(m / 52),
          leftSurface: 74 + Math.sin(m / 48),
          rightSurface: 72 + Math.sin(m / 52),
          leftWater: 76 + Math.sin(m / 48),
          rightWater: 70 + Math.sin(m / 52),
          leftRpm: 2200,
          rightRpm: 2200,
          ambient: 75,
          heatsink: 86,
        }
      }),
      powerOn: [
        { side: 'left', at: to - 3600000 },
        { side: 'right', at: to - 5 * 3600000 },
      ],
      available: { bedTarget: true, water: true, surface: true, pump: true, hub: true },
      bedTargetSince: from,
    }
  }
}

// Layer synthetic tap gestures over the disposable database's real settings.
export function augmentData(name, data) {
  if (name === 'databases.overview')
    return {
      ...data,
      dataDir: '/persistent/sleepypod-data',
      databases: data.databases.map((db) => ({
        ...db,
        path: `/persistent/sleepypod-data/${db.path.split('/').pop()}`,
        integrity: {
          scheduled: { status: 'ok', checkedAt: capturedTime, latencyMs: 4 },
          manual: null,
        },
      })),
    }
  if (name !== 'settings.getAll') return data
  const at = new Date(capturedTime)
  const gestures = Object.fromEntries(
    ['left', 'right'].map((side, s) => [
      side,
      settings.gestures[side].map((g, i) => ({
        id: s * 10 + i + 1,
        side,
        temperatureChange: null,
        temperatureAmount: null,
        alarmBehavior: null,
        alarmSnoozeDuration: null,
        alarmInactiveBehavior: null,
        ...g,
        createdAt: at,
        updatedAt: at,
      })),
    ]),
  )
  // Maintenance and protection match the health.maintenance fixture.
  const device = {
    ...data.device,
    pumpStallProtectionEnabled: true,
    primePodDaily: true,
    ledNightModeEnabled: true,
    ledDayBrightness: 60,
    ledNightBrightness: 0,
  }
  return { ...data, device, gestures }
}
