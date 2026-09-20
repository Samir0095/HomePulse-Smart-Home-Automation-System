// Live IoT Telemetry Polling Module
class TelemetryManager {
  constructor(updateCallback) {
    this.updateCallback = updateCallback;
    this.intervalId = null;
    this.isLive = false;
  }

  start(intervalMs = 4000) {
    if (this.isLive) return;
    this.isLive = true;
    this.fetchTelemetry();
    this.intervalId = setInterval(() => this.fetchTelemetry(), intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isLive = false;
    }
  }

  async fetchTelemetry() {
    try {
      const res = await fetch('/api/telemetry/live');
      const result = await res.json();
      if (result.success && this.updateCallback) {
        this.updateCallback(result.data);
      }
    } catch (err) {
      console.warn('Telemetry polling pause or error:', err.message);
    }
  }
}

window.TelemetryManager = TelemetryManager;
