import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { guidFor } from '@ember/object/internals';
import { later, cancel } from '@ember/runloop';
import { isArray } from '@ember/array';
import { formatDistanceToNow } from 'date-fns';

const DEFAULT_PERIOD = 'last_7_days';
const REFRESH_INTERVAL = 5 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 4;

const PERIOD_PRESETS = [
    { value: 'today', label: 'Hoy' },
    { value: 'last_7_days', label: 'Últimos 7 días' },
    { value: 'last_30_days', label: 'Últimos 30 días' },
    { value: 'this_month', label: 'Este mes' },
    { value: 'previous_month', label: 'Mes anterior' },
];

export default class BitacoraReportCardComponent extends Component {
    @service fetch;
    @service intl;
    @service notifications;
    @service router;

    @tracked selectedPeriod = this.args.period ?? DEFAULT_PERIOD;
    @tracked sections = [];
    @tracked isLoading = true;
    @tracked errorMessage = null;
    @tracked lastUpdated = null;
    @tracked currentPage = 1;

    #refreshTimer = null;

    constructor() {
        super(...arguments);
        if (this.hasExternalSections) {
            this.isLoading = false;
            this.sections = this.normalizeSections(this.args.sections);
            this.lastUpdated = new Date();
        } else {
            this.loadReportData();
            if (!this.disableAutoRefresh) {
                this.#scheduleAutoRefresh();
            }
        }
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.#clearAutoRefresh();
    }

    get disableAutoRefresh() {
        return Boolean(this.args.disableAutoRefresh);
    }

    get hasExternalSections() {
        return isArray(this.args.sections) && this.args.sections.length > 0;
    }

    get resolvedSections() {
        if (this.hasExternalSections) {
            return this.normalizeSections(this.args.sections);
        }

        return this.sections;
    }

    get periodOptions() {
        return PERIOD_PRESETS;
    }


    get hasSections() {
        const result = isArray(this.resolvedSections) && this.resolvedSections.length > 0;
        console.log('[BitacoraReportCard] hasSections:', result, 'resolvedSections:', this.resolvedSections);
        return result;
    }

    get pageSize() {
        return this.args.pageSize ?? DEFAULT_PAGE_SIZE;
    }

    get totalPages() {
        return Math.ceil(this.resolvedSections.length / this.pageSize);
    }

    get paginatedSections() {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        return this.resolvedSections.slice(start, end);
    }

    get hasPagination() {
        return this.totalPages > 1;
    }

    get canGoPrevious() {
        return this.currentPage > 1;
    }

    get canGoNext() {
        return this.currentPage < this.totalPages;
    }

    get paginationInfo() {
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, this.resolvedSections.length);
        const total = this.resolvedSections.length;
        return `${start}-${end} de ${total}`;
    }

    get chartSections() {
        const limit = this.args.chartLimit ?? 5;
        return this.resolvedSections.slice(0, limit);
    }

    get chartData() {
        const labels = this.chartSections.map((section) => section.name);
        const data = this.chartSections.map((section) => section.total);
        const trends = this.chartSections.map((section) => section.trend);

        if (!labels.length) {
            return { labels: [], datasets: [] };
        }

        return {
            labels,
            datasets: [
                {
                    label: this.intl?.t?.('bitacora.report-card.chartLabel') ?? 'Actividades',
                    data,
                    backgroundColor: '#1D9A6C',
                    borderRadius: 4,
                    barThickness: 16,
                },
            ],
            trends, // Para mostrar en tooltips
        };
    }

    get chartOptions() {
        const textColor = this.args.chartTickColor ?? '#94a3b8';
        const trends = this.chartData.trends || [];
        
        return {
            indexAxis: 'y', // Barras horizontales
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    padding: 12,
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    borderColor: '#334155',
                    borderWidth: 1,
                    callbacks: {
                        label: (context) => {
                            const value = context.parsed.x;
                            const trend = trends[context.dataIndex] || '';
                            return `${value} actividades ${trend ? '(' + trend + ')' : ''}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(148, 163, 184, 0.1)',
                    },
                    ticks: {
                        precision: 0,
                        color: textColor,
                        font: {
                            size: 11,
                        },
                    },
                },
                y: {
                    grid: {
                        display: false,
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 12,
                            weight: '500',
                        },
                    },
                },
            },
            ...(this.args.chartOptions ?? {}),
        };
    }

    get showChart() {
        return this.chartData?.datasets?.length > 0;
    }

    get lastUpdatedLabel() {
        if (!this.lastUpdated) {
            return null;
        }

        return formatDistanceToNow(this.lastUpdated, { addSuffix: true });
    }

    get periodSelectId() {
        return `${guidFor(this)}-period-select`;
    }

    get title() {
        return this.intl?.t?.('bitacora.report-card.title') ?? 'Reportes por sección';
    }

    get subtitle() {
        return this.intl?.t?.('bitacora.report-card.subtitle') ?? 'Resumen de actividad agrupado por módulo';
    }

    get loadingLabel() {
        return this.intl?.t?.('bitacora.report-card.loading') ?? 'Cargando reportes...';
    }

    get emptyLabel() {
        return this.intl?.t?.('bitacora.report-card.empty') ?? 'No hay actividad en el período seleccionado.';
    }

    get errorLabel() {
        return this.intl?.t?.('bitacora.report-card.error') ?? 'No pudimos cargar los reportes. Inténtalo de nuevo.';
    }

    isPeriodSelected(value) {
        return value === this.selectedPeriod;
    }

    isTrendDown(direction) {
        return direction === 'down';
    }

    #scheduleAutoRefresh() {
        this.#clearAutoRefresh();
        this.#refreshTimer = later(this, async () => {
            await this.loadReportData({ silent: true });
            this.#scheduleAutoRefresh();
        }, REFRESH_INTERVAL);
    }

    #clearAutoRefresh() {
        if (this.#refreshTimer) {
            cancel(this.#refreshTimer);
            this.#refreshTimer = null;
        }
    }

    buildQueryParams(extra = {}) {
        const dates = this.getPeriodDates(this.selectedPeriod);
        return {
            start_date: dates.start,
            end_date: dates.end,
            ...(this.args.query ?? {}),
            ...extra,
        };
    }

    getPeriodDates(period) {
        console.log('[BitacoraReportCard] getPeriodDates called with period:', period);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let start, end;

        switch (period) {
            case 'today':
                console.log('[BitacoraReportCard] Using TODAY range');
                start = today;
                end = now;
                break;
            case 'last_7_days':
                start = new Date(today);
                start.setDate(start.getDate() - 7);
                end = now;
                break;
            case 'last_30_days':
                start = new Date(today);
                start.setDate(start.getDate() - 30);
                end = now;
                break;
            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = now;
                break;
            case 'previous_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                break;
            default:
                start = new Date(today);
                start.setDate(start.getDate() - 7);
                end = now;
        }

        return {
            start: start.toISOString(),
            end: end.toISOString(),
        };
    }

    normalizeSections(rawSections = []) {
        if (!isArray(rawSections)) {
            return [];
        }

        return rawSections.map((section) => {
            const actions = Object.entries(section?.actions ?? {}).map(([key, count]) => ({
                key,
                label: this.formatActionLabel(key),
                count,
            }));

            const trendValue = typeof section.trend === 'number' ? section.trend : parseFloat(section.trend) || 0;
            const trendDirection = section.trend_direction ?? (trendValue > 0 ? 'up' : (trendValue < 0 ? 'down' : 'neutral'));
            const trendSign = trendValue > 0 ? '+' : '';
            const trendFormatted = `${trendSign}${trendValue.toFixed(1)}%`;

            return {
                id: section.slug ?? section.name ?? section.log_name ?? guidFor(section),
                name: section.name ?? section.log_name ?? '—',
                slug: section.slug,
                total: section.total ?? section.total_activities ?? 0,
                trend: trendFormatted,
                trendValue: trendValue,
                trendDirection: trendDirection,
                lastActivity: section.last_activity,
                lastActivityLabel: section.last_activity ? formatDistanceToNow(new Date(section.last_activity), { addSuffix: true }) : null,
                actions,
            };
        });
    }

    formatActionLabel(key = '') {
        return key
            .toString()
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    buildDatasetColors(length = 0) {
        const palette = this.args.chartPalette ?? ['#1D9A6C', '#2FBF71', '#4BD38C', '#7EE5B0', '#A6F1C7', '#CDF9DF'];
        if (!length) {
            return [];
        }

        if (palette.length >= length) {
            return palette.slice(0, length);
        }

        const colors = [];
        for (let i = 0; i < length; i++) {
            colors.push(palette[i % palette.length]);
        }
        return colors;
    }

    async fetchReportData(params = {}) {
        return this.fetch.get('activity/reports-by-section', params, { namespace: 'api/v1' });
    }

    @action
    handlePeriodChange(value) {
        console.log('[BitacoraReportCard] Period changed to:', value);
        
        if (!value || value === this.selectedPeriod) {
            return;
        }

        this.selectedPeriod = value;
        this.currentPage = 1; // Reset to first page
        console.log('[BitacoraReportCard] Loading data for new period...');
        this.loadReportData();
    }

    @action
    handlePeriodChangeNative(event) {
        const value = event.target.value;
        console.log('[BitacoraReportCard] Period changed (native) to:', value);
        
        if (!value || value === this.selectedPeriod) {
            return;
        }

        this.selectedPeriod = value;
        console.log('[BitacoraReportCard] Loading data for new period...');
        this.loadReportData();
    }

    isPeriodSelected(value) {
        return value === this.selectedPeriod;
    }

    @action
    handleRefresh() {
        this.loadReportData();
    }

    @action
    handleViewDetails() {
        if (typeof this.args.onViewDetails === 'function') {
            return this.args.onViewDetails();
        }

        if (this.router?.transitionTo) {
            return this.router.transitionTo('console.bitacora.reports');
        }
    }

    @action
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
        }
    }

    @action
    goToPreviousPage() {
        if (this.canGoPrevious) {
            this.currentPage--;
        }
    }

    @action
    goToNextPage() {
        if (this.canGoNext) {
            this.currentPage++;
        }
    }

    @action
    async handleExport(format = 'csv') {
        if (!this.hasSections) {
            if (this.notifications?.warning) {
                this.notifications.warning('No hay datos para exportar');
            }
            return;
        }

        try {
            const data = this.prepareExportData();
            const filename = this.generateFilename(format);
            
            if (format === 'csv') {
                this.exportAsCSV(data, filename);
                if (this.notifications?.success) {
                    this.notifications.success('Reporte exportado como CSV');
                }
            } else if (format === 'xlsx') {
                this.exportAsExcel(data, filename);
                if (this.notifications?.success) {
                    this.notifications.success('Reporte exportado como Excel');
                }
            } else if (format === 'pdf') {
                await this.exportAsPDF(data, filename);
                // No mostrar notificación para PDF ya que abre ventana nueva
            }
        } catch (error) {
            if (this.notifications?.danger) {
                this.notifications.danger('Error al exportar el reporte');
            }
            // eslint-disable-next-line no-console
            console.error('[BitacoraReportCard] Export failed:', error);
        }
    }

    prepareExportData() {
        const rows = [];
        
        // Header row
        rows.push([
            'Sección',
            'Total Actividades',
            'Tendencia',
            'Creadas',
            'Actualizadas',
            'Eliminadas',
            'Vistas',
            'Última Actividad'
        ]);
        
        // Data rows
        this.resolvedSections.forEach(section => {
            const actions = section.actions.reduce((acc, action) => {
                acc[action.label] = action.count;
                return acc;
            }, {});
            
            rows.push([
                section.name,
                section.total,
                section.trend,
                actions['Created'] || 0,
                actions['Updated'] || 0,
                actions['Deleted'] || 0,
                actions['Viewed'] || 0,
                section.lastActivityLabel || 'N/A'
            ]);
        });
        
        return rows;
    }

    generateFilename(format) {
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0];
        const periodLabel = PERIOD_PRESETS.find(p => p.value === this.selectedPeriod)?.label || this.selectedPeriod;
        return `reportes-bitacora-${periodLabel.toLowerCase().replace(/\s+/g, '-')}-${dateStr}.${format}`;
    }

    exportAsCSV(data, filename) {
        const csv = data.map(row => 
            row.map(cell => {
                // Escape quotes and wrap in quotes if contains comma, quote, or newline
                const cellStr = String(cell);
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',')
        ).join('\n');
        
        // Add BOM for UTF-8 to ensure proper encoding in Excel
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        this.downloadBlob(blob, filename);
    }

    exportAsExcel(data, filename) {
        // Create a simple HTML table that Excel can open
        let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">';
        html += '<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
        html += '<x:Name>Reportes Bitácora</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>';
        html += '</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>';
        html += '<table border="1">';
        
        data.forEach((row, index) => {
            html += '<tr>';
            row.forEach(cell => {
                const tag = index === 0 ? 'th' : 'td';
                html += `<${tag}>${String(cell)}</${tag}>`;
            });
            html += '</tr>';
        });
        
        html += '</table></body></html>';
        
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        this.downloadBlob(blob, filename);
    }

    async exportAsPDF(data, filename) {
        // Crear HTML para imprimir/guardar como PDF
        const periodLabel = PERIOD_PRESETS.find(p => p.value === this.selectedPeriod)?.label || this.selectedPeriod;
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-MX', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // data es un array de arrays, el primero es el header
        const headers = data[0];
        const rows = data.slice(1);

        // Capturar la gráfica como imagen si existe
        let chartImageHTML = '';
        if (this.showChart) {
            try {
                // Buscar el canvas de la gráfica
                const chartCanvas = document.querySelector('.bitacora-report-chart canvas');
                if (chartCanvas) {
                    const chartImageData = chartCanvas.toDataURL('image/png');
                    chartImageHTML = `
                        <div style="margin: 20px 0; text-align: center;">
                            <img src="${chartImageData}" alt="Gráfica de actividades" style="max-width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; background: white;" />
                        </div>
                    `;
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.warn('[BitacoraReportCard] No se pudo capturar la gráfica:', error);
            }
        }

        // Construir tabla HTML
        let tableHTML = '<table style="width: 100%; border-collapse: collapse; margin-top: 20px;">';
        
        // Header
        tableHTML += '<thead><tr style="background-color: #1D9A6C; color: white;">';
        headers.forEach(header => {
            tableHTML += `<th style="padding: 12px 8px; text-align: left; border: 1px solid #ddd; font-weight: bold;">${header}</th>`;
        });
        tableHTML += '</tr></thead>';
        
        // Body
        tableHTML += '<tbody>';
        rows.forEach((row, idx) => {
            const bgColor = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
            tableHTML += `<tr style="background-color: ${bgColor};">`;
            row.forEach((cell, cellIdx) => {
                const align = cellIdx > 0 && cellIdx < 7 ? 'center' : 'left';
                tableHTML += `<td style="padding: 10px 8px; border: 1px solid #ddd; text-align: ${align};">${cell}</td>`;
            });
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';

        // Crear ventana de impresión
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (!printWindow) {
            if (this.notifications?.warning) {
                this.notifications.warning('Por favor permite ventanas emergentes para exportar PDF');
            }
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Reportes de Bitácora - ${periodLabel}</title>
                <style>
                    @page {
                        size: A4;
                        margin: 20mm;
                    }
                    
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        margin: 0;
                        padding: 20px;
                        color: #1f2937;
                    }
                    
                    h1 {
                        color: #1f2937;
                        font-size: 24px;
                        margin: 0 0 10px 0;
                    }
                    
                    .metadata {
                        color: #6b7280;
                        font-size: 14px;
                        margin-bottom: 20px;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                        font-size: 11px;
                    }
                    
                    th {
                        background-color: #1D9A6C !important;
                        color: white !important;
                        padding: 12px 8px;
                        text-align: left;
                        border: 1px solid #ddd;
                        font-weight: bold;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    td {
                        padding: 10px 8px;
                        border: 1px solid #ddd;
                    }
                    
                    tbody tr:nth-child(even) {
                        background-color: #f9fafb;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    @media print {
                        body {
                            padding: 0;
                        }
                        
                        .no-print {
                            display: none;
                        }
                        
                        table {
                            page-break-inside: auto;
                        }
                        
                        tr {
                            page-break-inside: avoid;
                            page-break-after: auto;
                        }
                    }
                </style>
            </head>
            <body>
                <h1>Reportes de Bitácora por Sección</h1>
                <div class="metadata">
                    <p><strong>Período:</strong> ${periodLabel}</p>
                    <p><strong>Generado:</strong> ${dateStr}</p>
                </div>
                ${chartImageHTML}
                ${tableHTML}
                <div class="no-print" style="margin-top: 30px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 20px; background-color: #1D9A6C; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; margin-right: 10px;">
                        Imprimir / Guardar como PDF
                    </button>
                    <button onclick="window.close()" style="padding: 10px 20px; background-color: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                        Cerrar
                    </button>
                </div>
                <script>
                    // Auto-print después de cargar
                    window.onload = function() {
                        // Dar tiempo para que se carguen los estilos
                        setTimeout(function() {
                            // Comentar la siguiente línea si no quieres auto-print
                            // window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
    }

    downloadBlob(blob, filename) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    @action
    async loadReportData(options = {}) {
        if (this.hasExternalSections) {
            console.log('[BitacoraReportCard] Skipping load - using external sections');
            return;
        }

        if (!options.silent) {
            this.isLoading = true;
        }

        this.errorMessage = null;

        try {
            const params = this.buildQueryParams(options.params);
            console.log('[BitacoraReportCard] Fetching with params:', params);
            const response = await this.fetchReportData(params);
            console.log('[BitacoraReportCard] Response received:', response);
            this.sections = this.normalizeSections(response?.sections ?? response?.current_period?.sections ?? []);
            this.lastUpdated = new Date();
            console.log('[BitacoraReportCard] Sections updated:', this.sections.length);
        } catch (error) {
            this.errorMessage = this.errorLabel;
            if (this.notifications?.danger) {
                this.notifications.danger(this.errorLabel);
            }
            // eslint-disable-next-line no-console
            console.error('[BitacoraReportCard] Failed to load report data', error);
        } finally {
            this.isLoading = false;
            console.log('[BitacoraReportCard] isLoading set to false');
        }
    }

}




