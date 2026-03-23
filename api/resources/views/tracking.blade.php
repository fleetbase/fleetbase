<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Track Your Delivery</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0a0a0a;
      color: #f5f5f5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      padding: 16px 20px;
      background: #111;
      border-bottom: 1px solid #222;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-logo {
      width: 32px;
      height: 32px;
      background: #f59e0b;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .header-title {
      font-size: 15px;
      font-weight: 600;
    }
    #map {
      flex: 1;
      min-height: 300px;
      background: #1a1a1a;
      position: relative;
      overflow: hidden;
    }
    .map-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 8px;
      color: #444;
      font-size: 14px;
      text-align: center;
      padding: 24px;
    }
    .map-placeholder .icon { font-size: 40px; }
    .panel {
      background: #111;
      border-top: 1px solid #222;
      padding: 20px;
    }
    .status-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
      animation: pulse 2s infinite;
      flex-shrink: 0;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.3); }
    }
    .status-text {
      font-size: 15px;
      font-weight: 600;
    }
    .status-sub {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
    }
    .timeline {
      display: flex;
      flex-direction: column;
      margin-bottom: 24px;
    }
    .timeline-item {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      position: relative;
    }
    .timeline-item:not(:last-child) .timeline-dot::after {
      content: "";
      position: absolute;
      left: 4px;
      top: 12px;
      bottom: -12px;
      width: 1px;
      background: #222;
    }
    .timeline-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 4px;
      position: relative;
    }
    .timeline-dot.done { background: #10b981; }
    .timeline-dot.active { background: #f59e0b; }
    .timeline-dot.pending { background: #333; }
    .timeline-body {
      padding-bottom: 20px;
    }
    .timeline-label {
      font-size: 13px;
      font-weight: 500;
      color: #ccc;
    }
    .timeline-time {
      font-size: 11px;
      color: #555;
      margin-top: 2px;
    }
    .confirm-section {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .confirm-title {
      font-size: 14px;
      font-weight: 600;
      color: #f59e0b;
      margin-bottom: 4px;
    }
    .confirm-desc {
      font-size: 12px;
      color: #888;
      margin-bottom: 14px;
      line-height: 1.5;
    }
    .confirm-btn {
      width: 100%;
      padding: 14px;
      background: #f59e0b;
      color: #0a0a0a;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
    }
    .confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .confirmed-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 8px;
      font-size: 13px;
      color: #34d399;
      font-weight: 500;
    }
    .order-info {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #555;
      padding-top: 16px;
      border-top: 1px solid #1a1a1a;
      gap: 12px;
    }
    .note-input {
      width: 100%;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 10px 12px;
      color: #f5f5f5;
      font-size: 13px;
      font-family: inherit;
      margin-bottom: 10px;
      resize: none;
      outline: none;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-logo">🛵</div>
    <div>
      <div class="header-title">Your Delivery</div>
    </div>
  </div>

  <div id="map">
    <div class="map-placeholder">
      <div class="icon">🗺️</div>
      <div id="map-status-text">Loading rider location...</div>
    </div>
  </div>

  <div class="panel">
    <div class="status-row">
      <div class="status-dot"></div>
      <div>
        <div class="status-text" id="status-label">Rider assigned</div>
        <div class="status-sub" id="rider-name">Finding your rider...</div>
      </div>
    </div>

    <div class="timeline">
      <div class="timeline-item">
        <div class="timeline-dot done" id="dot-1"></div>
        <div class="timeline-body">
          <div class="timeline-label">Order confirmed</div>
          <div class="timeline-time" id="time-1">-</div>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot active" id="dot-2"></div>
        <div class="timeline-body">
          <div class="timeline-label" id="label-2">Rider picking up your order</div>
          <div class="timeline-time" id="time-2">-</div>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot pending" id="dot-3"></div>
        <div class="timeline-body">
          <div class="timeline-label" id="label-3">On the way to you</div>
          <div class="timeline-time" id="time-3">-</div>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot pending" id="dot-4"></div>
        <div class="timeline-body">
          <div class="timeline-label" id="label-4">Delivered</div>
          <div class="timeline-time" id="time-4">-</div>
        </div>
      </div>
    </div>

    <div class="confirm-section" id="confirm-section" style="display:none">
      <div class="confirm-title">Your rider is almost there</div>
      <div class="confirm-desc">
        Let your rider know you are ready to receive. This helps them come directly to you.
      </div>
      <textarea
        class="note-input"
        id="customer-note"
        rows="2"
        placeholder="Optional: gate color, floor number, landmark..."
      ></textarea>
      <button class="confirm-btn" id="confirm-btn" onclick="confirmReady()">
        I'm ready to receive
      </button>
    </div>

    <div id="confirmed-banner" style="display:none" class="confirmed-banner">
      Your rider has been notified you are ready.
    </div>

    <div class="order-info">
      <span>Order #<span id="order-display-id"></span></span>
      <span id="merchant-name"></span>
    </div>
  </div>

  <script>
    const orderId = @json($orderId);
    const displayId = @json($displayId);
    const merchant = @json($merchant);
    const multiPickupApiBase = @json($multiPickupApiBase);

    document.getElementById("merchant-name").textContent = merchant || "Your merchant";
    document.getElementById("order-display-id").textContent = displayId || "—";

    async function pollStatus() {
      if (!orderId) {
        showInvalidState();
        return;
      }

      try {
        const trackingRes = await fetch(`${multiPickupApiBase}/orders/${orderId}/tracking`);
        if (trackingRes.ok) {
          const tracking = await trackingRes.json();
          updateUI(tracking);
        }
      } catch (error) {
      }

      try {
        const confirmRes = await fetch(`${multiPickupApiBase}/orders/${orderId}/customer-confirmed`);
        if (confirmRes.ok) {
          const confirmation = await confirmRes.json();
          if (confirmation.confirmed) {
            document.getElementById("confirm-section").style.display = "none";
            document.getElementById("confirmed-banner").style.display = "flex";
          }
        }
      } catch (error) {
      }
    }

    function updateUI(tracking) {
      const statusMap = {
        created: { label: "Order confirmed, finding rider", step: 1 },
        assigned: { label: "Rider assigned", step: 2 },
        dispatched: { label: "Rider picking up your order", step: 2 },
        started: { label: "Order picked up, on the way", step: 3, showConfirm: true },
        in_progress: { label: "Rider is near you", step: 3, showConfirm: true },
        completed: { label: "Delivered", step: 4 },
      };

      const state = statusMap[tracking.status] || statusMap.created;
      const riderName = tracking.driver && tracking.driver.name ? tracking.driver.name : null;

      document.getElementById("status-label").textContent = state.label;
      document.getElementById("rider-name").textContent = riderName
        ? `Rider: ${riderName}`
        : "A rider will appear here once assigned";
      document.getElementById("map-status-text").textContent = riderName
        ? `Tracking ${riderName}...`
        : "Locating rider...";

      for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById(`dot-${i}`);
        if (i < state.step) {
          dot.className = "timeline-dot done";
        } else if (i === state.step) {
          dot.className = "timeline-dot active";
        } else {
          dot.className = "timeline-dot pending";
        }
      }

      document.getElementById("time-1").textContent = formatTime(tracking.timeline.created_at);
      document.getElementById("time-2").textContent = formatTime(tracking.timeline.dispatched_at);
      document.getElementById("time-3").textContent = formatTime(tracking.timeline.started_at);
      document.getElementById("time-4").textContent = tracking.status === "completed"
        ? formatTime(tracking.timeline.updated_at)
        : "-";

      const confirmed = document.getElementById("confirmed-banner").style.display !== "none";
      document.getElementById("confirm-section").style.display = state.showConfirm && !confirmed ? "block" : "none";
    }

    function formatTime(value) {
      if (!value) {
        return "-";
      }

      return new Date(value).toLocaleString();
    }

    function showInvalidState() {
      document.getElementById("status-label").textContent = "Invalid tracking link";
      document.getElementById("rider-name").textContent = "Order not found";
      document.getElementById("map-status-text").textContent = "Tracking data unavailable";
    }

    async function confirmReady() {
      const button = document.getElementById("confirm-btn");
      const note = document.getElementById("customer-note").value.trim();

      button.disabled = true;
      button.textContent = "Notifying rider...";

      try {
        const response = await fetch(`${multiPickupApiBase}/orders/${orderId}/customer-confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer_note: note || null }),
        });

        if (!response.ok) {
          throw new Error("Request failed");
        }

        document.getElementById("confirm-section").style.display = "none";
        document.getElementById("confirmed-banner").style.display = "flex";
      } catch (error) {
        button.disabled = false;
        button.textContent = "I'm ready to receive";
        window.alert("Could not reach the server. Please try again.");
      }
    }

    pollStatus();
    window.setInterval(pollStatus, 30000);
  </script>
</body>
</html>
