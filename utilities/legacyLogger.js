const { AuditLogEvent } = require('discord.js');
const { getLogChannel } = require('./guildLogs');

async function formatUser(client, userId) {
  const user =
    client.users.cache.get(userId) ??
    await client.users.fetch(userId).catch(() => null);

  if (!user) return `<@${userId}> (${userId})`;
  return `<@${user.id}> (${user.id} | ${user.tag})`;
}

async function getExecutor(guild, action, targetId) {
  const logs = await guild.fetchAuditLogs({
    type: action,
    limit: 5
  }).catch(() => null);

  if (!logs) return null;

  const entry = logs.entries.find(
    e =>
      e.target?.id === targetId &&
      Date.now() - e.createdTimestamp < 5000
  );

  if (!entry) return null;

  return {
    id: entry.executor.id,
    tag: entry.executor.tag
  };
}

async function logDiscordGuild(client, guildId, type, embed) {
  try {
    const channelId = getLogChannel(guildId, type);

    if (!channelId) {
      console.warn(`[LOGS] No channel for type "${type}" in guild ${guildId}`);
      return;
    }

    const channel = client.channels.cache.get(channelId);
    if (!channel) {
      console.warn(`[LOGS] Channel ${channelId} not found in guild ${guildId}`);
      return;
    }

    await channel.send({ embeds: [embed] });
  } catch (e) {
    console.error('logDiscordGuild error:', e);
  }
}

module.exports = {
  AuditLogEvent,
  formatUser,
  getExecutor,
  logDiscordGuild,
  getLogChannel
};
