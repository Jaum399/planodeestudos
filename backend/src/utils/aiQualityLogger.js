const logger = require('./logger');

class AIQualityLogger {
  constructor() {
    this.metrics = [];
    this.thresholds = {
      parseSuccessRate: 0.95,
      fallbackRate: 0.3,
      timeoutRate: 0.05,
      avgLatency: 8000,
    };
  }

  logMetric(metric) {
    const entry = {
      ...metric,
      timestamp: new Date().toISOString(),
    };
    this.metrics.push(entry);

    if (logger.debug) {
      logger.debug(`[AI Quality] ${metric.operation}`, {
        latency: metric.latency,
        retryCount: metric.retryCount,
        parseSuccess: metric.parseSuccess,
        responseLength: metric.responseLength,
      });
    }
  }

  getMetricsForOperation(operation, windowMinutes = 60) {
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    const relevant = this.metrics.filter(
      m => m.operation === operation && new Date(m.timestamp).getTime() > cutoff
    );

    if (relevant.length === 0) {
      return null;
    }

    const parseSuccessCount = relevant.filter(m => m.parseSuccess).length;
    const totalRetries = relevant.reduce((sum, m) => sum + (m.retryCount || 0), 0);
    const avgLatency = relevant.reduce((sum, m) => sum + (m.latency || 0), 0) / relevant.length;

    return {
      operation,
      window_minutes: windowMinutes,
      sample_count: relevant.length,
      parse_success_rate: parseSuccessCount / relevant.length,
      avg_latency: Math.round(avgLatency),
      total_retries: totalRetries,
      avg_retries_per_call: totalRetries / relevant.length,
      avg_response_length: Math.round(
        relevant.reduce((sum, m) => sum + (m.responseLength || 0), 0) / relevant.length
      ),
    };
  }

  checkHealthAlerts() {
    const operations = ['flashcard_generation', 'summary_generation', 'jarvis_response', 'deck_suggestion'];
    const alerts = [];

    operations.forEach(op => {
      const metrics = this.getMetricsForOperation(op, 60);
      if (!metrics) return;

      if (metrics.parse_success_rate < this.thresholds.parseSuccessRate) {
        alerts.push({
          level: 'warning',
          operation: op,
          issue: `Parse success rate low: ${(metrics.parse_success_rate * 100).toFixed(1)}%`,
        });
      }

      if (metrics.avg_retries_per_call > 1) {
        alerts.push({
          level: 'warning',
          operation: op,
          issue: `High retry rate: ${metrics.avg_retries_per_call.toFixed(2)} retries/call`,
        });
      }

      if (metrics.avg_latency > this.thresholds.avgLatency) {
        alerts.push({
          level: 'info',
          operation: op,
          issue: `Elevated latency: ${metrics.avg_latency}ms (threshold: ${this.thresholds.avgLatency}ms)`,
        });
      }
    });

    return alerts;
  }

  clearOldMetrics(maxAgeHours = 24) {
    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
    const before = this.metrics.length;
    this.metrics = this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoff);
    return before - this.metrics.length;
  }

  getReport(windowMinutes = 60) {
    const operations = ['flashcard_generation', 'summary_generation', 'jarvis_response', 'deck_suggestion'];
    const report = {
      generated_at: new Date().toISOString(),
      window_minutes: windowMinutes,
      operations: {},
      alerts: this.checkHealthAlerts(),
    };

    operations.forEach(op => {
      const metrics = this.getMetricsForOperation(op, windowMinutes);
      if (metrics) {
        report.operations[op] = metrics;
      }
    });

    return report;
  }
}

module.exports = new AIQualityLogger();
