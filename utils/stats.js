/** In-memory stats tracker for the dashboard */

const MAX_LOG_ENTRIES = 200;
const MAX_ACTIVITY = 50;

const stats = {
  startTime: Date.now(),
  commandsExecuted: 0,
  commandsByCategory: {},
  commandsByFeature: {},
  commandsByDay: {},        // "YYYY-MM-DD" → count
  totalTokensUsed: 0,
  totalApiCalls: 0,
  tokensByModel: {},        // model → { calls, tokens }
  recentActivity: [],
  errors: 0,
  logBuffer: [],            // [{ ts, level, message }]
  guildJoinCount: 0,
  guildLeaveCount: 0,
  dmReceived: 0,
};

export function trackCommand(category, feature) {
  stats.commandsExecuted++;
  stats.commandsByCategory[category] = (stats.commandsByCategory[category] || 0) + 1;
  stats.commandsByFeature[feature] = (stats.commandsByFeature[feature] || 0) + 1;

  // Daily tracking
  const day = new Date().toISOString().slice(0, 10);
  stats.commandsByDay[day] = (stats.commandsByDay[day] || 0) + 1;

  stats.recentActivity.unshift({
    type: 'command',
    category,
    feature,
    timestamp: Date.now(),
  });
  if (stats.recentActivity.length > MAX_ACTIVITY) stats.recentActivity.pop();
}

export function trackApiCall(tokens, model) {
  stats.totalApiCalls++;
  stats.totalTokensUsed += tokens || 0;
  const m = model || 'default';
  if (!stats.tokensByModel[m]) stats.tokensByModel[m] = { calls: 0, tokens: 0 };
  stats.tokensByModel[m].calls++;
  stats.tokensByModel[m].tokens += tokens || 0;
}

export function trackError(errMsg) {
  stats.errors++;
  addLog('error', errMsg || 'Unknown error');
}

export function trackGuildJoin() {
  stats.guildJoinCount++;
  addLog('info', 'Bot joined a new guild');
}

export function trackGuildLeave() {
  stats.guildLeaveCount++;
  addLog('info', 'Bot left a guild');
}

export function trackDM() {
  stats.dmReceived++;
}

export function addLog(level, message) {
  stats.logBuffer.unshift({
    ts: Date.now(),
    level,
    message: String(message).slice(0, 300),
  });
  if (stats.logBuffer.length > MAX_LOG_ENTRIES) stats.logBuffer.pop();
}

export function getStats() {
  const uptime = Date.now() - stats.startTime;
  return {
    ...stats,
    uptime,
    uptimeFormatted: formatUptime(uptime),
    commandsPerMinute: ((stats.commandsExecuted / (uptime / 60000)) || 0).toFixed(1),
    // Last 7 days of command counts for charting
    dailyCommandSeries: last7Days().map(d => stats.commandsByDay[d] || 0),
    dailyLabels: last7Days().map(d => formatDayLabel(d)),
    // Token breakdown
    modelBreakdown: Object.entries(stats.tokensByModel).map(([name, data]) => ({
      name,
      ...data,
    })),
  };
}

export function resetStats() {
  stats.commandsExecuted = 0;
  stats.commandsByCategory = {};
  stats.commandsByFeature = {};
  stats.commandsByDay = {};
  stats.totalTokensUsed = 0;
  stats.totalApiCalls = 0;
  stats.tokensByModel = {};
  stats.recentActivity = [];
  stats.errors = 0;
  stats.guildJoinCount = 0;
  stats.guildLeaveCount = 0;
  stats.dmReceived = 0;
}

function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function formatDayLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ${m % 60}m ${s % 60}s`;
}
