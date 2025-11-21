import Component from '@glimmer/component';
import { action } from '@ember/object';
import { guidFor } from '@ember/object/internals';
import Chart from 'chart.js/auto';

export default class BitacoraReportChartComponent extends Component {
    chartInstance = null;
    canvasRef = null;
    
    constructor() {
        super(...arguments);
        // Defer chart creation to next tick to ensure DOM is ready
        setTimeout(() => this.initChart(), 0);
    }
    
    get canvasId() {
        return `chart-${guidFor(this)}`;
    }

    get chartType() {
        return this.args.type ?? 'bar';
    }

    get chartData() {
        return this.args.data ?? { labels: [], datasets: [] };
    }

    get chartOptions() {
        // Merge passed options with defaults
        const passedOptions = this.args.options ?? {};
        
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
                ...(passedOptions.plugins ?? {}),
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: this.args.tickColor ?? '#475569',
                    },
                    ...(passedOptions.scales?.x ?? {}),
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(148, 163, 184, 0.3)' },
                    ticks: {
                        color: this.args.tickColor ?? '#475569',
                        precision: 0,
                    },
                    ...(passedOptions.scales?.y ?? {}),
                },
            },
            ...passedOptions,
        };
    }

    get hasData() {
        return Array.isArray(this.chartData?.datasets) && this.chartData.datasets.length > 0;
    }

    get ariaLabel() {
        return this.args.ariaLabel ?? 'Gráfica de reportes por sección';
    }

    get chartSignatures() {
        return [this.chartVersion];
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

    initChart() {
        if (!this.hasData) {
            return;
        }
        
        const canvas = document.getElementById(this.canvasId);
        if (!canvas) {
            return;
        }
        
        this.canvasRef = canvas;
        this.destroyChart();
        
        const context = canvas.getContext('2d');
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

