import fixture from './core-rich-demo.json' with { type: 'json' }
export const capturedTime = fixture.capturedTime
const now = +new Date(capturedTime)
const records = fixture.records.map((r) => ({
  ...r,
  enteredBedAt: new Date(r.enteredBedAt),
  leftBedAt: new Date(r.leftBedAt),
}))
const vitals = fixture.vitals.map((r) => ({ ...r, timestamp: new Date(r.timestamp) }))
vitals.push(
  ...Array.from({ length: 7 }, (_, i) => ({
    timestamp: new Date(now - (6 - i) * 300000 - 18000),
    heartRate: 58 - i,
    hrv: 45 + i,
    breathingRate: 14,
  })),
)
const movement = fixture.movement.map((r) => ({ ...r, timestamp: new Date(r.timestamp) }))
const inRange = (r, input, key = 'timestamp') =>
  (!input?.startDate || +r[key] >= +input.startDate) &&
  (!input?.endDate || +r[key] <= +input.endDate)
// Backtests were replayed by Core's own engine at fixture-generation time for
// the saved rules; match the editor's inline rule back to one of them.
const astKey = (r) =>
  JSON.stringify({
    side: r.side ?? null,
    cooldownMin: r.cooldownMin ?? null,
    trigger: r.trigger,
    conditions: r.conditions,
    actions: r.actions,
  })
const ruleFor = (rule) =>
  fixture.rules.find((r) => astKey(r) === astKey(rule)) ||
  fixture.rules.find(
    (r) => r.trigger.kind === rule.trigger.kind && r.actions[0]?.kind === rule.actions[0]?.kind,
  )
export function richData(name, input) {
  if (name === 'calibration.getStatus') {
    // Baselines sit under the synthetic stream frames, so both sides read occupied.
    const side = input?.side || 'left'
    const parameters = {
      piezo: { baseline_mean_range: 18, presence_threshold: 30 },
      capacitance: {
        format: 'capSense2',
        channels: Object.fromEntries(['A', 'B', 'C'].map((ch) => [ch, { mean: 1.1, std: 0.02 }])),
        threshold: 0.6,
        ref: { mean: 1.16 },
      },
      temperature: {
        ambient_mean: 2390,
        offsets: Object.fromEntries(
          ['outer', 'center', 'inner'].map((zone, i) => [
            `${side}_${zone}_temp`,
            (side === 'left' ? -60 : -170) + i * 10,
          ]),
        ),
      },
    }
    return Object.fromEntries(
      ['piezo', 'capacitance', 'temperature'].map((type, i) => [
        type,
        {
          id: i + 1,
          side,
          sensorType: type,
          status: 'completed',
          qualityScore: [0.94, 0.91, 0.97][i],
          samplesUsed: [1800, 1200, 600][i],
          createdAt: new Date(now - 86400000),
          expiresAt: new Date(now + 6 * 86400000),
          errorMessage: null,
          parameters: parameters[type],
        },
      ]),
    )
  }
  if (name === 'system.wifiStatus')
    return { connected: true, ssid: 'Demo home', signal: 92, ipAddress: '192.0.2.10' }
  if (name === 'system.internetStatus') return { blocked: true }
  if (name === 'system.getVersion')
    return {
      branch: 'main',
      commitHash: '4cc76838105c1b08af453e28255463c5588be33c',
      commitTitle: 'feat!: v3.0',
      buildDate: '2026-09-30T23:35:15-07:00',
      version: 'v3.0.0',
    }
  if (name === 'system.getLogSources')
    return {
      sources: [
        ['sleepypod.service', 'Core'],
        ['sleepypod-piezo-processor.service', 'Piezo Processor'],
        ['sleepypod-sleep-detector.service', 'Sleep Detector'],
        ['sleepypod-environment-monitor.service', 'Environment Monitor'],
      ].map(([unit, name]) => ({ unit, name, active: true })),
    }
  if (name === 'system.getLogs') {
    // short-iso in the Pod's local time (fixture night is PDT, UTC−7).
    const stamp = (min) =>
      new Date(now - min * 60000 - 7 * 3600000).toISOString().replace('.000Z', '-0700')
    const lines = [
      [38, 'info', '[startup] migrations-ready: 12ms'],
      [37, 'info', '[scheduler] loaded 8 jobs (timezone America/Los_Angeles)'],
      [36, 'info', '[dac] connected to dac.sock'],
      [35, 'info', '[automation] engine started · 4 rules (1 dry-run)'],
      [30, 'info', '[homekit] bridge running · 1 paired controller'],
      [29, 'info', '[mqtt] connected to mqtt://broker.lan:1883'],
      [24, 'info', '[scheduler] fired left-23:15 → 74°F'],
      [24, 'info', '[scheduler] fired right-23:15 → 72°F'],
      [12, 'warn', '[sensors] warning: piezo frame gap 2.1 s (recovered)'],
      [6, 'info', '[automation] Hold room +3°F requested 78°F on left'],
      [2, 'info', '[archive-push] next run 03:30'],
    ].map(([min, level, msg]) => `${stamp(min)} demo-pod sleepypod[812]: ${msg}`)
    return { lines, nextCursor: null }
  }
  if (name === 'system.getStorageBreakdown')
    return {
      emmc: {
        totalBytes: 8000000000,
        usedBytes: 2240000000,
        availableBytes: 5760000000,
        usedPercent: 28,
      },
      biometricsTmpfs: {
        totalBytes: 268435456,
        usedBytes: 41943040,
        availableBytes: 226492416,
        usedPercent: 16,
      },
      biometricsArchive: { usedBytes: 1342177280, fileCount: 214 },
    }
  if (name === 'system.getStorage')
    return {
      persistent: {
        totalBytes: 8000000000,
        usedBytes: 2240000000,
        availableBytes: 5760000000,
        usedPercent: 28,
      },
      prunerTargetPercent: 80,
      segments: [
        { key: 'rawArchive', bytes: 1342177280 },
        { key: 'app', bytes: 419430400 },
        { key: 'database', bytes: 62914560 },
        { key: 'swap', bytes: 268435456 },
        { key: 'reclaimable', bytes: 94371840 },
        { key: 'other', bytes: 52670464 },
      ],
      rawHistory: {
        fileCount: 214,
        oldest: new Date(now - 30 * 86400000).toISOString(),
        newest: new Date(now - 60000).toISOString(),
        days: 30,
      },
      reclaimable: {
        available: true,
        totalBytes: 94371840,
        items: [
          {
            path: '/persistent/sleepypod-releases/previous',
            bytes: 62914560,
            reason: 'Previous release kept after update',
            kind: 'release',
          },
          {
            path: '/persistent/tmp/update-staging',
            bytes: 20971520,
            reason: 'Leftover update staging files',
            kind: 'temp',
          },
          {
            path: '/persistent/sleepypod-data/backups/sleepypod-2026-09-01.db',
            bytes: 10485760,
            reason: 'Older database backup',
            kind: 'backup',
          },
        ],
      },
    }
  if (name === 'health.performance')
    return {
      uptimeSeconds: 172800,
      memoryUsage: { rss: 128000000 },
      cpuUsage: { user: 1200, system: 300 },
    }
  if (name === 'environment.getLatestBedTemp')
    return {
      timestamp: new Date(now - 4000),
      ambientTemp: 75,
      humidity: 45,
      leftOuterTemp: 74,
      leftCenterTemp: 74,
      leftInnerTemp: 74,
      rightOuterTemp: 72,
      rightCenterTemp: 72,
      rightInnerTemp: 72,
    }
  if (name === 'health.dataPath') return fixture.health
  if (name === 'health.history') return fixture.history
  if (name === 'health.maintenance')
    return {
      pumpStallProtectionEnabled: true,
      primePodDaily: true,
      primePodTime: '14:00',
      lastPrimeAt: now - 34800000,
      firstPrimeRecordedAt: now - 30 * 86400000,
    }
  if (name === 'health.system')
    return {
      status: 'ok',
      timestamp: capturedTime,
      database: {
        status: 'ok',
        latencyMs: 1,
        integrity: { status: 'ok', checkedAt: capturedTime, latencyMs: 2 },
      },
      scheduler: {
        enabled: true,
        jobCount: 9,
        drift: { dbScheduleCount: 9, schedulerJobCount: 9, drifted: false },
      },
      iptables: { ok: true, missing: [] },
    }
  if (name === 'health.dacMonitor')
    return { status: 'running', lastPollAt: now - 1000, pollIntervalMs: 1000, consecutiveErrors: 0 }
  if (name === 'health.thermal')
    return {
      pumpStallProtectionEnabled: true,
      heatsinkTempF: 86,
      ambientTempF: 75,
      sides: ['left', 'right'].map((side, i) => ({
        side,
        isPowered: true,
        targetTempF: i ? 72 : 78,
        currentTempF: i ? 77 : 74,
        isAlarmVibrating: false,
        poweredOnAt: new Date(now - 3600000).toISOString(),
        pumpRpm: 2200,
        flowrate: 1.2,
        readingAgeSec: 1,
        waterTempF: i ? 70 : 80,
        bedSurfaceTempF: i ? 77 : 74,
        guardBlocked: false,
        verdict: 'delivering',
        note: null,
      })),
    }
  if (name === 'health.hardware')
    return { status: 'ok', socketPath: 'dac.sock', latencyMs: 2, error: null }
  if (name === 'biometrics.getLatestSleep') return records[0]
  if (name === 'biometrics.getSleepRecords')
    return records.filter((r) => inRange(r, input, 'enteredBedAt'))
  if (name === 'biometrics.getVitals')
    return vitals
      .filter((r) => inRange(r, input))
      .sort((a, b) => +b.timestamp - +a.timestamp)
      .slice(0, input?.limit || 20000)
  if (name === 'biometrics.getMovement') return movement.filter((r) => inRange(r, input))
  if (name === 'biometrics.getVitalsSummary') {
    const rows = vitals.filter((r) => inRange(r, input))
    const avg = (key) => rows.reduce((a, r) => a + r[key], 0) / rows.length
    return {
      avgHeartRate: avg('heartRate'),
      minHeartRate: Math.min(...rows.map((r) => r.heartRate)),
      maxHeartRate: Math.max(...rows.map((r) => r.heartRate)),
      avgHRV: avg('hrv'),
      avgBreathingRate: avg('breathingRate'),
      recordCount: rows.length,
    }
  }
  if (name === 'biometrics.getOccupancy')
    return {
      left: {
        occupied: true,
        available: true,
        since: new Date(now - 1800000),
        movement: { active: true, peakScore: 32 },
        level: { deviation: 1.2 },
      },
      right: {
        occupied: true,
        available: true,
        since: new Date(now - 1500000),
        movement: { active: false, peakScore: 8 },
        level: { deviation: 1.1 },
      },
    }
  if (name === 'biometrics.getFileCount')
    return { rawFiles: { left: 420, right: 420 }, totalSizeMB: 128 }
  if (name === 'biometrics.getMovementBuckets')
    return movement
      .filter((r) => inRange(r, input))
      .map((r) => ({
        side: input.side,
        bucketStart: r.timestamp,
        totalMovement: r.totalMovement,
        eventCount: r.totalMovement >= 200 ? 1 : 0,
        sampleCount: 5,
      }))
  if (name === 'biometrics.getSleepStages') return fixture.stages[input?.sleepRecordId || 1]
  if (name === 'environment.getBedTemp') {
    const hours = input?.startDate ? (now - +input.startDate) / 3600000 : 6
    const count = Math.min(360, Math.round(hours * 12))
    const toUnit = (f) => (input?.unit === 'C' ? ((f - 32) * 5) / 9 : f)
    return Array.from({ length: count }, (_, i) => {
      const t = now - (count - 1 - i) * ((hours * 3600000) / count)
      const m = t / 60000
      return {
        id: i + 1,
        timestamp: new Date(t),
        ambientTemp: toUnit(75 + Math.sin(m / 90) * 0.6),
        mcuTemp: toUnit(86),
        humidity: 45 + Math.sin(m / 70) * 2,
        leftOuterTemp: toUnit(73.6 + Math.sin(m / 48)),
        leftCenterTemp: toUnit(74 + Math.sin(m / 48)),
        leftInnerTemp: toUnit(73.8 + Math.sin(m / 48)),
        rightOuterTemp: toUnit(71.6 + Math.sin(m / 52)),
        rightCenterTemp: toUnit(72 + Math.sin(m / 52)),
        rightInnerTemp: toUnit(71.8 + Math.sin(m / 52)),
      }
    }).reverse()
  }
  if (name === 'environment.getSummary')
    return {
      bedTemp: {
        avgAmbientTemp: 75,
        minAmbientTemp: 74.4,
        maxAmbientTemp: 75.6,
        avgHumidity: 45,
        avgLeftCenterTemp: 74,
        avgRightCenterTemp: 72,
        recordCount: 288,
      },
      freezerTemp: {
        avgAmbientTemp: 75,
        avgHeatsinkTemp: 86,
        avgLeftWaterTemp: 76,
        avgRightWaterTemp: 70,
        recordCount: 288,
      },
    }
  if (name === 'waterLevel.getLatest')
    return { id: 1, timestamp: new Date(now - 60000), level: 'ok' }
  if (name === 'waterLevel.getFlowReadings') {
    const hours = input?.hours || 24
    const count = Math.min(288, hours * 12)
    return Array.from({ length: count }, (_, i) => {
      const t = now - (count - 1 - i) * ((hours * 3600000) / count)
      return {
        id: i + 1,
        timestamp: new Date(t),
        leftFlowrateCd: Math.round(120 + Math.sin(t / 900000) * 6),
        rightFlowrateCd: Math.round(118 + Math.sin(t / 1100000) * 6),
        leftPumpRpm: 2200,
        rightPumpRpm: 2200,
      }
    })
  }
  if (name === 'automations.diagnostics') {
    const since = now - 3 * 3600000
    const minutes = Array.from({ length: 180 }, (_, i) => since + (i + 1) * 60000)
    // Fixture night is America/Los_Angeles regardless of the capture host's timezone.
    const laHour = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'America/Los_Angeles',
    })
    const inWindow = (t) => Number(laHour.format(t)) >= 23
    const restless = (t) => t >= now - 40 * 60000 && t <= now - 22 * 60000
    const runsFor = (rule) => {
      if (rule.id === 3)
        return [
          {
            t: new Date(now - 95 * 60000),
            outcome: 'skipped',
            reason: 'condition-false',
            sent: false,
          },
        ]
      return minutes
        .map((t, i) => {
          if (rule.id === 4) {
            if (!restless(t))
              return { t, outcome: 'skipped', reason: 'condition-false', sent: false }
            const first = t === minutes.find(restless)
            return first
              ? { t, outcome: 'fired', reason: null, sent: true }
              : { t, outcome: 'skipped', reason: 'cooldown', sent: false }
          }
          if (!inWindow(t)) return { t, outcome: 'skipped', reason: 'condition-false', sent: false }
          return rule.dryRun
            ? { t, outcome: 'dry_run', reason: null, sent: false }
            : { t, outcome: 'fired', reason: null, sent: i % 5 === 0 }
        })
        .map((r) => ({ ...r, t: new Date(r.t) }))
    }
    const signals = {
      1: { 'ambient.temperature': 75 },
      2: { 'ambient.temperature': 75 },
      3: { 'water.low': 0 },
      4: { 'left.movement': 64 },
    }
    const startOfDay = new Date(`${capturedTime.slice(0, 10)}T00:00:00${capturedTime.slice(19)}`)
    return {
      now: new Date(now),
      since: new Date(Math.min(+startOfDay, since)),
      startOfDay,
      globalEnabled: true,
      rules: fixture.rules.map((r) => ({
        ...r,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
        runs: runsFor(r),
        signals: signals[r.id] || {},
      })),
    }
  }
  if (name === 'automations.list')
    return fixture.rules.map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
  if (name === 'automations.status')
    return {
      globalEnabled: true,
      rules: fixture.rules.map((r) => ({
        ...r,
        lastOutcome: r.dryRun ? 'dry_run' : 'fired',
        lastFiredAt: new Date(now - 600000),
        firesToday: 1,
      })),
    }
  if (name === 'automations.get') {
    const r = fixture.rules.find((r) => r.id === input.id)
    return r && { ...r, createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt) }
  }
  if (name === 'automations.backtestSummaries') return fixture.backtestSummaries
  if (name === 'automations.nights') return fixture.nights
  if (name === 'automations.backtest') {
    const rule = ruleFor(input.rule)
    const night = input.sleepRecordId || fixture.nights[0].sleepRecordId
    return (
      (rule && fixture.backtests[`${rule.id}:${night}`]) || {
        ok: false,
        message: 'No recorded nights for this side yet — backtest needs sleep history.',
        night: null,
        result: null,
      }
    )
  }
  if (name === 'automations.backtestRange') {
    const rule = ruleFor(input.rule)
    const summary = rule && fixture.backtestSummaries.find((s) => s.id === rule.id)
    if (!summary) return { nights: 0, wouldFire: 0, peak: null, low: null, threshold: null }
    const { id: _id, ...range } = summary
    return range
  }
  if (name === 'automations.tonight')
    return {
      now,
      sides: {
        left: {
          control: { source: 'autopilot', targetTemperature: 78, blocked: null },
          hold: null,
          runOnceUntil: null,
          lastAutopilot: { ruleName: 'Hold room +3°F', temp: 78, at: now - 2400000 },
        },
        right: {
          control: { source: 'schedule', targetTemperature: 72, blocked: null },
          hold: null,
          runOnceUntil: null,
          lastAutopilot: null,
        },
      },
    }
  if (name === 'automations.activity')
    return {
      now,
      holds: [],
      nights: (input?.nightStarts || []).map((start) => ({
        start,
        entries: [
          {
            ruleId: 1,
            ruleName: 'Hold room +3°F',
            outcome: 'fired',
            code: 'set-temperature',
            start: start + 5 * 3600000,
            end: start + 5 * 3600000,
            count: 1,
            temp: 78,
            sides: ['left'],
          },
          {
            ruleId: 2,
            ruleName: 'Preview room +3°F',
            outcome: 'dry_run',
            code: 'set-temperature',
            start: start + 5 * 3600000 + 1200000,
            end: start + 5 * 3600000 + 1200000,
            count: 1,
            temp: 78,
            sides: ['right'],
          },
        ].filter((e) => e.start <= now),
      })),
    }
}
