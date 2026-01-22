const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const FILE = path.join(DATA_DIR, 'guildLogs.json');

function load() {
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function getLogChannel(guildId, type) {
  const data = load();
  return data[guildId]?.[type] ?? null;
}

function setLogChannel(guildId, type, channelId) {
  const data = load();

  if (!data[guildId]) {
    data[guildId] = {};
  }

  data[guildId][type] = channelId;
  save(data);
}

module.exports = {
  getLogChannel,
  setLogChannel
};
