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
export function richData(name, input) {
  if (name === 'calibration.getStatus')
    return Object.fromEntries(
      ['piezo', 'capacitance', 'temperature'].map((type) => [
        type,
        { status: 'completed', qualityScore: 0.94, completedAt: new Date(now - 86400000) },
      ]),
    )
  if (name === 'system.wifiStatus')
    return { connected: true, ssid: 'Demo home', signal: 92, ipAddress: '192.0.2.10' }
  if (name === 'system.internetStatus') return { blocked: true }
  if (name === 'system.getVersion')
    return { branch: 'dev', commitHash: 'e4951f787fd6128d5cf1bb1723564e32de536be6', version: null }
  if (name === 'system.getLogSources')
    return {
      sources: ['Core', 'Piezo Processor', 'Sleep Detector', 'Environment Monitor'].map((name) => ({
        name,
        unit: name.toLowerCase().replaceAll(' ', '-') + '.service',
        active: true,
      })),
    }
  if (name === 'system.getStorageBreakdown')
    return {
      emmc: { totalBytes: 8000000000, usedBytes: 2240000000, usedPercent: 28 },
      categories: [],
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
        jobCount: 8,
        drift: { dbScheduleCount: 8, schedulerJobCount: 8, drifted: false },
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
  if (name === 'automations.backtestSummaries')
    return fixture.rules.map((r) => ({
      id: r.id,
      nights: 7,
      wouldFire: r.id === 3 ? 1 : 5,
      peak: null,
      threshold: null,
    }))
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
