const { EmbedBuilder, AuditLogEvent, ChannelType } = require('discord.js');
const logger = require('./legacyLogger');

const messageCache = new Map();

function getLocalTimestamp() {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date());
}

function formatContentBlock(content) {
  const text = content && content.trim().length ? content : '(без текста)';
  const trimmed = text.length > 900 ? `${text.slice(0, 900)}...` : text;
  return `\`\`\`text\n${trimmed}\n\`\`\``;
}

async function getRecentAuditEntry(guild, type, targetId, windowMs) {
  const logs = await guild.fetchAuditLogs({
    type,
    limit: 5
  }).catch(() => null);

  if (!logs) return null;

  return logs.entries.find(
    entry =>
      entry.target?.id === targetId &&
      Date.now() - entry.createdTimestamp < windowMs
  ) || null;
}

function toInviteMap(invites) {
  return new Map(invites.map(invite => [invite.code, invite]));
}

function applyLogStyle(embed, guild, user) {
  const userName = user?.tag || user?.username || 'Неизвестный пользователь';
  const userAvatar = user?.displayAvatarURL?.({ size: 64 }) || null;

  embed.setAuthor({ name: userName, iconURL: userAvatar || undefined });

  if (userAvatar) {
    embed.setThumbnail(userAvatar);
  }

  const guildName = guild?.name || 'Unknown guild';
  const guildIcon = guild?.iconURL?.({ size: 64 }) || null;
  const footerText = `${guildName} • ${getLocalTimestamp()}`;

  embed.setFooter({ text: footerText, iconURL: guildIcon || undefined });
  return embed;
}

function setupLegacyLogEvents(client) {
  if (client._legacyLogEventsInitialized) return;
  client._legacyLogEventsInitialized = true;

  if (!client.invitesCache) {
    client.invitesCache = new Map();
  }

  client.on('ready', async () => {
    for (const [, guild] of client.guilds.cache) {
      try {
        const invites = await guild.invites.fetch();
        client.invitesCache.set(guild.id, toInviteMap(invites));
      } catch {
        // Ignore guilds where bot cannot fetch invites.
      }
    }
  });

  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    if (!addedRoles.size && !removedRoles.size) return;

    const executor = await logger.getExecutor(
      newMember.guild,
      AuditLogEvent.MemberRoleUpdate,
      newMember.id
    );

    const embed = applyLogStyle(
      new EmbedBuilder(),
      newMember.guild,
      newMember.user
    )
      .setTitle('Изменение ролей')
      .setColor('#5865F2')
      .addFields(
        { name: 'Пользователь', value: await logger.formatUser(client, newMember.id) },
        {
          name: 'Изменил',
          value: executor
            ? `<@${executor.id}> (${executor.id} | ${executor.tag})`
            : 'Самостоятельно'
        }
      )

    if (addedRoles.size) {
      embed.addFields({
        name: 'Добавлены роли',
        value: addedRoles
          .map(r => `<@&${r.id}> | ${r.name}`)
          .join('\n')
      });
    }

    if (removedRoles.size) {
      embed.addFields({
        name: 'Убраны роли',
        value: removedRoles
          .map(r => `<@&${r.id}> | ${r.name}`)
          .join('\n')
      });
    }

    await logger.logDiscordGuild(
      client,
      newMember.guild.id,
      'system',
      embed
    );
  });

  client.on('messageCreate', (message) => {
    if (!message.guild || message.author.bot) return;
    if (!message.attachments.size) return;

    messageCache.set(message.id, {
      content: message.content || '(без текста)',
      attachments: [...message.attachments.values()]
    });

    setTimeout(() => messageCache.delete(message.id), 10 * 60 * 1000);
  });

  client.on('messageDelete', async (message) => {
    if (!message.guild || !message.author) return;

    await new Promise(r => setTimeout(r, 1000));

    let executorText = 'Самостоятельно';

    const logs = await message.guild.fetchAuditLogs({
      type: AuditLogEvent.MessageDelete,
      limit: 5
    }).catch(() => null);

    const entry = logs?.entries.find(e =>
      e.target?.id === message.author.id &&
      Date.now() - e.createdTimestamp < 5000
    );

    if (entry && entry.executor.id !== message.author.id) {
      executorText = `<@${entry.executor.id}> (${entry.executor.tag})`;
    }

    const cached = messageCache.get(message.id);

    const embed = applyLogStyle(
      new EmbedBuilder(),
      message.guild,
      message.author
    )
      .setTitle('Сообщение удалено')
      .setColor('#E67E22')
      .addFields(
        { name: 'Автор', value: await logger.formatUser(client, message.author.id), inline: true },
        { name: 'Канал', value: message.channel.toString(), inline: true },
        { name: 'Кто удалил', value: executorText },
        { name: 'Содержание', value: formatContentBlock(cached?.content || message.content) }
      )

    await logger.logDiscordGuild(
      client,
      message.guild.id,
      'system',
      embed
    );

    if (cached?.attachments?.length) {
      const channelId = logger.getLogChannel(message.guild.id, 'system');
      const channel = channelId ? client.channels.cache.get(channelId) : null;
      if (channel) {
        await channel.send({
          content: 'Вложения удаленного сообщения:',
          files: cached.attachments
        });
      }
    }
  });

  client.on('messageUpdate', async (oldMsg, newMsg) => {
    if (!oldMsg.guild) return;
    if (oldMsg.content === newMsg.content) return;

    const embed = applyLogStyle(
      new EmbedBuilder(),
      oldMsg.guild,
      oldMsg.author
    )
      .setTitle('Сообщение изменено')
      .setColor('#F1C40F')
      .addFields(
        { name: 'Автор', value: await logger.formatUser(client, oldMsg.author.id), inline: true },
        { name: 'Канал', value: oldMsg.channel.toString(), inline: true },
        { name: 'Старое', value: formatContentBlock(oldMsg.content), inline: true },
        { name: 'Новое', value: formatContentBlock(newMsg.content), inline: true }
      )

    await logger.logDiscordGuild(
      client,
      oldMsg.guild.id,
      'system',
      embed
    );
  });

  client.on('voiceStateUpdate', async (oldState, newState) => {
    const member = newState.member || oldState.member;
    if (!member) return;

    const userText = `<@${member.id}>`;
    const channelId = newState.channelId || oldState.channelId || null;

    if (oldState.serverMute !== newState.serverMute) {
      const entry = await getRecentAuditEntry(
        newState.guild,
        AuditLogEvent.MemberUpdate,
        member.id,
        5000
      );
      const executor = entry
        ? `<@${entry.executor.id}> (${entry.executor.tag})`
        : 'Неизвестно';
      const action = newState.serverMute
        ? '🔇 отключил микрофон пользователю'
        : '🎙️ включил микрофон пользователю';

      const embed = applyLogStyle(
        new EmbedBuilder(),
        newState.guild,
        member.user
      )
        .setDescription(`${executor} ${action} ${userText}`)
        .setColor(newState.serverMute ? '#E74C3C' : '#2ECC71')
        .addFields(
          { name: 'Канал', value: channelId ? `<#${channelId}>` : '—' }
        )

      await logger.logDiscordGuild(
        client,
        newState.guild.id,
        'voice',
        embed
      );
    }

    if (oldState.serverDeaf !== newState.serverDeaf) {
      const entry = await getRecentAuditEntry(
        newState.guild,
        AuditLogEvent.MemberUpdate,
        member.id,
        5000
      );
      const executor = entry
        ? `<@${entry.executor.id}> (${entry.executor.tag})`
        : 'Неизвестно';
      const action = newState.serverDeaf
        ? '🎧 отключил наушники пользователю'
        : '🔈 включил наушники пользователю';

      const embed = applyLogStyle(
        new EmbedBuilder(),
        newState.guild,
        member.user
      )
        .setDescription(`${executor} ${action} ${userText}`)
        .setColor(newState.serverDeaf ? '#E74C3C' : '#2ECC71')
        .addFields(
          { name: 'Канал', value: channelId ? `<#${channelId}>` : '—' }
        )

      await logger.logDiscordGuild(
        client,
        newState.guild.id,
        'voice',
        embed
      );
    }

    if (!oldState.channelId && newState.channelId) {
      const embed = applyLogStyle(
        new EmbedBuilder(),
        newState.guild,
        member.user
      )
        .setTitle('Вход в войс')
        .setColor('#2ECC71')
        .addFields(
          { name: 'Пользователь', value: userText },
          { name: 'Канал', value: `<#${newState.channelId}>` }
        )

      await logger.logDiscordGuild(
        client,
        newState.guild.id,
        'voice',
        embed
      );
    }

    if (oldState.channelId && !newState.channelId) {
      const entry = await getRecentAuditEntry(
        newState.guild,
        AuditLogEvent.MemberDisconnect,
        member.id,
        5000
      );

      if (entry) {
        const embed = applyLogStyle(
          new EmbedBuilder(),
          newState.guild,
          member.user
        )
          .setTitle('Кик из войса')
          .setColor('#E74C3C')
          .addFields(
            { name: 'Пользователь', value: userText },
            { name: 'Кикнул', value: `<@${entry.executor.id}> (${entry.executor.tag})` },
            { name: 'Канал', value: `<#${oldState.channelId}>` }
          )

        await logger.logDiscordGuild(
          client,
          newState.guild.id,
          'voice',
          embed
        );
        return;
      }

      const embed = applyLogStyle(
        new EmbedBuilder(),
        newState.guild,
        member.user
      )
        .setTitle('Выход из войса')
        .setColor('#E74C3C')
        .addFields(
          { name: 'Пользователь', value: userText },
          { name: 'Канал', value: `<#${oldState.channelId}>` }
        )

      await logger.logDiscordGuild(
        client,
        newState.guild.id,
        'voice',
        embed
      );
    }

    if (
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !== newState.channelId
    ) {
      await new Promise(r => setTimeout(r, 1000));

      const entry = await getRecentAuditEntry(
        newState.guild,
        AuditLogEvent.MemberMove,
        member.id,
        5000
      );

      const executor = entry
        ? `<@${entry.executor.id}> (${entry.executor.tag})`
        : 'Самостоятельно';

      const embed = applyLogStyle(
        new EmbedBuilder(),
        newState.guild,
        member.user
      )
        .setTitle('Перемещение в войсе')
        .setColor('#3498DB')
        .addFields(
          { name: 'Пользователь', value: userText },
          { name: 'Переместил', value: executor },
          { name: 'Откуда', value: `<#${oldState.channelId}>` },
          { name: 'Куда', value: `<#${newState.channelId}>` }
        )

      await logger.logDiscordGuild(
        client,
        newState.guild.id,
        'voice',
        embed
      );
    }
  });

  client.on('inviteCreate', async (invite) => {
    const embed = applyLogStyle(
      new EmbedBuilder(),
      invite.guild,
      invite.inviter
    )
      .setTitle('Создан инвайт')
      .setColor('#3498DB')
      .addFields(
        { name: 'Код', value: invite.code },
        {
          name: 'Создал',
          value: invite.inviter
            ? `<@${invite.inviter.id}> (${invite.inviter.tag})`
            : 'Неизвестно'
        }
      )

    await logger.logDiscordGuild(
      invite.client,
      invite.guild.id,
      'links',
      embed
    );

    try {
      const invites = await invite.guild.invites.fetch();
      client.invitesCache.set(invite.guild.id, toInviteMap(invites));
    } catch {
      // Ignore invite cache updates when not available.
    }
  });

  client.on('guildMemberAdd', async (member) => {
    try {
      const guild = member.guild;
      const cachedInvites = client.invitesCache.get(guild.id);
      const freshInvites = await guild.invites.fetch().catch(() => null);

      let usedInvite = null;

      if (cachedInvites && freshInvites) {
        usedInvite = freshInvites.find(inv => {
          const prev = cachedInvites.get(inv.code);
          return prev && prev.uses < inv.uses;
        });
      }

      if (freshInvites) {
        client.invitesCache.set(guild.id, toInviteMap(freshInvites));
      }

    const embed = applyLogStyle(
      new EmbedBuilder(),
      guild,
      member.user
    )
      .setTitle('Участник зашел')
      .setColor('#2ECC71')
        .addFields(
          { name: 'Пользователь', value: `<@${member.id}> (${member.user.tag})` },
          {
            name: 'Инвайт',
            value: usedInvite
              ? `\`${usedInvite.code}\` (${usedInvite.uses} использ.)`
              : 'Неизвестно'
          },
          {
            name: 'Пригласивший',
            value: usedInvite?.inviter
              ? `<@${usedInvite.inviter.id}> (${usedInvite.inviter.tag})`
              : 'Неизвестно'
          }
        )

      await logger.logDiscordGuild(member.client, guild.id, 'join', embed);
    } catch (error) {
      console.error('guildMemberAdd error:', error);
    }
  });

  client.on('channelCreate', async (channel) => {
    await new Promise(r => setTimeout(r, 2000));

    let executor = 'Неизвестно';
    try {
      const logs = await channel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelCreate,
        limit: 5
      });
      const entry = logs?.entries.find(e =>
        e.target?.id === channel.id &&
        Date.now() - e.createdTimestamp < 10000
      );
      if (entry) executor = `<@${entry.executor.id}> (${entry.executor.tag})`;
    } catch (err) {
      console.warn(`channelCreate audit fetch error: ${err.message}`);
    }

    const type = channel.type === ChannelType.GuildCategory ? 'категория' : 'канал';

    const embed = applyLogStyle(
      new EmbedBuilder(),
      channel.guild,
      channel.guild.members.me?.user
    )
      .setTitle(`Создан ${type}`)
      .setColor('#2ECC71')
      .addFields(
        { name: 'Название', value: channel.name || '(неизвестно)' },
        { name: 'Создал', value: executor },
        { name: 'Тип', value: `${channel.type}` }
      )

    await logger.logDiscordGuild(
      channel.client,
      channel.guild.id,
      'channels',
      embed
    );
  });

  client.on('channelDelete', async (channel) => {
    await new Promise(r => setTimeout(r, 2000));

    let executor = 'Неизвестно';
    try {
      const logs = await channel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelDelete,
        limit: 5
      });
      const entry = logs?.entries.find(e =>
        e.target?.id === channel.id &&
        Date.now() - e.createdTimestamp < 10000
      );
      if (entry) executor = `<@${entry.executor.id}> (${entry.executor.tag})`;
    } catch (err) {
      console.warn(`channelDelete audit fetch error: ${err.message}`);
    }

    const type = channel.type === ChannelType.GuildCategory ? 'категория' : 'канал';

    const embed = applyLogStyle(
      new EmbedBuilder(),
      channel.guild,
      channel.guild.members.me?.user
    )
      .setTitle(`Удален ${type}`)
      .setColor('#E74C3C')
      .addFields(
        { name: 'Название', value: channel.name || '(неизвестно)' },
        { name: 'Удалил', value: executor },
        { name: 'Тип', value: `${channel.type}` }
      )

    await logger.logDiscordGuild(
      channel.client,
      channel.guild.id,
      'channels',
      embed
    );
  });

  client.on('channelUpdate', async (oldChannel, newChannel) => {
    if (!newChannel.guild) return;

    await new Promise(r => setTimeout(r, 2500));

    let executor = 'Неизвестно';
    try {
      const logs = await newChannel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelUpdate,
        limit: 5
      });
      const entry = logs?.entries.find(e =>
        (!e.target || e.target.id === newChannel.id) &&
        Date.now() - e.createdTimestamp < 10000
      );
      if (entry) executor = `<@${entry.executor.id}> (${entry.executor.tag})`;
    } catch (err) {
      console.warn(`channelUpdate audit fetch error: ${err.message}`);
    }

    const changes = [];

    if (oldChannel.name !== newChannel.name) {
      changes.push(`Название: ${oldChannel.name} -> ${newChannel.name}`);
    }

    if (oldChannel.parentId !== newChannel.parentId) {
      const from = oldChannel.parentId ? `<#${oldChannel.parentId}>` : '(нет)';
      const to = newChannel.parentId ? `<#${newChannel.parentId}>` : '(нет)';
      changes.push(`Категория: ${from} -> ${to}`);
    }

    if (oldChannel.topic !== newChannel.topic) {
      changes.push('Тема изменена');
    }

    if (oldChannel.nsfw !== newChannel.nsfw) {
      changes.push(`NSFW: ${oldChannel.nsfw} -> ${newChannel.nsfw}`);
    }

    if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
      changes.push(`Медленный режим: ${oldChannel.rateLimitPerUser}s -> ${newChannel.rateLimitPerUser}s`);
    }

    const oldPerms = oldChannel.permissionOverwrites.cache;
    const newPerms = newChannel.permissionOverwrites.cache;
    const permChanges = [];

    for (const [id, newPerm] of newPerms) {
      const oldPerm = oldPerms.get(id);
      const isEveryone = id === newChannel.guild.id;

      if (!oldPerm) {
        const addedPerms = newPerm.allow.toArray();
        if (addedPerms.length) {
          permChanges.push(
            `Добавлены права для ${isEveryone ? '@everyone' : `<@&${id}>`}: ${addedPerms.join(', ')}`
          );
        }
        continue;
      }

      const added = newPerm.allow.toArray().filter(p => !oldPerm.allow.has(p));
      const removed = oldPerm.allow.toArray().filter(p => !newPerm.allow.has(p));

      if (added.length || removed.length) {
        const parts = [];
        if (added.length) parts.push(`+ ${added.join(', ')}`);
        if (removed.length) parts.push(`- ${removed.join(', ')}`);
        permChanges.push(`Права для ${isEveryone ? '@everyone' : `<@&${id}>`}: ${parts.join(' ')}`);
      }
    }

    for (const [id] of oldPerms) {
      if (!newPerms.has(id)) {
        const isEveryone = id === newChannel.guild.id;
        permChanges.push(`Удалены права для ${isEveryone ? '@everyone' : `<@&${id}>`}`);
      }
    }

    if (permChanges.length) changes.push(...permChanges);
    if (!changes.length) return;

    const embed = applyLogStyle(
      new EmbedBuilder(),
      newChannel.guild,
      newChannel.guild.members.me?.user
    )
      .setTitle(newChannel.type === ChannelType.GuildCategory ? 'Категория изменена' : 'Канал изменен')
      .setColor('#F1C40F')
      .addFields(
        {
          name: newChannel.type === ChannelType.GuildCategory ? 'Категория' : 'Канал',
          value: newChannel.type === ChannelType.GuildCategory
            ? `${newChannel.name}`
            : `<#${newChannel.id}> (${newChannel.name})`
        },
        { name: 'Изменил', value: executor },
        { name: 'Изменения', value: changes.join('\n').slice(0, 1024) }
      )

    await logger.logDiscordGuild(
      newChannel.client,
      newChannel.guild.id,
      'channels',
      embed
    );
  });

  client.on('roleCreate', async (role) => {
    await new Promise(r => setTimeout(r, 1500));

    let executor = 'Неизвестно';
    try {
      const logs = await role.guild.fetchAuditLogs({
        type: AuditLogEvent.RoleCreate,
        limit: 5
      });

      const entry = logs.entries.find(e =>
        e.target?.id === role.id &&
        Date.now() - e.createdTimestamp < 10000
      );

      if (entry) {
        executor = `<@${entry.executor.id}> (${entry.executor.tag})`;
      }
    } catch {}

    const embed = applyLogStyle(
      new EmbedBuilder(),
      role.guild,
      role.guild.members.me?.user
    )
      .setTitle('Роль создана')
      .setColor('#2ECC71')
      .addFields(
        { name: 'Роль', value: `<@&${role.id}> (${role.name})` },
        { name: 'Создал', value: executor }
      )

    await logger.logDiscordGuild(
      role.client,
      role.guild.id,
      'system',
      embed
    );
  });

  client.on('roleDelete', async (role) => {
    await new Promise(r => setTimeout(r, 1500));

    let executor = 'Неизвестно';
    try {
      const logs = await role.guild.fetchAuditLogs({
        type: AuditLogEvent.RoleDelete,
        limit: 5
      });

      const entry = logs.entries.find(e =>
        e.target?.id === role.id &&
        Date.now() - e.createdTimestamp < 10000
      );

      if (entry) {
        executor = `<@${entry.executor.id}> (${entry.executor.tag})`;
      }
    } catch {}

    const embed = applyLogStyle(
      new EmbedBuilder(),
      role.guild,
      role.guild.members.me?.user
    )
      .setTitle('Роль удалена')
      .setColor('#E74C3C')
      .addFields(
        { name: 'Роль', value: `${role.name} (${role.id})` },
        { name: 'Удалил', value: executor }
      )

    await logger.logDiscordGuild(
      role.client,
      role.guild.id,
      'system',
      embed
    );
  });

  client.on('roleUpdate', async (oldRole, newRole) => {
    await new Promise(r => setTimeout(r, 1500));

    const changes = [];

    if (oldRole.name !== newRole.name) {
      changes.push(`Название: ${oldRole.name} -> ${newRole.name}`);
    }

    if (oldRole.color !== newRole.color) {
      changes.push('Цвет изменен');
    }

    if (oldRole.hoist !== newRole.hoist) {
      changes.push(`Отображение отдельно: ${oldRole.hoist} -> ${newRole.hoist}`);
    }

    if (oldRole.mentionable !== newRole.mentionable) {
      changes.push(`Упоминаемая: ${oldRole.mentionable} -> ${newRole.mentionable}`);
    }

    const oldPerms = oldRole.permissions.toArray();
    const newPerms = newRole.permissions.toArray();

    const addedPerms = newPerms.filter(p => !oldPerms.includes(p));
    const removedPerms = oldPerms.filter(p => !newPerms.includes(p));

    if (addedPerms.length) {
      changes.push(`Добавлены права: ${addedPerms.join(', ')}`);
    }

    if (removedPerms.length) {
      changes.push(`Удалены права: ${removedPerms.join(', ')}`);
    }

    if (!changes.length) return;

    let executor = 'Неизвестно';
    try {
      const logs = await newRole.guild.fetchAuditLogs({
        type: AuditLogEvent.RoleUpdate,
        limit: 5
      });

      const entry = logs.entries.find(e =>
        e.target?.id === newRole.id &&
        Date.now() - e.createdTimestamp < 10000
      );

      if (entry) {
        executor = `<@${entry.executor.id}> (${entry.executor.tag})`;
      }
    } catch {}

    const embed = applyLogStyle(
      new EmbedBuilder(),
      newRole.guild,
      newRole.guild.members.me?.user
    )
      .setTitle('Роль изменена')
      .setColor('#F1C40F')
      .addFields(
        { name: 'Роль', value: `<@&${newRole.id}> (${newRole.name})` },
        { name: 'Изменил', value: executor },
        { name: 'Изменения', value: changes.join('\n').slice(0, 1024) }
      )

    await logger.logDiscordGuild(
      newRole.client,
      newRole.guild.id,
      'system',
      embed
    );
  });

  client.on('guildBanAdd', async (ban) => {
    const logs = await ban.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanAdd,
      limit: 5
    }).catch(() => null);

    const entry = logs?.entries.find(e =>
      e.target?.id === ban.user.id &&
      Date.now() - e.createdTimestamp < 10000
    );

    const embed = applyLogStyle(
      new EmbedBuilder(),
      ban.guild,
      ban.user
    )
      .setTitle('Бан пользователя')
      .setColor('#E74C3C')
      .addFields(
        { name: 'Пользователь', value: `<@${ban.user.id}> (${ban.user.tag})` },
        {
          name: 'Забанил',
          value: entry
            ? `<@${entry.executor.id}> (${entry.executor.tag})`
            : 'Неизвестно'
        },
        { name: 'Причина', value: entry?.reason || 'Не указана' }
      )

    await logger.logDiscordGuild(
      ban.client,
      ban.guild.id,
      'punish',
      embed
    );
  });

  client.on('guildBanRemove', async (ban) => {
    const logs = await ban.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanRemove,
      limit: 5
    }).catch(() => null);

    const entry = logs?.entries.find(e =>
      e.target?.id === ban.user.id &&
      Date.now() - e.createdTimestamp < 5000
    );

    const embed = applyLogStyle(
      new EmbedBuilder(),
      ban.guild,
      ban.user
    )
      .setTitle('Разбан пользователя')
      .setColor('#2ECC71')
      .addFields(
        { name: 'Пользователь', value: `<@${ban.user.id}> (${ban.user.tag})` },
        {
          name: 'Разбанил',
          value: entry
            ? `<@${entry.executor.id}> (${entry.executor.tag})`
            : 'Неизвестно'
        }
      )

    await logger.logDiscordGuild(
      ban.client,
      ban.guild.id,
      'punish',
      embed
    );
  });

  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (oldMember.communicationDisabledUntil === newMember.communicationDisabledUntil) {
      return;
    }

    const logs = await newMember.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberUpdate,
      limit: 5
    }).catch(() => null);

    const entry = logs?.entries.find(
      e => e.target?.id === newMember.id &&
      Date.now() - e.createdTimestamp < 5000
    );

    const executor = entry
      ? `<@${entry.executor.id}> (${entry.executor.tag})`
      : 'Неизвестно';

    const until = newMember.communicationDisabledUntil;
    const minutes = until
      ? Math.round((new Date(until).getTime() - Date.now()) / 60000)
      : 0;

    const embed = applyLogStyle(
      new EmbedBuilder(),
      newMember.guild,
      newMember.user
    )
      .setTitle(until ? 'Тайм-аут' : 'Снятие тайм-аута')
      .setColor(until ? '#E74C3C' : '#2ECC71')
      .addFields(
        { name: 'Пользователь', value: `<@${newMember.id}>` },
        { name: 'Модератор', value: executor },
        { name: 'Длительность', value: until ? `${minutes} мин` : 'Нет' },
        { name: 'Причина', value: entry?.reason || 'Не указана' }
      )

    await logger.logDiscordGuild(
      newMember.client,
      newMember.guild.id,
      'punish',
      embed
    );
  });

  client.on('guildMemberRemove', async (member) => {
    await new Promise(r => setTimeout(r, 1200));

    const logs = await member.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberKick,
      limit: 5
    }).catch(() => null);

    const entry = logs?.entries.find(e =>
      e.target?.id === member.id &&
      Date.now() - e.createdTimestamp < 5000
    );

    if (!entry) return;

    const embed = applyLogStyle(
      new EmbedBuilder(),
      member.guild,
      member.user
    )
      .setTitle('Кик пользователя')
      .setColor('#E67E22')
      .addFields(
        { name: 'Пользователь', value: `<@${member.id}> (${member.user.tag})` },
        { name: 'Кикнул', value: `<@${entry.executor.id}> (${entry.executor.tag})` },
        { name: 'Причина', value: entry.reason || 'Не указана' }
      )

    await logger.logDiscordGuild(
      member.client,
      member.guild.id,
      'punish',
      embed
    );
  });
}

module.exports = { setupLegacyLogEvents };
