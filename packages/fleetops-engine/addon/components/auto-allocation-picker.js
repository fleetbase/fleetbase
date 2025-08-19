import Component from '@glimmer/component';
import { action } from '@ember/object';
import ENV from '@fleetbase/console/config/environment';
import { inject as service } from '@ember/service';
export default class AutoAllocationPickerComponent extends Component {
    @service currentUser;
    
    get fleetOptions() {
        return this.args.fleetOptions || [];
    }

    get selectedFleet() {
        return this.args.selectedFleet;
    }

    get autoAllocationDate() {
        return this.args.autoAllocationDate;
    }

    // Toggle visibility of Auto Allocate UI based on request URL (?auto_allocation=true) or explicit arg
    get isAutoAllocationEnabled() {
        if (typeof this.args.autoAllocationEnabled === 'boolean') {
            return this.args.autoAllocationEnabled;
        }
        try {
            const params = new URLSearchParams(window.location.search);
            const v = params.get('auto_allocation') ?? params.get('autoAllocation');
            if (v == null) return false;
            const s = String(v).toLowerCase();
            return s === 'true' || s === '1' || s === 'yes';
        } catch (_) {
            return false;
        }
    }

    // Minimum selectable date (tomorrow, local timezone)
    get minDate() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }

    // Instance-only pretty display: 'dd MMM- dd MMM, yyyy'
    get prettyDateRange() {
        const value = this.args.autoAllocationDate;
        if (!value) {
            return '';
        }
        const parts = this.#parseRange(value);
        if (!parts) {
            return '';
        }
        const [start, end] = parts;
        const startStr = this.#formatDdMmm(start);
        const endStr = this.#formatDdMmm(end);
        const year = end.getFullYear();
        return `${startStr}- ${endStr}, ${year}`;
    }

    #formatDdMmm(date) {
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d)) {
            return '';
        }
        const day = String(d.getDate()).padStart(2, '0');
        const month = d.toLocaleString(undefined, { month: 'short' }); // Sep, Feb
        return `${day} ${month}`;
    }

    #parseRange(value) {
        // Accept array [start, end], comma string 'YYYY-MM-DD, YYYY-MM-DD', or dash-joined 'Aug 20, 2025 - Aug 29, 2025'
        if (Array.isArray(value) && value.length === 2) {
            const [s, e] = value;
            return [new Date(s), new Date(e)];
        }
        if (typeof value === 'string') {
            // Try dash variants first
            const dashSplit = value.split(/\s[-–—]\s/);
            if (dashSplit.length === 2) {
                return [new Date(dashSplit[0]), new Date(dashSplit[1])];
            }
            // Then try comma-separated ISO
            const commaSplit = value.split(',');
            if (commaSplit.length === 2) {
                return [new Date(commaSplit[0].trim()), new Date(commaSplit[1].trim())];
            }
        }
        return null;
    }

    get hasDate() {
        const v = this.args.autoAllocationDate;
        if (!v) {
            return false;
        }
        if (Array.isArray(v)) {
            return v.length === 2 && v[0] && v[1];
        }
        if (typeof v === 'string') {
            return v.trim().length > 0;
        }
        if (v && typeof v === 'object') {
            // AirDatepicker object shape
            return Boolean(v.formattedDate) || Boolean(v.date);
        }
        return Boolean(v);
    }

    #formatDdMmYyyy(date) {
        const d = date instanceof Date ? date : new Date(date);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    }

    @action async allocate() {
        const parts = this.#parseRange(this.args.autoAllocationDate);
        if (!parts) {
            return;
        }
        const [start, end] = parts;
        const start_date = this.#formatDdMmYyyy(start);
        const end_date = this.#formatDdMmYyyy(end);
        // Pull token & company from args or auth session (same approach as leaves route)
        const authSession = this.#getAuthSession();
        const company_uuid = this.args.companyUuid
            || this.currentUser?.user?.company_uuid
            || this.session?.data?.authenticated?.company_uuid;
        const searchParams = new URLSearchParams();
        searchParams.set('start_date', start_date);
        searchParams.set('end_date', end_date);
        if (company_uuid) {
            searchParams.set('company_uuid', company_uuid);
        }
        const requestUrl = `${ENV.API.host}/api/v1/shift-assignments/data?${searchParams.toString()}`;

        try {
            const headers = {};
            const token = this.args.bearerToken || authSession?.authenticated?.token;
            if (token) headers['Authorization'] = `Bearer ${token}`;
            headers['Content-Type'] = 'application/json';
            headers['Accept'] = 'application/json';

            const resp = await fetch(requestUrl, { method: 'GET', headers });
            const data = await resp.json().catch(() => null);

            // If primary call succeeds, trigger async allocation
            let asyncAllocation = { attempted: false };
            if (resp.ok) {
                asyncAllocation.attempted = true;
                try {
                    const followUpHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
                    if (headers['Authorization']) {
                        followUpHeaders['Authorization'] = headers['Authorization'];
                    }
                    // We'll open a new tab only if we proceed with async allocation
                    let newTabRef = null;
                    // Build payload expected by async allocation API
                    // Requirements inferred from validation errors:
                    // - body.problem_type: required (string)
                    // - body.dates: required (array)
                    // - body.dated_shifts: array of dicts (not raw strings)
                    // - body.resources[*].preferences.preferred_start_time & preferred_end_time: required
                    const datesArr = Array.isArray(data?.data?.dates) ? data.data.dates : [];
                    const rawResources = Array.isArray(data?.data?.resources) ? data.data.resources : [];

                    const defaultStart = null;
                    const defaultEnd = null;

                    const resources = rawResources.map((r) => {
                        const prefs = r?.preferences || {};
                        const resolvedStart = prefs.preferred_start_time ?? defaultStart ?? null;
                        const resolvedEnd = prefs.preferred_end_time ?? defaultEnd ?? null;

                        const preferences = (resolvedStart == null && resolvedEnd == null)
                            ? null
                            : {
                                ...prefs,
                                preferred_start_time: resolvedStart,
                                preferred_end_time: resolvedEnd,
                            };

                        return {
                            ...r,
                            preferences,
                        };
                    });

                    // Build/normalize dated_shifts to include required keys: id, start_time (plus date)
                    const normalizeShift = (s, date) => {
                        const id = s?.id ?? s?.uuid ?? s?.shift_id ?? null;
                        const start_time = s?.start_time ?? s?.startTime ?? s?.starttime ?? s?.start ?? null;
                        const d = s?.date ?? date ?? null;
                        return { ...s, id, start_time, date: d };
                    };

                    let dated_shifts = [];
                    if (Array.isArray(data?.data?.dated_shifts) && data.data.dated_shifts.length > 0) {
                        dated_shifts = data.data.dated_shifts.map((s) => normalizeShift(s, s?.date));
                    } else if (Array.isArray(data?.data?.shifts) && data.data.shifts.length > 0) {
                        dated_shifts = data.data.shifts.map((s) => normalizeShift(s, s?.date));
                    } else if (data?.data?.shifts_by_date && typeof data.data.shifts_by_date === 'object') {
                        // Expect shape: { 'YYYY-MM-DD': [ { id, start_time, ... }, ... ], ... }
                        for (const [date, arr] of Object.entries(data.data.shifts_by_date)) {
                            if (Array.isArray(arr)) {
                                dated_shifts.push(...arr.map((s) => normalizeShift(s, date)));
                            }
                        }
                    } else if (Array.isArray(datesArr) && datesArr.length > 0 && typeof datesArr[0] === 'object') {
                        // dates array contains shift-like objects
                        dated_shifts = datesArr.map((s) => normalizeShift(s, s?.date));
                    } else {
                        // Fallback: create minimal objects from dates only
                        dated_shifts = datesArr.map((d) => ({ date: d }));
                    }

                    const payload = (data && data.data)
                        ? {
                            problem_type: this.args.problemType || 'shift_assignment',
                            dates: datesArr,
                            dated_shifts,
                            resources,
                            previous_allocation_data: data?.data?.previous_allocation_data ?? {},
                            // Pass through recurring_shifts if present
                            ...(Array.isArray(data?.data?.recurring_shifts) ? { recurring_shifts: data.data.recurring_shifts } : {}),
                        }
                        : data;

                    // If no trips available (neither dated_shifts nor recurring_shifts), do not call async API
                    const hasDatedTrips = Array.isArray(dated_shifts) && dated_shifts.some((s) => {
                        if (!s || typeof s !== 'object') return false;
                        const id = s.id || s.shift_id;
                        const st = s.start_time;
                        return Boolean(id && st);
                    });
                    const hasRecurringTrips = Array.isArray(payload?.recurring_shifts) && payload.recurring_shifts.length > 0;
                    if (!hasDatedTrips && !hasRecurringTrips) {
                        asyncAllocation.skipped = true;
                        asyncAllocation.reason = 'no_trips';
                        asyncAllocation.message = 'No trips are available';
                        // Inform user immediately as a fallback (UI can also use onAllocate callback)
                        try { window.alert('No trips are available'); } catch (_) {}
                        // Short-circuit
                        if (typeof this.args.onAllocate === 'function') {
                            this.args.onAllocate({ ok: true, status: resp.status, data, url: requestUrl, asyncAllocation });
                        }
                        return;
                    }

                    // Open the tab now since we are proceeding with async allocation
                    try {
                        newTabRef = window.open('', '_blank');
                    } catch (_) {}

                    const followUpResp = await fetch('https://dev-resource-allocation.agilecyber.com/initiate-async-allocation', {
                        method: 'POST',
                        headers: followUpHeaders,
                        body: JSON.stringify(payload),
                    });
                    asyncAllocation.status = followUpResp.status;
                    asyncAllocation.ok = followUpResp.ok;
                    const followUpBody = await followUpResp.json().catch(() => null);
                    asyncAllocation.body = followUpBody;

                    // If API indicates success and provides empty URL, redirect new tab to results with allocation UUID
                    if (followUpResp.ok && followUpBody?.success === true) {
                        let targetUrl = typeof followUpBody.url === 'string' ? followUpBody.url.trim() : '';
                        if (!targetUrl) {
                            const uuid = followUpBody?.uuid;
                            if (uuid) {
                                targetUrl = `https://autoallocate.fleetyes.com/results?allocation_uuid=${encodeURIComponent(uuid)}`;
                            }
                        }
                        if (targetUrl) {
                            asyncAllocation.redirectedTo = targetUrl;
                            // Prefer navigating the pre-opened tab; do NOT navigate current tab
                            if (newTabRef) {
                                let navigated = false;
                                try { newTabRef.location.replace(targetUrl); navigated = true; } catch (_) {}
                                if (!navigated) {
                                    // If we can't navigate programmatically, show a clickable link in the pre-opened tab
                                    try {
                                        const doc = newTabRef.document;
                                        if (doc) {
                                            const p = doc.createElement('p');
                                            p.style.fontFamily = 'Arial, sans-serif';
                                            p.style.margin = '16px';
                                            p.appendChild(doc.createTextNode('Click to view results: '));
                                            const a = doc.createElement('a');
                                            a.href = targetUrl;
                                            a.target = '_self';
                                            a.textContent = 'Open Results';
                                            p.appendChild(a);
                                            if (doc.body) {
                                                doc.body.innerHTML = '';
                                                doc.body.appendChild(p);
                                            } else if (doc.documentElement) {
                                                const body = doc.createElement('body');
                                                body.appendChild(p);
                                                doc.documentElement.appendChild(body);
                                            }
                                        }
                                    } catch (_) {}
                                }
                            } else {
                                // No pre-opened tab (likely blocked). Attempt to open now (may be blocked by popup settings).
                                try { window.open(targetUrl, '_blank'); } catch (_) {}
                            }
                        }
                    }
                } catch (e2) {
                    asyncAllocation.error = e2;
                }
            }

            if (typeof this.args.onAllocate === 'function') {
                this.args.onAllocate({ ok: resp.ok, status: resp.status, data, url: requestUrl, asyncAllocation });
            }
        } catch (e) {
            if (typeof this.args.onAllocate === 'function') {
                this.args.onAllocate({ ok: false, error: e, url: requestUrl });
            }
        }
    }

    #getAuthSession() {
        try {
            return JSON.parse(localStorage.getItem('ember_simple_auth-session'));
        } catch (_) {
            return null;
        }
    }
}


