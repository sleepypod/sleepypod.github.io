// Run with Core's tsx and tsconfig, from the pinned clean Core checkout.
// Pure product algorithms turn deterministic synthetic inputs into API fixtures.
// CommonJS on purpose: the backtest module reaches cron-parser, whose named
// exports Node's ESM loader cannot see.
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const core = process.cwd()
const { evaluateDataPath, NODES } = require(resolve(core, 'src/lib/dataPath.ts'))
const { templateRule, toAST } = require(resolve(core, 'src/components/Autopilot/builderModel.ts'))
const {
  classifySleepStages,
  mergeIntoBlocks,
  calculateDistribution,
  calculateQualityScore,
} = require(resolve(core, 'src/lib/sleep-stages.ts'))
const { runBacktest } = require(resolve(core, 'src/automation/backtest.ts'))
const capturedTime = '2026-09-30T23:40:00-07:00'
const now = +new Date(capturedTime)
const health = evaluateDataPath({
  now,
  units: Object.fromEntries(
    ['piezo-processor', 'sleep-detector', 'environment-monitor'].map((n) => [
      `sleepypod-${n}.service`,
      true,
    ]),
  ),
  frameTimes: { 'piezo-dual': now - 1000, capSense2: now - 2000, bedTemp2: now - 4000 },
  sensorSource: 'raw',
  coreUptimeMs: 86400000,
  dacSocket: { ok: true, latencyMs: 2 },
  dacMonitor: { status: 'running', lastPollAt: now - 1000, pollIntervalMs: 1000 },
  database: { ok: true, latencyMs: 1 },
  scheduler: { enabled: true, jobs: 8, healthy: true },
  occupied: { left: true, right: true },
  stillness: { left: { rows: 120, maxScore: 260 }, right: { rows: 120, maxScore: 230 } },
  lastVitalAt: { left: now - 18000, right: now - 22000 },
  lastMovementAt: { left: now - 25000, right: now - 25000 },
  lastEnvAt: now - 30000,
  thermal: [
    { side: 'left', verdict: 'delivering' },
    { side: 'right', verdict: 'delivering' },
  ],
  streamClients: 1,
  streamPort: 3001,
})
const from = now - 86400000
const history = {
  from,
  to: now,
  recordedSince: from,
  checks: NODES.map((n: any) => ({
    id: n.id,
    label: n.label,
    healthyShare: 1,
    incidents: 0,
    runs: [{ status: 'ok', start: from, end: now }],
  })),
  incidents: [],
  gaps: [],
}
// One resolved, synthetic service stall gives the history a useful explanation.
for (const id of ['piezo-processor', 'out-vitals']) {
  const c = history.checks.find((c: any) => c.id === id)!
  c.runs = [
    { status: 'ok', start: from, end: from + 7200000 },
    { status: 'stale', start: from + 7200000, end: from + 7920000 },
    { status: 'ok', start: from + 7920000, end: now },
  ]
  c.healthyShare = 1 - 720000 / 86400000
  c.incidents = 1
  history.incidents.push({
    checkId: id,
    label: c.label,
    status: 'stale',
    start: from + 7200000,
    end: from + 7920000,
    detail: 'Example: vitals paused for 12 minutes, then resumed.',
  } as never)
}
const records: any[] = []
const vitals: any[] = []
const movement: any[] = []
const stages: any = {}
for (let day = 0; day < 7; day++) {
  const start = +new Date('2026-09-29T23:10:00-07:00') - day * 86400000
  const count = 94 - (day % 3) * 3
  const end = start + count * 300000
  const vs = []
  const ms = []
  for (let i = 0; i < count; i++) {
    const cycle = i % 18
    const awake = i < 2 || i >= count - 2 || i === 48 || i === 49
    const deep = cycle >= 4 && cycle < 9 && i < 60
    const rem = cycle >= 13
    vs.push({
      timestamp: new Date(start + i * 300000),
      heartRate: Math.round((awake ? 69 : deep ? 49 : rem ? 62 : 56) + 2 * Math.sin(i * 0.7 + day)),
      hrv: Math.round((rem ? 22 : deep ? 65 : 48) + 4 * Math.cos(i)),
      breathingRate: Math.round((deep ? 12.5 : 14) + Math.sin(i * 0.4) * 1.3),
    })
    ms.push({
      timestamp: new Date(start + i * 300000),
      totalMovement: awake ? 240 + 20 * Math.sin(i) : 8 + Math.round(10 * (1 + Math.sin(i * 0.8))),
    })
  }
  const epochs = classifySleepStages(vs, ms, 0.9)
  const distribution = calculateDistribution(epochs)
  const asleep = epochs
    .filter((e: any) => e.stage !== 'wake')
    .reduce((s: number, e: any) => s + e.duration, 0)
  const record = {
    id: day + 1,
    enteredBedAt: new Date(start),
    leftBedAt: new Date(end),
    sleepDurationSeconds: asleep / 1000,
    timesExitedBed: 1,
    presentIntervals: [
      [start / 1000, (start + 48 * 300000) / 1000],
      [(start + 50 * 300000) / 1000, end / 1000],
    ],
  }
  records.push(record)
  vitals.push(...vs)
  movement.push(...ms)
  stages[record.id] = {
    epochs,
    blocks: mergeIntoBlocks(epochs),
    distribution,
    qualityScore: calculateQualityScore(distribution, 0.9),
    totalSleepMs: asleep,
    sleepRecordId: record.id,
    enteredBedAt: start,
    leftBedAt: end,
  }
}
const rules = ['hold-room', 'hold-room', 'water-low', 'restless'].map((id, i) => {
  const b = templateRule(id)
  if (!b) throw new Error('Unknown template ' + id)
  b.enabled = true
  b.mode = i === 1 ? 'dryrun' : 'active'
  b.side = i === 1 ? 'right' : 'left'
  if (i === 1) b.name = 'Preview room +3°F'
  return { ...toAST(b), id: i + 1, createdAt: capturedTime, updatedAt: capturedTime }
})
// Real backtests: Core's own replay engine over the synthetic nights. The
// room cools from 73°F to 67°F overnight so the policy rule has something to
// track; movement is the same series the sleep classifier consumed.
const timezone = 'America/Los_Angeles'
const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' })
const monthDay = new Intl.DateTimeFormat('en-US', {
  timeZone: timezone,
  month: 'short',
  day: 'numeric',
})
const nights = records.slice(0, 5).map((r, i) => ({
  sleepRecordId: r.id,
  label: i === 0 ? 'Last night' : weekday.format(r.enteredBedAt),
  date: monthDay.format(r.enteredBedAt),
  startMs: +r.enteredBedAt,
  endMs: +r.leftBedAt,
}))
const seriesFor = (startMs: number, endMs: number, side: string) => {
  const mv = movement
    .filter((m) => +m.timestamp >= startMs && +m.timestamp <= endMs)
    .map((m) => ({ t: +m.timestamp, v: m.totalMovement }))
  const ambient = []
  for (let t = startMs; t <= endMs; t += 300000) {
    const f = (t - startMs) / (endMs - startMs)
    ambient.push({
      t,
      v: Math.round((73 - 6 * Math.sin(f * Math.PI) ** 0.7 + 0.4 * Math.sin(f * 40)) * 10) / 10,
    })
  }
  return { [`${side}.movement`]: mv, 'ambient.temperature': ambient }
}
const astOf = (r: any) => ({
  side: r.side,
  cooldownMin: r.cooldownMin,
  trigger: r.trigger,
  conditions: r.conditions,
  actions: r.actions,
})
const backtests: Record<string, any> = {}
const summaries: any[] = []
for (const r of rules) {
  const side = r.side === 'right' ? 'right' : 'left'
  let wouldFire = 0
  let peak: number | null = null
  let low: number | null = null
  let threshold: number | null = null
  for (const n of nights) {
    const result = runBacktest({
      rule: { ...astOf(r), side },
      timezone,
      startMs: n.startMs,
      endMs: n.endMs,
      stepMin: 2,
      series: seriesFor(n.startMs, n.endMs, side),
    })
    backtests[`${r.id}:${n.sleepRecordId}`] = {
      ok: true,
      night: { label: n.label, date: n.date },
      result,
    }
    wouldFire += result.summary.wouldFire
    threshold ??= result.threshold
    for (const v of (result.avg ?? result.primary)?.values ?? []) {
      if (v == null) continue
      if (peak == null || v > peak) peak = v
      if (low == null || v < low) low = v
    }
  }
  summaries.push({ id: r.id, nights: nights.length, wouldFire, peak, low, threshold })
}
writeFileSync(
  process.argv[2],
  JSON.stringify(
    {
      capturedTime,
      health,
      history,
      records,
      vitals,
      movement,
      stages,
      rules,
      nights,
      backtests,
      backtestSummaries: summaries,
    },
    null,
    2,
  ) + '\n',
)
