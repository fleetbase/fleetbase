import AdminWidgetListPanelComponent from './list-panel';

export default class AdminWidgetChartPanelComponent extends AdminWidgetListPanelComponent {
    get endpoint() {
        if (this.slug === 'platform-growth') {
            return 'metrics/admin/growth';
        }

        return super.endpoint;
    }

    get chartLabels() {
        return this.data?.labels ?? [];
    }

    get chartDatasets() {
        return this.data?.datasets ?? null;
    }

    get chartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'bottom' },
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true },
            },
        };
    }
}
