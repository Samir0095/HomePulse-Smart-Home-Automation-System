// Energy Analytics Chart.js Module
class ChartManager {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.chart = null;
  }

  async initChart() {
    const ctx = document.getElementById(this.canvasId);
    if (!ctx) return;

    try {
      const res = await fetch('/api/energy-analytics');
      const data = await res.json();

      if (!data.success) return;

      const labels = data.hourlyData.map(d => d.hour);
      const values = data.hourlyData.map(d => d.kWh);

      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Energy Usage (kWh)',
            data: values,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#38bdf8',
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#94a3b8', font: { family: 'Outfit', size: 12 } }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8' }
            },
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8' }
            }
          }
        }
      });
    } catch (err) {
      console.warn('Chart initialization error:', err.message);
    }
  }

  updateData(newPoint) {
    if (!this.chart) return;
    this.chart.data.labels.push(newPoint.time);
    this.chart.data.datasets[0].data.push(newPoint.kwh);
    if (this.chart.data.labels.length > 10) {
      this.chart.data.labels.shift();
      this.chart.data.datasets[0].data.shift();
    }
    this.chart.update();
  }
}

window.ChartManager = ChartManager;
