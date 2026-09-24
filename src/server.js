const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Path constants
const DATA_DIR = path.join(__dirname, 'data');
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');
const ROUTINES_FILE = path.join(DATA_DIR, 'routines.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const BUDGET_FILE = path.join(DATA_DIR, 'budget.json');
const DIAGNOSTICS_FILE = path.join(DATA_DIR, 'diagnostics.json');

// Ensure data directory exists on startup
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to read JSON safely with dynamic fallback
function readJSON(filePath, defaultFallback = []) {
  try {
    if (!fs.existsSync(filePath)) return defaultFallback;
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return defaultFallback;
  }
}

// Helper to write JSON
function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err.message);
    return false;
  }
}

// Helper to log audit message (Caps logs at 50)
function addAuditLog(message, type = 'system', user = 'System') {
  const logs = readJSON(LOGS_FILE, []);
  const newLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type,
    user,
    message
  };
  logs.unshift(newLog);
  
  // Enforce 50 entries log retention cap
  if (logs.length > 50) logs.length = 50;
  
  writeJSON(LOGS_FILE, logs);
  return newLog;
}

// --- REST API ENDPOINTS ---

// 1. Devices API
app.get('/api/devices', (req, res) => {
  const devices = readJSON(DEVICES_FILE, []);
  res.json({ success: true, data: devices });
});

app.get('/api/devices/:id', (req, res) => {
  const devices = readJSON(DEVICES_FILE, []);
  const device = devices.find(d => d.id === req.params.id);
  if (!device) return res.status(404).json({ success: false, error: 'Device not found' });
  res.json({ success: true, data: device });
});

app.post('/api/devices', (req, res) => {
  const { name, type, room, status, powerDrawWatts } = req.body;
  if (!name || !type || !room) {
    return res.status(400).json({ success: false, error: 'Missing required fields (name, type, room)' });
  }

  const devices = readJSON(DEVICES_FILE, []);
  const newDevice = {
    id: `dev-${Date.now()}`,
    name,
    type,
    room,
    status: status || 'off',
    brightness: type === 'light' ? 100 : undefined,
    targetTemp: type === 'thermostat' ? 24 : undefined,
    currentTemp: type === 'thermostat' ? 24.5 : undefined,
    humidity: type === 'thermostat' ? 50 : undefined,
    powerDrawWatts: Number(powerDrawWatts) || 10,
    lastUpdated: new Date().toISOString()
  };

  devices.push(newDevice);
  writeJSON(DEVICES_FILE, devices);
  addAuditLog(`New smart device added: '${newDevice.name}' in ${newDevice.room}`, 'device', 'Admin');

  res.status(201).json({ success: true, data: newDevice });
});

app.put('/api/devices/:id', (req, res) => {
  const devices = readJSON(DEVICES_FILE, []);
  const index = devices.findIndex(d => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: 'Device not found' });

  const updatedDevice = {
    ...devices[index],
    ...req.body,
    lastUpdated: new Date().toISOString()
  };

  devices[index] = updatedDevice;
  writeJSON(DEVICES_FILE, devices);

  const statusMsg = req.body.status !== undefined ? `status set to ${req.body.status.toUpperCase()}` : 'updated';
  addAuditLog(`Device '${updatedDevice.name}' ${statusMsg}`, 'device', req.body.updatedBy || 'User');

  res.json({ success: true, data: updatedDevice });
});

app.delete('/api/devices/:id', (req, res) => {
  let devices = readJSON(DEVICES_FILE, []);
  const device = devices.find(d => d.id === req.params.id);
  if (!device) return res.status(404).json({ success: false, error: 'Device not found' });

  devices = devices.filter(d => d.id !== req.params.id);
  writeJSON(DEVICES_FILE, devices);
  addAuditLog(`Device removed: '${device.name}'`, 'device', 'Admin');

  res.json({ success: true, data: { message: `Device ${req.params.id} deleted successfully` } });
});

// 2. Routines / Automation API
app.get('/api/routines', (req, res) => {
  const routines = readJSON(ROUTINES_FILE, []);
  res.json({ success: true, data: routines });
});

app.post('/api/routines/trigger/:id', (req, res) => {
  const routines = readJSON(ROUTINES_FILE, []);
  const routine = routines.find(r => r.id === req.params.id);
  if (!routine) return res.status(404).json({ success: false, error: 'Routine not found' });

  const devices = readJSON(DEVICES_FILE, []);
  let updatedCount = 0;

  routine.actions.forEach(action => {
    const devIndex = devices.findIndex(d => d.id === action.deviceId);
    if (devIndex !== -1) {
      devices[devIndex][action.property] = action.value;
      devices[devIndex].lastUpdated = new Date().toISOString();
      updatedCount++;
    }
  });

  writeJSON(DEVICES_FILE, devices);

  routine.lastTriggered = new Date().toISOString();
  writeJSON(ROUTINES_FILE, routines);

  addAuditLog(`Automation Routine executed: '${routine.name}' (${updatedCount} devices updated)`, 'routine', req.body.user || 'Alex Connor');

  res.json({ success: true, data: { message: `Routine '${routine.name}' triggered successfully`, updatedCount } });
});

app.post('/api/routines', (req, res) => {
  const { name, description, icon, actions } = req.body;
  if (!name || !actions || !Array.isArray(actions)) {
    return res.status(400).json({ success: false, error: 'Name and actions array are required' });
  }

  const routines = readJSON(ROUTINES_FILE, []);
  const newRoutine = {
    id: `routine-${Date.now()}`,
    name,
    icon: icon || 'fa-wand-magic-sparkles',
    description: description || 'Custom user automation rule.',
    actions,
    lastTriggered: 'Never'
  };

  routines.push(newRoutine);
  writeJSON(ROUTINES_FILE, routines);
  addAuditLog(`Created custom automation rule: '${newRoutine.name}'`, 'routine', req.body.user || 'Admin');

  res.status(201).json({ success: true, data: newRoutine });
});

app.delete('/api/routines/:id', (req, res) => {
  let routines = readJSON(ROUTINES_FILE, []);
  const routine = routines.find(r => r.id === req.params.id);
  if (!routine) return res.status(404).json({ success: false, error: 'Routine not found' });

  routines = routines.filter(r => r.id !== req.params.id);
  writeJSON(ROUTINES_FILE, routines);
  addAuditLog(`Deleted automation routine: '${routine.name}'`, 'routine', 'Admin');

  res.json({ success: true, data: { message: `Routine ${req.params.id} deleted successfully` } });
});

// 3. Energy Budget API
app.get('/api/energy-budget', (req, res) => {
  const defaultBudget = {
    monthlyKWhBudget: 350,
    costPerKWh: 0.15,
    currency: "$",
    alertThresholdPercent: 80
  };
  const budget = { ...defaultBudget, ...readJSON(BUDGET_FILE, {}) };

  const currentKWh = 185.4;
  const costToDate = Number((currentKWh * budget.costPerKWh).toFixed(2));
  const projectedKWh = 370.0;
  const projectedCost = Number((projectedKWh * budget.costPerKWh).toFixed(2));
  const usagePercent = Math.round((currentKWh / budget.monthlyKWhBudget) * 100);

  res.json({
    success: true,
    data: {
      ...budget,
      currentKWh,
      costToDate,
      projectedKWh,
      projectedCost,
      usagePercent,
      isExceeded: usagePercent >= budget.alertThresholdPercent
    }
  });
});

app.put('/api/energy-budget', (req, res) => {
  let budget = readJSON(BUDGET_FILE, {});
  budget = {
    ...budget,
    ...req.body,
    lastUpdated: new Date().toISOString()
  };
  writeJSON(BUDGET_FILE, budget);
  addAuditLog(`Updated Energy Budget target to ${budget.monthlyKWhBudget} kWh`, 'system', req.body.updatedBy || 'Admin');

  res.json({ success: true, data: budget });
});

// 4. Device Diagnostics API
app.get('/api/diagnostics', (req, res) => {
  const diagnostics = readJSON(DIAGNOSTICS_FILE, []);
  const totalCount = diagnostics.length;
  const warningCount = diagnostics.filter(d => d.status === 'warning').length;
  const updateAvailableCount = diagnostics.filter(d => d.updateAvailable).length;

  res.json({
    success: true,
    data: {
      items: diagnostics,
      summary: {
        totalCount,
        warningCount,
        updateAvailableCount,
        overallHealth: warningCount === 0 ? '100% Operational' : `${warningCount} Warning(s) Detected`
      }
    }
  });
});

app.post('/api/diagnostics/firmware-update/:id', (req, res) => {
  let diagnostics = readJSON(DIAGNOSTICS_FILE, []);
  const item = diagnostics.find(d => d.deviceId === req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'Diagnostic entry not found for device' });

  if (!item.updateAvailable) {
    return res.status(400).json({ success: false, error: 'No firmware update available for this device' });
  }

  const oldVer = item.firmwareVersion;
  const newVer = item.updateAvailable;
  item.firmwareVersion = newVer;
  item.updateAvailable = null;
  item.status = item.batteryLevel < 20 ? 'warning' : 'optimal';
  item.issue = item.batteryLevel < 20 ? 'Low Battery Level' : 'System Normal';

  writeJSON(DIAGNOSTICS_FILE, diagnostics);
  addAuditLog(`OTA Firmware Update executed on '${item.deviceName}' from ${oldVer} to ${newVer}`, 'system', req.body.user || 'Admin');

  res.json({ success: true, data: { message: `Firmware upgraded successfully to ${newVer}`, item } });
});

// 5. Emergency Safety Lockdown API
app.post('/api/emergency/trigger', (req, res) => {
  const { hazardType, user } = req.body;
  const devices = readJSON(DEVICES_FILE, []);
  let actionsTaken = [];
  const mode = hazardType || 'fire';

  if (mode === 'fire' || mode === 'gas_leak') {
    devices.forEach(d => {
      if (d.type === 'lock') { d.status = 'unlocked'; actionsTaken.push(`${d.name} UNLOCKED for evacuation`); }
      if (d.type === 'light') { d.status = 'on'; d.brightness = 100; actionsTaken.push(`${d.name} turned ON 100%`); }
      if (d.type === 'thermostat') { d.status = 'off'; actionsTaken.push(`${d.name} turned OFF`); }
    });
  } else if (mode === 'intruder') {
    devices.forEach(d => {
      if (d.type === 'lock') { d.status = 'locked'; actionsTaken.push(`${d.name} LOCKED`); }
      if (d.type === 'light' && d.room === 'Outdoor') { d.status = 'on'; d.brightness = 100; actionsTaken.push(`${d.name} turned ON`); }
      if (d.type === 'camera') { d.status = 'recording'; actionsTaken.push(`${d.name} Armed`); }
    });
  }

  writeJSON(DEVICES_FILE, devices);
  addAuditLog(`🚨 EMERGENCY ALARM TRIGGERED: Hazard '${mode.toUpperCase()}'!`, 'security', user || 'System Alarm');

  res.json({
    success: true,
    data: {
      hazardType: mode,
      status: 'ACTIVE_EMERGENCY',
      message: `Emergency safety protocol executed for ${mode.toUpperCase()}.`,
      actionsTaken
    }
  });
});

app.post('/api/emergency/reset', (req, res) => {
  addAuditLog(`🟢 Emergency Hazard Alarm RESET by user.`, 'security', req.body.user || 'Admin');
  res.json({ success: true, data: { message: 'Emergency alarm state reset successfully.' } });
});

// 6. Users & Audit Logs API
app.get('/api/users', (req, res) => {
  res.json({ success: true, data: readJSON(USERS_FILE, []) });
});

app.get('/api/logs', (req, res) => {
  res.json({ success: true, data: readJSON(LOGS_FILE, []) });
});

app.post('/api/logs', (req, res) => {
  const { message, type, user } = req.body;
  if (!message) return res.status(400).json({ success: false, error: 'Message is required' });
  const log = addAuditLog(message, type, user);
  res.json({ success: true, data: log });
});

// 7. Telemetry & Analytics API
app.get('/api/telemetry/live', (req, res) => {
  const devices = readJSON(DEVICES_FILE, []);
  const activePowerWatts = devices.reduce((total, d) => total + (d.status === 'on' ? (d.powerDrawWatts || 0) : 0), 0);
  const activeCount = devices.filter(d => d.status === 'on').length;

  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      ambientTemp: 24.5,
      ambientHumidity: 48,
      totalActiveDevices: activeCount,
      totalDevices: devices.length,
      currentPowerKw: Number((activePowerWatts / 1000).toFixed(2)),
      dailyKWh: 14.8
    }
  });
});

app.get('/api/energy-analytics', (req, res) => {
  res.json({
    success: true,
    data: {
      hourlyData: [
        { hour: '00:00', kWh: 0.42 }, { hour: '06:00', kWh: 0.65 },
        { hour: '12:00', kWh: 1.85 }, { hour: '18:00', kWh: 2.10 }
      ],
      roomDistribution: [
        { room: 'Living Room', percentage: 42 }, { room: 'Kitchen', percentage: 25 }
      ]
    }
  });
});

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 HomePulse API running on http://localhost:${PORT}`);
  });
}

module.exports = app;