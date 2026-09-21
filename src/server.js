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



// Helper to read JSON
function readJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return [];
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

// Helper to log audit message
function addAuditLog(message, type = 'system', user = 'System') {
  const logs = readJSON(LOGS_FILE);
  const newLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type,
    user,
    message
  };
  logs.unshift(newLog);
  // Keep last 50 logs
  if (logs.length > 50) logs.pop();
  writeJSON(LOGS_FILE, logs);
  return newLog;
}

// --- REST API ENDPOINTS ---

// 1. Devices API
app.get('/api/devices', (req, res) => {
  const devices = readJSON(DEVICES_FILE);
  res.json({ success: true, data: devices });
});

app.get('/api/devices/:id', (req, res) => {
  const devices = readJSON(DEVICES_FILE);
  const device = devices.find(d => d.id === req.params.id);
  if (!device) return res.status(404).json({ success: false, error: 'Device not found' });
  res.json({ success: true, data: device });
});

app.post('/api/devices', (req, res) => {
  const { name, type, room, status, powerDrawWatts } = req.body;
  if (!name || !type || !room) {
    return res.status(400).json({ success: false, error: 'Missing required fields (name, type, room)' });
  }

  const devices = readJSON(DEVICES_FILE);
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
  const devices = readJSON(DEVICES_FILE);
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
  let devices = readJSON(DEVICES_FILE);
  const device = devices.find(d => d.id === req.params.id);
  if (!device) return res.status(404).json({ success: false, error: 'Device not found' });

  devices = devices.filter(d => d.id !== req.params.id);
  writeJSON(DEVICES_FILE, devices);
  addAuditLog(`Device removed: '${device.name}'`, 'device', 'Admin');

  res.json({ success: true, message: `Device ${req.params.id} deleted successfully` });
});

// 2. Routines / Automation API
app.get('/api/routines', (req, res) => {
  const routines = readJSON(ROUTINES_FILE);
  res.json({ success: true, data: routines });
});

app.post('/api/routines/trigger/:id', (req, res) => {
  const routines = readJSON(ROUTINES_FILE);
  const routine = routines.find(r => r.id === req.params.id);
  if (!routine) return res.status(404).json({ success: false, error: 'Routine not found' });

  const devices = readJSON(DEVICES_FILE);
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

  res.json({ success: true, message: `Routine '${routine.name}' triggered successfully`, updatedCount });
});

app.post('/api/routines', (req, res) => {
  const { name, description, icon, actions } = req.body;
  if (!name || !actions || !Array.isArray(actions)) {
    return res.status(400).json({ success: false, error: 'Name and actions array are required' });
  }

  const routines = readJSON(ROUTINES_FILE);
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
  let routines = readJSON(ROUTINES_FILE);
  const routine = routines.find(r => r.id === req.params.id);
  if (!routine) return res.status(404).json({ success: false, error: 'Routine not found' });

  routines = routines.filter(r => r.id !== req.params.id);
  writeJSON(ROUTINES_FILE, routines);
  addAuditLog(`Deleted automation routine: '${routine.name}'`, 'routine', 'Admin');

  res.json({ success: true, message: `Routine ${req.params.id} deleted successfully` });
});

// Energy Budget & Cost Estimator API
app.get('/api/energy-budget', (req, res) => {
  const budget = readJSON(BUDGET_FILE) || {
    monthlyKWhBudget: 350,
    costPerKWh: 0.15,
    currency: "$",
    alertThresholdPercent: 80
  };

  const currentKWh = 185.4; // Simulated month-to-date kWh usage
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
  let budget = readJSON(BUDGET_FILE) || {};
  budget = {
    ...budget,
    ...req.body,
    lastUpdated: new Date().toISOString()
  };
  writeJSON(BUDGET_FILE, budget);
  addAuditLog(`Updated Energy Budget target to ${budget.monthlyKWhBudget} kWh at ${budget.currency}${budget.costPerKWh}/kWh`, 'system', req.body.updatedBy || 'Admin');

  res.json({ success: true, data: budget });
});

// Device Health Diagnostics & OTA Firmware Update API
app.get('/api/diagnostics', (req, res) => {
  const diagnostics = readJSON(DIAGNOSTICS_FILE);
  const totalCount = diagnostics.length;
  const warningCount = diagnostics.filter(d => d.status === 'warning').length;
  const updateAvailableCount = diagnostics.filter(d => d.updateAvailable).length;

  res.json({
    success: true,
    data: diagnostics,
    summary: {
      totalCount,
      warningCount,
      updateAvailableCount,
      overallHealth: warningCount === 0 ? '100% Operational' : `${warningCount} Warning(s) Detected`
    }
  });
});

app.post('/api/diagnostics/firmware-update/:id', (req, res) => {
  let diagnostics = readJSON(DIAGNOSTICS_FILE);
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
  addAuditLog(`OTA Firmware Update executed on '${item.deviceName}': upgraded from ${oldVer} to ${newVer}`, 'system', req.body.user || 'Admin');

  res.json({ success: true, message: `Firmware upgraded successfully to ${newVer}`, data: item });
});

// -------------------------------------------------------------
// SIGNIFICANT FEATURE: Emergency Safety Lockdown & Hazard Alarm System
// -------------------------------------------------------------
app.post('/api/emergency/trigger', (req, res) => {
  const { hazardType, user } = req.body;
  const devices = readJSON(DEVICES_FILE);
  let actionsTaken = [];
  const mode = hazardType || 'fire';

  if (mode === 'fire' || mode === 'gas_leak') {
    devices.forEach(d => {
      if (d.type === 'lock') { d.status = 'unlocked'; actionsTaken.push(`${d.name} UNLOCKED for evacuation`); }
      if (d.type === 'light') { d.status = 'on'; d.brightness = 100; actionsTaken.push(`${d.name} turned ON 100%`); }
      if (d.type === 'thermostat') { d.status = 'off'; actionsTaken.push(`${d.name} turned OFF to prevent smoke circulation`); }
    });
  } else if (mode === 'intruder') {
    devices.forEach(d => {
      if (d.type === 'lock') { d.status = 'locked'; actionsTaken.push(`${d.name} LOCKED`); }
      if (d.type === 'light' && d.room === 'Outdoor') { d.status = 'on'; d.brightness = 100; actionsTaken.push(`${d.name} turned ON`); }
      if (d.type === 'camera') { d.status = 'recording'; actionsTaken.push(`${d.name} Armed`); }
    });
  }

  writeJSON(DEVICES_FILE, devices);
  addAuditLog(`🚨 CRITICAL EMERGENCY ALARM TRIGGERED: Hazard '${mode.toUpperCase()}'! Emergency protocol executed.`, 'security', user || 'System Alarm');

  res.json({
    success: true,
    hazardType: mode,
    status: 'ACTIVE_EMERGENCY',
    message: `Emergency safety protocol executed for ${mode.toUpperCase()}.`,
    actionsTaken
  });
});

app.post('/api/emergency/reset', (req, res) => {
  addAuditLog(`🟢 Emergency Hazard Alarm RESET by user. System returning to normal state.`, 'security', req.body.user || 'Admin');
  res.json({ success: true, message: 'Emergency alarm state reset successfully.' });
});

// -------------------------------------------------------------
// FEATURE: AI Smart Natural Language & Voice Assistant Engine
// -------------------------------------------------------------
app.post('/api/ai/command', (req, res) => {
  const { command, user } = req.body;
  if (!command) {
    return res.status(400).json({ success: false, error: 'Command prompt is required' });
  }

  const prompt = command.toLowerCase().trim();
  const devices = readJSON(DEVICES_FILE);
  let updatedCount = 0;
  let actionSummary = "";
  let intentName = "GENERAL_COMMAND";

  // Intent 1: Night / Sleep Mode
  if (prompt.includes('night') || prompt.includes('sleep') || prompt.includes('bedtime')) {
    intentName = "NIGHT_MODE_PROTOCOL";
    actionSummary = "Activated Night Protocol: Doors locked, non-essential lights turned off, HVAC set to 22°C.";
    devices.forEach(d => {
      if (d.type === 'light' && d.room !== 'Master Bedroom') { d.status = 'off'; updatedCount++; }
      if (d.type === 'light' && d.room === 'Master Bedroom') { d.status = 'on'; d.brightness = 20; updatedCount++; }
      if (d.type === 'lock') { d.status = 'locked'; updatedCount++; }
      if (d.type === 'thermostat') { d.targetTemp = 22; d.status = 'on'; updatedCount++; }
    });
  }
  // Intent 2: Eco Mode / Energy Saving
  else if (prompt.includes('eco') || prompt.includes('save') || prompt.includes('away') || prompt.includes('vacation')) {
    intentName = "ECO_SAVER_PROTOCOL";
    actionSummary = "Activated Eco Mode: Set thermostats to 26°C eco-point, turned off decorative lighting, verified locks.";
    devices.forEach(d => {
      if (d.type === 'light') { d.status = 'off'; updatedCount++; }
      if (d.type === 'thermostat') { d.targetTemp = 26; updatedCount++; }
      if (d.type === 'lock') { d.status = 'locked'; updatedCount++; }
    });
  }
  // Intent 3: Movie / Entertainment Scene
  else if (prompt.includes('movie') || prompt.includes('cinema') || prompt.includes('film')) {
    intentName = "MOVIE_SCENE_PROTOCOL";
    actionSummary = "Activated Movie Scene: Main lights dimmed to 15%, cyan ambient accent active.";
    devices.forEach(d => {
      if (d.id === 'dev-101') { d.status = 'on'; d.brightness = 15; updatedCount++; }
      if (d.id === 'dev-102') { d.status = 'on'; d.brightness = 80; d.color = '#00f2fe'; updatedCount++; }
    });
  }
  // Intent 4: Lock / Security Arming
  else if (prompt.includes('lock') || prompt.includes('secure') || prompt.includes('arm')) {
    intentName = "SECURITY_LOCKDOWN";
    actionSummary = "Secured all perimeter doors and armed outdoor security cameras.";
    devices.forEach(d => {
      if (d.type === 'lock') { d.status = 'locked'; updatedCount++; }
      if (d.type === 'camera') { d.status = 'recording'; updatedCount++; }
    });
  }
  // Intent 5: Turn off all lights
  else if (prompt.includes('off') && prompt.includes('light')) {
    intentName = "LIGHTING_CONTROL";
    actionSummary = "Turned off all smart lighting fixtures across the property.";
    devices.forEach(d => {
      if (d.type === 'light') { d.status = 'off'; updatedCount++; }
    });
  }
  // Intent 6: Turn on all lights
  else if (prompt.includes('on') && prompt.includes('light')) {
    intentName = "LIGHTING_CONTROL";
    actionSummary = "Illuminated all smart lighting fixtures to 100% brightness.";
    devices.forEach(d => {
      if (d.type === 'light') { d.status = 'on'; d.brightness = 100; updatedCount++; }
    });
  }
  // Intent 7: Temperature extraction
  else if (prompt.includes('temp') || prompt.includes('degree') || prompt.includes('ac') || prompt.includes('cool')) {
    const match = prompt.match(/(\d{2})/);
    const target = match ? parseInt(match[1]) : 23;
    intentName = "HVAC_TEMPERATURE_ADJUSTMENT";
    actionSummary = `Adjusted smart climate thermostat setpoints to ${target}°C.`;
    devices.forEach(d => {
      if (d.type === 'thermostat') { d.targetTemp = target; d.status = 'on'; updatedCount++; }
    });
  }
  // Fallback Intent
  else {
    intentName = "SMART_ASSISTANT_QUERY";
    actionSummary = `AI Assistant interpreted command: "${command}". Standard optimization applied.`;
    devices.forEach(d => {
      if (d.status === 'on') updatedCount++;
    });
  }

  writeJSON(DEVICES_FILE, devices);
  addAuditLog(`🤖 AI Voice Assistant: Processed prompt "${command}" -> ${actionSummary}`, 'system', user || 'Sarah Connor');

  res.json({
    success: true,
    command,
    intent: intentName,
    message: actionSummary,
    updatedCount,
    confidence: 0.98
  });
});

app.get('/api/ai/suggestions', (req, res) => {
  const suggestions = [
    { id: 1, title: 'Night Climate Optimiser', text: 'Set AC to 22°C between 11 PM and 6 AM to save ~12% power.', icon: 'fa-moon' },
    { id: 2, title: 'Solar Peak Generation', text: 'Solar generation at 3.4 kW peak. Ideal time to run high-load appliances.', icon: 'fa-sun' },
    { id: 3, title: 'Security Reminder', text: 'Living Room door was unlocked 4 hours ago. Lock now with 1 click.', icon: 'fa-shield-halved' }
  ];
  res.json({ success: true, data: suggestions });
});





// 3. Users API
app.get('/api/users', (req, res) => {
  const users = readJSON(USERS_FILE);
  res.json({ success: true, data: users });
});

// 4. Logs API
app.get('/api/logs', (req, res) => {
  const logs = readJSON(LOGS_FILE);
  res.json({ success: true, data: logs });
});

app.post('/api/logs', (req, res) => {
  const { message, type, user } = req.body;
  if (!message) return res.status(400).json({ success: false, error: 'Message is required' });
  const log = addAuditLog(message, type, user);
  res.json({ success: true, data: log });
});

// 5. Telemetry Live Feed Simulation
app.get('/api/telemetry/live', (req, res) => {
  const devices = readJSON(DEVICES_FILE);
  
  // Random small environmental noise generator for realistic simulation
  const livingRoomHVAC = devices.find(d => d.id === 'dev-103');
  let simulatedTemp = 24.5;
  let simulatedHumidity = 48;

  if (livingRoomHVAC) {
    const drift = (Math.random() - 0.5) * 0.4;
    livingRoomHVAC.currentTemp = Number((livingRoomHVAC.currentTemp + drift).toFixed(1));
    livingRoomHVAC.humidity = Math.min(65, Math.max(35, Math.round(livingRoomHVAC.humidity + (Math.random() - 0.5) * 2)));
    simulatedTemp = livingRoomHVAC.currentTemp;
    simulatedHumidity = livingRoomHVAC.humidity;
  }

  // Calculate live power draw across all active devices
  const activePowerWatts = devices.reduce((total, d) => {
    return total + (d.status === 'on' || d.status === 'locked' || d.status === 'recording' ? (d.powerDrawWatts || 0) : 0);
  }, 0);

  const activeCount = devices.filter(d => d.status === 'on' || d.status === 'locked' || d.status === 'recording').length;

  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      ambientTemp: simulatedTemp,
      ambientHumidity: simulatedHumidity,
      totalActiveDevices: activeCount,
      totalDevices: devices.length,
      currentPowerKw: Number((activePowerWatts / 1000).toFixed(2)),
      dailyKWh: Number((14.8 + (Math.random() * 0.05)).toFixed(2))
    }
  });
});

// 6. Energy Analytics API (for Chart.js)
app.get('/api/energy-analytics', (req, res) => {
  const hourlyData = [
    { hour: '00:00', kWh: 0.42 },
    { hour: '03:00', kWh: 0.38 },
    { hour: '06:00', kWh: 0.65 },
    { hour: '09:00', kWh: 1.20 },
    { hour: '12:00', kWh: 1.85 },
    { hour: '15:00', kWh: 1.45 },
    { hour: '18:00', kWh: 2.10 },
    { hour: '21:00', kWh: 1.75 }
  ];

  const roomDistribution = [
    { room: 'Living Room', percentage: 42, watts: 1220 },
    { room: 'Kitchen', percentage: 25, watts: 165 },
    { room: 'Master Bedroom', percentage: 18, watts: 0 },
    { room: 'Garage & Outdoor', percentage: 15, watts: 7 }
  ];

  res.json({
    success: true,
    hourlyData,
    roomDistribution
  });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 HomePulse Smart Home Automation Server Running!`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`📚 API Endpoint: http://localhost:${PORT}/api/devices`);
    console.log(`=======================================================`);
  });
}

module.exports = app;

