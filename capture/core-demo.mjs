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
export function demoData(name, input) {
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
