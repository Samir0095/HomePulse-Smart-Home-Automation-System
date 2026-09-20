// Main HomePulse Application Logic
document.addEventListener('DOMContentLoaded', async () => {
  // State variables
  let devices = [];
  let routines = [];
  let currentRoomFilter = 'all';
  let currentUserRole = 'Admin';

  // DOM Elements
  const devicesGrid = document.getElementById('devices-grid');
  const routinesGrid = document.getElementById('routines-grid');
  const logsList = document.getElementById('logs-list');
  const roomFilterContainer = document.getElementById('room-filters');
  const roleSelector = document.getElementById('role-selector');
  const btnAddDevice = document.getElementById('btn-add-device');
  const modalAddDevice = document.getElementById('modal-add-device');
  const closeAddModal = document.getElementById('close-add-modal');
  const btnCancelDevice = document.getElementById('btn-cancel-device');
  const formAddDevice = document.getElementById('form-add-device');
  const btnRefreshLogs = document.getElementById('btn-refresh-logs');

  // Stats elements
  const statTemp = document.getElementById('stat-temp');
  const statHumidity = document.getElementById('stat-humidity');
  const statPower = document.getElementById('stat-power');
  const statActiveDevices = document.getElementById('stat-active-devices');
  const statDailyKwh = document.getElementById('stat-daily-kwh');

  // Init Chart & Telemetry
  const chartManager = new window.ChartManager('energyChart');
  await chartManager.initChart();

  const telemetryManager = new window.TelemetryManager(data => {
    if (statTemp) statTemp.innerText = `${data.ambientTemp} °C`;
    if (statHumidity) statHumidity.innerText = `${data.ambientHumidity} %`;
    if (statPower) statPower.innerText = `${data.currentPowerKw} kW`;
    if (statDailyKwh) statDailyKwh.innerText = `${data.dailyKWh} kWh today`;
    if (statActiveDevices) statActiveDevices.innerText = `${data.totalActiveDevices} / ${data.totalDevices}`;
  });
  telemetryManager.start(3500);

  // Initial Data Fetch
  async function loadInitialData() {
    await fetchDevices();
    await fetchRoutines();
    await fetchLogs();
  }

  // Fetch Devices from Backend
  async function fetchDevices() {
    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      if (data.success) {
        devices = data.data;
        renderDevices();
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  }

  // Fetch Routines from Backend
  async function fetchRoutines() {
    try {
      const res = await fetch('/api/routines');
      const data = await res.json();
      if (data.success) {
        routines = data.data;
        renderRoutines();
      }
    } catch (err) {
      console.error('Error fetching routines:', err);
    }
  }

  // Fetch Audit Logs
  async function fetchLogs() {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (data.success) {
        renderLogs(data.data);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  }

  // Render Smart Devices
  function renderDevices() {
    devicesGrid.innerHTML = '';

    const filtered = currentRoomFilter === 'all' 
      ? devices 
      : devices.filter(d => d.room === currentRoomFilter);

    if (filtered.length === 0) {
      devicesGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-ghost" style="font-size: 32px; margin-bottom: 12px;"></i>
          <p>No smart devices found in ${currentRoomFilter}</p>
        </div>`;
      return;
    }

    filtered.forEach(dev => {
      const card = document.createElement('div');
      card.className = `device-card ${dev.status === 'on' || dev.status === 'locked' || dev.status === 'recording' ? 'on' : ''}`;
      
      const iconClass = getDeviceIcon(dev.type);
      const isGuest = currentUserRole === 'Guest';
      const disabledAttr = isGuest ? 'disabled' : '';

      card.innerHTML = `
        <div class="device-header">
          <div class="device-title">
            <div class="device-icon-box">
              <i class="fa-solid ${iconClass}"></i>
            </div>
            <div class="device-name">
              <h4>${dev.name}</h4>
              <span class="device-room">${dev.room}</span>
            </div>
          </div>
          
          <label class="switch">
            <input type="checkbox" class="toggle-device-status" data-id="${dev.id}" ${dev.status === 'on' || dev.status === 'locked' || dev.status === 'recording' ? 'checked' : ''} ${disabledAttr}>
            <span class="slider"></span>
          </label>
        </div>

        <div class="device-controls">
          ${renderControlForDeviceType(dev, disabledAttr)}
          <div class="control-row" style="margin-top: 8px;">
            <span><i class="fa-solid fa-bolt" style="color: var(--accent-green);"></i> ${dev.powerDrawWatts || 0} W</span>
            ${currentUserRole === 'Admin' ? `<button class="btn-icon btn-delete-device" data-id="${dev.id}" title="Delete Device"><i class="fa-solid fa-trash-can"></i></button>` : ''}
          </div>
        </div>
      `;

      devicesGrid.appendChild(card);
    });

    attachDeviceEventListeners();
  }

  // Render Controls based on Device Type
  function renderControlForDeviceType(dev, disabledAttr) {
    if (dev.type === 'light') {
      return `
        <div class="control-row">
          <span>Brightness: ${dev.brightness || 0}%</span>
          <input type="range" class="range-slider update-brightness" data-id="${dev.id}" min="0" max="100" value="${dev.brightness || 0}" ${disabledAttr}>
        </div>
      `;
    } else if (dev.type === 'thermostat') {
      return `
        <div class="control-row">
          <span>Target Temp: <strong>${dev.targetTemp || 22}°C</strong></span>
          <div>
            <button class="btn btn-sm btn-secondary btn-temp-adj" data-id="${dev.id}" data-change="-1" ${disabledAttr}>-</button>
            <button class="btn btn-sm btn-secondary btn-temp-adj" data-id="${dev.id}" data-change="1" ${disabledAttr}>+</button>
          </div>
        </div>
        <div class="control-row" style="font-size: 11px;">
          <span>Current: ${dev.currentTemp}°C</span>
          <span>Humidity: ${dev.humidity}%</span>
        </div>
      `;
    } else if (dev.type === 'lock') {
      return `
        <div class="control-row">
          <span>Security Lock State</span>
          <strong style="color: ${dev.status === 'locked' ? 'var(--accent-green)' : 'var(--accent-orange)'}">
            ${(dev.status || 'unlocked').toUpperCase()}
          </strong>
        </div>
      `;
    } else if (dev.type === 'camera') {
      return `
        <div class="control-row">
          <span>Feed Status</span>
          <span class="badge" style="background: rgba(74, 222, 128, 0.2); color: var(--accent-green)">LIVE 1080P</span>
        </div>
      `;
    }
    return `<div class="control-row"><span>Status: ${dev.status.toUpperCase()}</span></div>`;
  }

  // Device Icon Mapping
  function getDeviceIcon(type) {
    switch (type) {
      case 'light': return 'fa-lightbulb';
      case 'thermostat': return 'fa-temperature-arrow-up';
      case 'lock': return 'fa-lock';
      case 'camera': return 'fa-video';
      case 'appliance': return 'fa-plug';
      case 'meter': return 'fa-gauge-high';
      default: return 'fa-microchip';
    }
  }

  // Device Action Listeners
  function attachDeviceEventListeners() {
    // Toggle Status
    document.querySelectorAll('.toggle-device-status').forEach(input => {
      input.addEventListener('change', async (e) => {
        const id = e.target.getAttribute('data-id');
        const dev = devices.find(d => d.id === id);
        let newStatus = e.target.checked ? 'on' : 'off';
        if (dev.type === 'lock') newStatus = e.target.checked ? 'locked' : 'unlocked';
        if (dev.type === 'camera') newStatus = e.target.checked ? 'recording' : 'idle';

        await updateDeviceState(id, { status: newStatus, updatedBy: currentUserRole });
      });
    });

    // Temp Adjustment
    document.querySelectorAll('.btn-temp-adj').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        const change = parseInt(btn.getAttribute('data-change'));
        const dev = devices.find(d => d.id === id);
        const newTemp = Math.min(30, Math.max(16, (dev.targetTemp || 22) + change));
        await updateDeviceState(id, { targetTemp: newTemp, updatedBy: currentUserRole });
      });
    });

    // Brightness Slider
    document.querySelectorAll('.update-brightness').forEach(slider => {
      slider.addEventListener('change', async (e) => {
        const id = slider.getAttribute('data-id');
        const val = parseInt(e.target.value);
        await updateDeviceState(id, { brightness: val, status: val > 0 ? 'on' : 'off', updatedBy: currentUserRole });
      });
    });

    // Delete Device
    document.querySelectorAll('.btn-delete-device').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this smart device?')) {
          await deleteDevice(id);
        }
      });
    });
  }

  // API Call: Update Device State
  async function updateDeviceState(id, payload) {
    try {
      const res = await fetch(`/api/devices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        await fetchDevices();
        await fetchLogs();
      }
    } catch (err) {
      console.error('Error updating device:', err);
    }
  }

  // API Call: Delete Device
  async function deleteDevice(id) {
    try {
      const res = await fetch(`/api/devices/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchDevices();
        await fetchLogs();
      }
    } catch (err) {
      console.error('Error deleting device:', err);
    }
  }

  // Render Automation Routines
  function renderRoutines() {
    routinesGrid.innerHTML = '';
    routines.forEach(rt => {
      const card = document.createElement('div');
      card.className = 'routine-card';
      const isGuest = currentUserRole === 'Guest';

      card.innerHTML = `
        <div class="routine-icon">
          <i class="fa-solid ${rt.icon || 'fa-bolt'}"></i>
        </div>
        <div class="routine-info">
          <h4>${rt.name}</h4>
          <p>${rt.description}</p>
        </div>
      `;

      card.addEventListener('click', async () => {
        if (isGuest) {
          alert('Guest accounts are restricted from triggering automation routines.');
          return;
        }
        await triggerRoutine(rt.id);
      });

      routinesGrid.appendChild(card);
    });
  }

  // Trigger Routine API
  async function triggerRoutine(routineId) {
    try {
      const res = await fetch(`/api/routines/trigger/${routineId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: `${currentUserRole} User` })
      });
      const data = await res.json();
      if (data.success) {
        await fetchDevices();
        await fetchRoutines();
        await fetchLogs();
      }
    } catch (err) {
      console.error('Error triggering routine:', err);
    }
  }

  // Render System Audit Logs
  function renderLogs(logs) {
    logsList.innerHTML = '';
    logs.slice(0, 15).forEach(log => {
      const item = document.createElement('div');
      item.className = `log-item ${log.type || 'system'}`;
      const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      item.innerHTML = `
        <span class="log-time">${timeStr}</span>
        <span class="log-msg"><strong>[${log.user || 'System'}]</strong> ${log.message}</span>
      `;
      logsList.appendChild(item);
    });
  }

  // Room Filter Event Listeners
  if (roomFilterContainer) {
    roomFilterContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-btn')) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentRoomFilter = e.target.getAttribute('data-room');
        renderDevices();
      }
    });
  }

  // Role Switcher Event Listener
  if (roleSelector) {
    roleSelector.addEventListener('change', (e) => {
      currentUserRole = e.target.value;
      const userNameElem = document.getElementById('user-name');
      const avatarElem = document.getElementById('user-avatar');

      if (currentUserRole === 'Admin') {
        if (userNameElem) userNameElem.innerText = 'Sarah Connor';
        if (avatarElem) avatarElem.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah';
        if (btnAddDevice) btnAddDevice.style.display = 'inline-flex';
      } else if (currentUserRole === 'Resident') {
        if (userNameElem) userNameElem.innerText = 'Alex Connor';
        if (avatarElem) avatarElem.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex';
        if (btnAddDevice) btnAddDevice.style.display = 'none';
      } else {
        if (userNameElem) userNameElem.innerText = 'Guest User';
        if (avatarElem) avatarElem.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest';
        if (btnAddDevice) btnAddDevice.style.display = 'none';
      }

      renderDevices();
      renderRoutines();
    });
  }

  // Modal Handlers
  if (btnAddDevice) btnAddDevice.addEventListener('click', () => modalAddDevice.classList.add('open'));
  if (closeAddModal) closeAddModal.addEventListener('click', () => modalAddDevice.classList.remove('open'));
  if (btnCancelDevice) btnCancelDevice.addEventListener('click', () => modalAddDevice.classList.remove('open'));

  // Form Submit: Add New Device
  if (formAddDevice) {
    formAddDevice.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('dev-name').value;
      const type = document.getElementById('dev-type').value;
      const room = document.getElementById('dev-room').value;
      const powerDrawWatts = document.getElementById('dev-power').value;

      try {
        const res = await fetch('/api/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, type, room, powerDrawWatts })
        });
        const data = await res.json();
        if (data.success) {
          modalAddDevice.classList.remove('open');
          formAddDevice.reset();
          await fetchDevices();
          await fetchLogs();
        }
      } catch (err) {
        console.error('Error adding device:', err);
      }
    });
  }

  if (btnRefreshLogs) {
    btnRefreshLogs.addEventListener('click', fetchLogs);
  }

  // Initialize
  await loadInitialData();
});
