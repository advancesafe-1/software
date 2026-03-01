import * as fs from 'fs';
import * as path from 'path';
import { app, shell } from 'electron';
import type Database from 'better-sqlite3';
import { DataCollector } from './data-collector';
import { pdfRenderer } from './pdf-renderer';
import type { ReportConfig, ReportJob } from './report-types';
import { buildSafetySummaryReport } from './templates/safety-summary';
import { buildIncidentReport } from './templates/incident-report';
import { buildSensorReport } from './templates/sensor-report';
import { buildComplianceReport } from './templates/compliance-report';
import { buildAuditReport } from './templates/audit-report';

function generateId(): string {
  return 'rpt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

function getReportsDir(): string {
  const userData = app.getPath('userData');
  const dir = path.join(userData, 'reports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function logReportGenerated(db: Database.Database, userId: string, jobId: string, reportType: string, period: string): void {
  try {
    db.prepare(
      `INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, new_value_json, performed_at) VALUES (lower(hex(randomblob(16))), ?, 'GENERATE_REPORT', 'report', ?, ?, datetime('now'))`
    ).run(userId, jobId, JSON.stringify({ type: reportType, period }));
  } catch {
    // ignore
  }
}

export class ReportGenerator {
  private db: Database.Database | null = null;
  private dataCollector: DataCollector | null = null;
  private activeJobs = new Map<string, ReportJob>();

  initialize(db: Database.Database): void {
    this.db = db;
    this.dataCollector = new DataCollector(db);
    getReportsDir();
  }

  private buildFilename(config: ReportConfig): string {
    const from = config.dateFrom.split('T')[0];
    const to = config.dateTo.split('T')[0];
    return `advancesafe-${config.type}-${from}-to-${to}.pdf`;
  }

  async generateReport(config: ReportConfig, onProgress: (job: ReportJob) => void): Promise<ReportJob> {
    const job: ReportJob = {
      id: generateId(),
      config,
      status: 'generating',
      progress: 0,
      outputPath: null,
      errorMessage: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      fileSizeBytes: null,
    };
    this.activeJobs.set(job.id, job);
    onProgress({ ...job });

    if (!this.db || !this.dataCollector) {
      job.status = 'failed';
      job.errorMessage = 'Report generator not initialized';
      onProgress({ ...job });
      return job;
    }

    const collector = this.dataCollector;
    const from = config.dateFrom;
    const to = config.dateTo;
    const orgId = config.organizationId;

    try {
      job.progress = 5;
      onProgress({ ...job });

      let html: string;
      const reportId = job.id;
      const generatedAt = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

      if (config.type === 'safety_summary') {
        const org = collector.getOrganization(orgId);
        const avgScore = collector.getAvgGuardianScore(from, to);
        const scoreHistory = collector.getGuardianScoreHistory(from, to, config.filters?.zoneIds);
        const incidentCounts = collector.getIncidentCounts(from, to);
        const responseTimes = collector.getResponseTimeStats(from, to);
        const sensorSummary = collector.getSensorReadingsSummary(from, to);
        const workerStats = collector.getWorkerStats();
        const sensorsMonitored = collector.getSensorInventory().length;
        html = buildSafetySummaryReport(
          config,
          {
            org,
            avgScore,
            scoreHistory,
            incidentCounts,
            responseTimes,
            sensorSummary,
            workerStats,
            totalIncidents: incidentCounts.total,
            sensorsMonitored,
          },
          reportId,
          generatedAt
        );
      } else if (config.type === 'incident_report') {
        const org = collector.getOrganization(orgId);
        const incidents = collector.getIncidents(from, to, config.filters);
        const counts = collector.getIncidentCounts(from, to);
        const zoneRisk = collector.getZoneRiskMatrix(from, to);
        const responseTimes = collector.getResponseTimeStats(from, to);
        const dailyTrend = collector.getDailyIncidentTrend(from, to);
        html = buildIncidentReport(
          config,
          { org, incidents, counts, zoneRisk, responseTimes, dailyTrend },
          reportId,
          generatedAt
        );
      } else if (config.type === 'sensor_report') {
        const org = collector.getOrganization(orgId);
        const inventory = collector.getSensorInventory();
        const summary = collector.getSensorReadingsSummary(from, to);
        const breaches = collector.getSensorBreaches(from, to);
        html = buildSensorReport(config, { org, inventory, summary, breaches }, reportId, generatedAt);
      } else if (config.type === 'compliance_report') {
        const org = collector.getOrganization(orgId);
        const avgScore = collector.getAvgGuardianScore(from, to);
        const scoreHistory = collector.getGuardianScoreHistory(from, to);
        const byDate = new Map<string, { sum: number; count: number; status: string }>();
        for (const r of scoreHistory) {
          const cur = byDate.get(r.date) ?? { sum: 0, count: 0, status: r.status };
          cur.sum += r.avg_score;
          cur.count += 1;
          byDate.set(r.date, cur);
        }
        const dailyScores = Array.from(byDate.entries())
          .map(([date, v]) => ({ date, avg_score: v.sum / v.count, status: v.status }))
          .sort((a, b) => a.date.localeCompare(b.date));
        const auditCount = (this.db!.prepare('SELECT COUNT(*) as c FROM audit_log WHERE performed_at >= ? AND performed_at <= ?').get(from, to) as { c: number }).c;
        const incidentCount = (this.db!.prepare('SELECT COUNT(*) as c FROM incidents WHERE triggered_at >= ? AND triggered_at <= ?').get(from, to) as { c: number }).c;
        const sensorReadingsCount = (this.db!.prepare('SELECT COUNT(*) as c FROM sensor_readings WHERE recorded_at >= ? AND recorded_at <= ?').get(from, to) as { c: number }).c;
        html = buildComplianceReport(
          config,
          {
            org,
            avgScore,
            dailyScores,
            auditLogCount: auditCount,
            incidentCount,
            sensorReadingsCount,
            appVersion: app.getVersion(),
          },
          reportId,
          generatedAt
        );
      } else if (config.type === 'audit_report') {
        const org = collector.getOrganization(orgId);
        const auditLog = collector.getAuditLog(from, to);
        const systemChanges = auditLog.filter((a) => ['organizations', 'sensors', 'zones', 'alert_hierarchy', 'app_users'].includes(a.entity_type || ''));
        const alertDelivery = collector.getAlertDeliveryStats(from, to);
        html = buildAuditReport(config, { org, auditLog, systemChanges, alertDelivery }, reportId, generatedAt);
      } else {
        job.status = 'failed';
        job.errorMessage = 'Unknown report type';
        onProgress({ ...job });
        return job;
      }

      job.progress = 50;
      onProgress({ ...job });

      const filename = this.buildFilename(config);
      const outputPath = path.join(getReportsDir(), filename);
      const result = await pdfRenderer.renderToPDF(html, outputPath, (p) => {
        job.progress = 50 + p * 0.45;
        onProgress({ ...job });
      });

      if (result.success) {
        job.status = 'complete';
        job.progress = 100;
        job.outputPath = result.filePath;
        job.fileSizeBytes = result.fileSizeBytes;
        job.completedAt = new Date().toISOString();
        logReportGenerated(this.db, config.generatedBy, job.id, config.type, `${config.dateFrom} to ${config.dateTo}`);
      } else {
        job.status = 'failed';
        job.errorMessage = result.error ?? 'PDF render failed';
      }
    } catch (err) {
      job.status = 'failed';
      job.errorMessage = err instanceof Error ? err.message : String(err);
    }

    this.activeJobs.delete(job.id);
    onProgress({ ...job });
    return job;
  }

  async openReport(filePath: string): Promise<void> {
    await shell.openPath(filePath);
  }

  async getReportsList(): Promise<{ name: string; path: string; size: number; createdAt: string }[]> {
    const dir = getReportsDir();
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.pdf'));
    const result: { name: string; path: string; size: number; createdAt: string }[] = [];
    for (const f of files) {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      result.push({ name: f, path: fullPath, size: stat.size, createdAt: stat.mtime.toISOString() });
    }
    result.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    return result;
  }

  async deleteReport(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  getReportsDir(): string {
    return getReportsDir();
  }
}

export const reportGenerator = new ReportGenerator();
