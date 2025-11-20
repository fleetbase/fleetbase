import Component from '@glimmer/component';
import { action } from '@ember/object';
import Chart from 'chart.js/auto';

export default class BitacoraReportChartComponent extends Component {
    chartInstance = null;
    canvasRef = null;

    get chartType() {
        return this.args.type ?? 'bar';
    }

    get chartData() {
        return this.args.data ?? { labels: [], datasets: [] };
    }

    get chartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: Boolean(this.args.showLegend ?? false),
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: this.args.tickColor ?? '#475569',
                    },
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(148, 163, 184, 0.3)' },
                    ticks: {
                        color: this.args.tickColor ?? '#475569',
                        precision: 0,
                    },
                },
            },
            ...(this.args.options ?? {}),
        };
    }

    get hasData() {
        return Array.isArray(this.chartData?.datasets) && this.chartData.datasets.length > 0;
    }

    get chartVersion() {
        return JSON.stringify({
            type: this.chartType,
            data: this.chartData,
            options: this.args.options,
        });
    }

    destroyChart() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }

    @action
    registerChart(element) {
        this.canvasRef = element;
        this.rebuildChart();
    }

    @action
    rebuildChart() {
        this.destroyChart();

        if (!this.canvasRef || !this.hasData) {
            return;
        }

        const context = this.canvasRef.getContext('2d');
        this.chartInstance = new Chart(context, {
            type: this.chartType,
            data: this.chartData,
            options: this.chartOptions,
        });
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.destroyChart();
    }
}

