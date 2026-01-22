const { setLogChannel, getLogChannel } = require('./guildLogs');

const COMMAND_TYPES = {
  'set-logs': 'system',
  'set-logs-channels': 'channels',
  'set-logs-links': 'links',
  'set-logs-join': 'join',
  'set-logs-punish': 'punish',
  'set-logs-voice': 'voice'
};

const handledMessages = new Set();

function setupLegacyLogCommands(client) {
  if (client._legacyLogCommandsInitialized) return;
  client._legacyLogCommandsInitialized = true;

  client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith('^')) return;
    if (handledMessages.has(message.id)) return;
    handledMessages.add(message.id);
    setTimeout(() => handledMessages.delete(message.id), 60 * 1000);

    const [rawCommand, ...args] = message.content.slice(1).trim().split(/\s+/);
    const logType = COMMAND_TYPES[rawCommand];
    if (!logType) return;

    if (!message.member?.permissions?.has('Administrator')) {
      return message.reply('❌ У вас нет прав.');
    }

    const [guildId, channelId] = args;
    if (!guildId || !channelId) {
      return message.reply(`❌ Использование: ^${rawCommand} <guild_id> <channel_id>`);
    }

    const currentChannelId = getLogChannel(guildId, logType);
    if (currentChannelId === channelId) {
      return;
    }

    setLogChannel(guildId, logType, channelId);
    return message.reply(`✅ Канал логов для "${logType}" настроен.`);
  });
}

module.exports = { setupLegacyLogCommands };
