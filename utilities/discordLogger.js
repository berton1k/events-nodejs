const { EmbedBuilder } = require('discord.js');
const { getSettings } = require('./data/DataBase');

class DiscordLogger {
    constructor(client) {
        this.client = client;
        this.logChannel = null;
        this.moderationLogChannel = null;
        this.isInitialized = false;
    }

    // Инициализация логгера
    async initialize() {
        try {
            console.log('DiscordLogger: Starting initialization...');
            await this.updateLogChannel();
            this.isInitialized = true;
            console.log('Discord logger initialized successfully');
            console.log('DiscordLogger: Main log channel available:', this.isChannelAvailable());
            console.log('DiscordLogger: Moderation log channel available:', this.moderationLogChannel && this.moderationLogChannel.isTextBased());
        } catch (error) {
            console.error('Error initializing Discord logger:', error);
        }
    }

    // Обновление каналов логов из настроек
    async updateLogChannel() {
        try {
            const settings = await getSettings();
            console.log('DiscordLogger: Got settings:', JSON.stringify(settings?.channels, null, 2));
            
            // Обновляем основной канал логов
            const logChannelId = settings?.channels?.logs;
            if (logChannelId) {
                this.logChannel = this.client.channels.cache.get(logChannelId);
                if (!this.logChannel) {
                    // Попробуем получить канал заново
                    this.logChannel = await this.client.channels.fetch(logChannelId);
                }
                console.log('DiscordLogger: Main log channel set to:', this.logChannel?.name || 'null');
            } else {
                this.logChannel = null;
                console.log('DiscordLogger: No main log channel configured');
            }
            
            // Обновляем канал логов модерации
            const moderationLogChannelId = settings?.channels?.moderationLogs;
            if (moderationLogChannelId) {
                this.moderationLogChannel = this.client.channels.cache.get(moderationLogChannelId);
                if (!this.moderationLogChannel) {
                    // Попробуем получить канал заново
                    this.moderationLogChannel = await this.client.channels.fetch(moderationLogChannelId);
                }
                console.log('DiscordLogger: Moderation log channel set to:', this.moderationLogChannel?.name || 'null');
            } else {
                this.moderationLogChannel = null;
                console.log('DiscordLogger: No moderation log channel configured');
            }
        } catch (error) {
            console.error('Error updating log channels:', error);
            this.logChannel = null;
            this.moderationLogChannel = null;
        }
    }

    // Проверка доступности канала логов
    isChannelAvailable() {
        return this.logChannel && this.logChannel.isTextBased();
    }

    // Отправка лога в Discord канал
    async sendLog(embed) {
        if (!this.isChannelAvailable()) {
            console.log('DiscordLogger: Main log channel not available');
            return false;
        }

        try {
            console.log('DiscordLogger: Sending log to main channel:', this.logChannel.name);
            await this.logChannel.send({ embeds: [embed] });
            console.log('DiscordLogger: Log sent successfully to main channel');
            return true;
        } catch (error) {
            console.error('Error sending log to Discord channel:', error);
            return false;
        }
    }

    // Отправка лога с файлами в Discord канал
    async sendLogWithFiles(embed, files) {
        if (!this.isChannelAvailable()) {
            console.log('DiscordLogger: Main log channel not available');
            return false;
        }

        try {
            // Ограничиваем количество файлов до 10 (лимит Discord)
            const limitedFiles = files.slice(0, 10);
            
            console.log(`DiscordLogger: Sending log with ${limitedFiles.length} files to main channel:`, this.logChannel.name);
            await this.logChannel.send({ 
                embeds: [embed],
                files: limitedFiles
            });
            console.log(`DiscordLogger: Log with ${limitedFiles.length} files sent successfully to main channel`);
            return true;
        } catch (error) {
            console.error('DiscordLogger: Error sending log with files to main channel:', error);
            // Если не удалось отправить с файлами, отправляем без них
            try {
                await this.logChannel.send({ embeds: [embed] });
                console.log('DiscordLogger: Log sent without files as fallback');
                return true;
            } catch (fallbackError) {
                console.error('DiscordLogger: Error sending fallback log:', fallbackError);
                return false;
            }
        }
    }

    // Отправка лога модерации в Discord канал
    async sendModerationLog(embed) {
        if (!this.moderationLogChannel || !this.moderationLogChannel.isTextBased()) {
            console.log('DiscordLogger: Moderation log channel not available');
            return false;
        }

        try {
            console.log('DiscordLogger: Sending moderation log to channel:', this.moderationLogChannel.name);
            await this.moderationLogChannel.send({ embeds: [embed] });
            console.log('DiscordLogger: Moderation log sent successfully');
            return true;
        } catch (error) {
            console.error('Error sending moderation log to Discord channel:', error);
            return false;
        }
    }

    // Логирование изменения никнейма
    async logNicknameChange(userId, oldNickname, newNickname, changedBy = null) {
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('🔄 Изменение никнейма')
            .addFields(
                { name: 'Пользователь', value: `<@${userId}>`, inline: true },
                { name: 'Старый ник', value: oldNickname || 'Не установлен', inline: true },
                { name: 'Новый ник', value: newNickname || 'Не установлен', inline: true }
            )
            .setTimestamp();

        if (changedBy) {
            embed.addFields({ name: 'Изменен кем', value: `<@${changedBy}>`, inline: true });
        }

        return await this.sendLog(embed);
    }

    // Логирование изменения аватара
    async logAvatarChange(userId, oldAvatar, newAvatar) {
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('🖼️ Изменение аватара')
            .addFields(
                { name: 'Пользователь', value: `<@${userId}>`, inline: true },
                { name: 'Старый аватар', value: oldAvatar ? 'Был установлен' : 'Не установлен', inline: true },
                { name: 'Новый аватар', value: newAvatar ? 'Установлен' : 'Не установлен', inline: true }
            )
            .setTimestamp();

        if (newAvatar) {
            embed.setThumbnail(`https://cdn.discordapp.com/avatars/${userId}/${newAvatar}.png`);
        }

        return await this.sendLog(embed);
    }

    // Логирование перемещения в голосовой канал
    async logVoiceMovement(userId, username, oldChannelId, newChannelId, oldChannelName, newChannelName, movedBy = null) {
        const embed = new EmbedBuilder()
            .setColor(0xff6600)
            .setTitle('🎤 Перемещение в голосовой канал')
            .addFields(
                { name: 'Пользователь', value: `<@${userId}>`, inline: true },
                { name: 'Из канала', value: oldChannelId ? `<#${oldChannelId}>` : 'Не подключен', inline: true },
                { name: 'В канал', value: newChannelId ? `<#${newChannelId}>` : 'Отключился', inline: true }
            )
            .setTimestamp();

        // Добавляем поле "Перемещен кем" только если известно
        if (movedBy && movedBy !== 'Unknown') {
            embed.addFields({ name: 'Перемещен кем', value: `<@${movedBy}>`, inline: true });
        } else {
            embed.addFields({ name: 'Перемещен кем', value: 'Сам', inline: true });
        }

        return await this.sendLog(embed);
    }

    // Логирование изменения роли
    async logRoleChange(userId, username, roleId, roleName, action, changedBy, reason = null) {
        const color = action === 'добавлена' ? 0x00ff00 : 0xff0000;
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`🎭 Роль ${action}`)
            .addFields(
                { name: 'Пользователь', value: `<@${userId}>`, inline: true },
                { name: 'Роль', value: roleId ? `<@&${roleId}>` : roleName, inline: true },
                { name: 'Действие', value: action === 'добавлена' ? '➕ Добавлена' : '➖ Удалена', inline: true }
            )
            .setTimestamp();

        // Добавляем поле "Изменена кем" только если известно
        if (changedBy && changedBy !== 'Unknown') {
            embed.addFields({ name: 'Изменена кем', value: `<@${changedBy}>`, inline: true });
        } else {
            embed.addFields({ name: 'Изменена кем', value: 'Сам', inline: true });
        }

        if (reason) {
            embed.addFields({ name: 'Причина', value: reason, inline: false });
        }

        return await this.sendLog(embed);
    }

    // Логирование создания ссылки приглашения
    async logInviteLinkCreation(inviteCode, createdBy, channelId, channelName, maxUses, maxAge, temporary) {
        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle('🔗 Создана ссылка приглашения')
            .addFields(
                { name: 'Код', value: inviteCode, inline: true },
                { name: 'Создана кем', value: `<@${createdBy}>`, inline: true },
                { name: 'Канал', value: channelId ? `<#${channelId}>` : channelName, inline: true }
            )
            .setTimestamp();

        if (maxUses) {
            embed.addFields({ name: 'Макс. использований', value: maxUses.toString(), inline: true });
        }
        if (maxAge) {
            embed.addFields({ name: 'Время жизни', value: `${Math.floor(maxAge / 3600)}ч`, inline: true });
        }
        if (temporary) {
            embed.addFields({ name: 'Временная', value: 'Да', inline: true });
        }

        return await this.sendLog(embed);
    }

    // Логирование использования ссылки приглашения
    async logInviteLinkUsage(inviteCode, userId, username) {
        const embed = new EmbedBuilder()
            .setColor(0x00cc00)
            .setTitle('✅ Присоединение по приглашению')
            .addFields(
                { name: 'Код приглашения', value: inviteCode, inline: true },
                { name: 'Пользователь', value: `<@${userId}>`, inline: true },
                { name: 'Имя пользователя', value: username, inline: true }
            )
            .setTimestamp();

        return await this.sendLog(embed);
    }

    // Логирование управления микрофоном и звуком
    async logVoiceControl(userId, username, actionType, actionTarget, controlledBy = null) {
         let color, title, emoji;
         
         // Определяем цвет и эмодзи в зависимости от типа действия
         switch (actionType) {
             case 'микрофон_включен':
                 color = 0x00ff00;
                 title = '🎤 Микрофон включен';
                 emoji = '🟢';
                 break;
             case 'микрофон_выключен':
                 color = 0xff0000;
                 title = '🎤 Микрофон выключен';
                 emoji = '🔴';
                 break;
             case 'звук_включен':
                 color = 0x00ff00;
                 title = '🔊 Звук включен';
                 emoji = '🟢';
                 break;
             case 'звук_выключен':
                 color = 0xff0000;
                 title = '🔊 Звук выключен';
                 emoji = '🔴';
                 break;
             case 'микрофон_заглушен':
                 color = 0xff6600;
                 title = '🎤 Микрофон заглушен';
                 emoji = '🟠';
                 break;
             case 'микрофон_разглушен':
                 color = 0x00cc00;
                 title = '🎤 Микрофон разглушен';
                 emoji = '🟢';
                 break;
             case 'звук_заглушен':
                 color = 0xff6600;
                 title = '🔊 Звук заглушен';
                 emoji = '🟠';
                 break;
             case 'звук_разглушен':
                 color = 0x00cc00;
                 title = '🔊 Звук разглушен';
                 emoji = '🟢';
                 break;
             default:
                 color = 0x999999;
                 title = '🎵 Управление голосом';
                 emoji = '⚙️';
         }
         
         const embed = new EmbedBuilder()
             .setColor(color)
             .setTitle(title)
             .addFields(
                 { name: 'Пользователь', value: `<@${userId}>`, inline: true },
                 { name: 'Действие', value: `${emoji} ${actionTarget}`, inline: true }
             )
             .setTimestamp();

         // Добавляем поле "Управлено кем" только если известно
         if (controlledBy && controlledBy !== 'Unknown') {
             embed.addFields({ name: 'Модератор', value: `<@${controlledBy}>`, inline: true });
         } else {
             embed.addFields({ name: 'Модератор', value: 'Сам', inline: true });
         }
 
         return await this.sendLog(embed);
     }

         // Логирование редактирования сообщения
     async logMessageEdit(messageId, channelId, channelName, userId, username, oldContent, newContent) {
         const embed = new EmbedBuilder()
             .setColor(0x0099ff)
             .setTitle('✏️ Сообщение отредактировано')
             .addFields(
                 { name: 'Пользователь', value: `<@${userId}>`, inline: true },
                 { name: 'Канал', value: `<#${channelId}>`, inline: true },
                 { name: 'ID сообщения', value: messageId, inline: true },
                 { name: 'Старое содержимое', value: oldContent.length > 1024 ? oldContent.substring(0, 1021) + '...' : oldContent, inline: false },
                 { name: 'Новое содержимое', value: newContent.length > 1024 ? newContent.substring(0, 1021) + '...' : newContent, inline: false }
             )
             .setTimestamp();
         
         return await this.sendLog(embed);
     }
 
     // Логирование удаления сообщения
     async logMessageDelete(messageId, channelId, channelName, userId, username, content, deletedBy = null, deletedByUsername = null, attachments = null) {
         const embed = new EmbedBuilder()
             .setColor(0xff0000)
             .setTitle('🗑️ Сообщение удалено')
             .addFields(
                 { name: 'Пользователь', value: `<@${userId}>`, inline: true },
                 { name: 'Канал', value: `<#${channelId}>`, inline: true },
                 { name: 'ID сообщения', value: messageId, inline: true }
             )
             .setTimestamp();
         
         // Добавляем содержимое удаленного сообщения
         if (content) {
             embed.addFields({ 
                 name: 'Содержимое', 
                 value: content.length > 1024 ? content.substring(0, 1021) + '...' : content, 
                 inline: false 
             });
         }
         
         // Добавляем информацию о медиафайлах
         if (attachments && attachments.length > 0) {
             let attachmentInfo = `📎 **Медиафайлы (${attachments.length}):**\n`;
             
             for (const attachment of attachments) {
                 const sizeKB = Math.round(attachment.size / 1024);
                 attachmentInfo += `• **${attachment.name}** (${sizeKB} KB)\n`;
             }
             
             embed.addFields({ 
                 name: 'Медиафайлы', 
                 value: attachmentInfo.length > 1024 ? attachmentInfo.substring(0, 1021) + '...' : attachmentInfo, 
                 inline: false 
             });
         }
         
         // Добавляем информацию о том, кто удалил
         if (deletedBy && deletedByUsername) {
             embed.addFields({ name: 'Удалено кем', value: `<@${deletedBy}>`, inline: true });
         } else {
             // Если не указано, кто удалил, значит сообщение удалил автор
             embed.addFields({ name: 'Удалено кем', value: '👤 Автор сообщения', inline: true });
         }
         
         // Подготавливаем файлы для отправки
         const files = [];
         if (attachments && attachments.length > 0) {
             for (const attachment of attachments) {
                 // Проверяем, является ли файл изображением или гифкой
                 if (attachment.contentType && (
                     attachment.contentType.startsWith('image/') || 
                     attachment.contentType === 'image/gif' ||
                     attachment.name.toLowerCase().endsWith('.gif')
                 )) {
                     try {
                         // Скачиваем файл для отправки
                         const response = await fetch(attachment.url);
                         if (response.ok) {
                             const buffer = await response.arrayBuffer();
                             files.push({
                                 attachment: Buffer.from(buffer),
                                 name: attachment.name
                             });
                         }
                     } catch (error) {
                         console.error(`Error downloading attachment ${attachment.name}:`, error);
                     }
                 }
             }
         }
         
         // Отправляем лог с файлами, если они есть
         if (files.length > 0) {
             return await this.sendLogWithFiles(embed, files);
         } else {
             return await this.sendLog(embed);
         }
     }
 
         // Принудительное обновление канала логов
    async refreshLogChannel() {
        console.log('DiscordLogger: Refreshing log channels...');
        await this.updateLogChannel();
        console.log('DiscordLogger: Log channels refreshed');
    }

    // Логирование бана пользователя
    async logUserBan(userId, username, reason, bannedBy) {
        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🚫 Пользователь забанен')
            .addFields(
                { name: 'Пользователь', value: `<@${userId}>`, inline: true },
                { name: 'Имя пользователя', value: username, inline: true },
                { name: 'Забанен кем', value: `<@${bannedBy}>`, inline: true },
                { name: 'Причина', value: reason || 'Не указана', inline: false }
            )
            .setTimestamp();

        return await this.sendModerationLog(embed);
    }

    // Логирование разбана пользователя
    async logUserUnban(userId, username, unbannedBy) {
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Пользователь разбанен')
            .addFields(
                { name: 'Пользователь', value: `<@${userId}>`, inline: true },
                { name: 'Имя пользователя', value: username, inline: true },
                { name: 'Разбанен кем', value: `<@${unbannedBy}>`, inline: true }
            )
            .setTimestamp();

        return await this.sendModerationLog(embed);
    }

    // Логирование предупреждения пользователя
    async logUserWarn(userId, username, reason, warnedBy) {
        const embed = new EmbedBuilder()
            .setColor(0xffff00)
            .setTitle('⚠️ Пользователь предупрежден')
            .addFields(
                { name: 'Пользователь', value: `<@${userId}>`, inline: true },
                { name: 'Имя пользователя', value: username, inline: true },
                { name: 'Предупрежден кем', value: `<@${warnedBy}>`, inline: true },
                { name: 'Причина', value: reason || 'Не указана', inline: false }
            )
            .setTimestamp();

        return await this.sendModerationLog(embed);
    }

    // Логирование снятия предупреждения
    async logUserUnwarn(userId, username, unwarnedBy) {
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Предупреждение снято')
            .addFields(
                { name: 'Пользователь', value: `<@${userId}>`, inline: true },
                { name: 'Имя пользователя', value: username, inline: true },
                { name: 'Снято кем', value: `<@${unwarnedBy}>`, inline: true }
            )
            .setTimestamp();

        return await this.sendModerationLog(embed);
    }

    // Логирование удаления сообщения модератором
    async logMessageDeleteByModerator(messageId, channelId, channelName, userId, username, content, deletedBy, reason = null) {
        const embed = new EmbedBuilder()
            .setColor(0xff6600)
            .setTitle('🗑️ Сообщение удалено модератором')
            .addFields(
                { name: 'Пользователь', value: `<@${userId}>`, inline: true },
                { name: 'Канал', value: `<#${channelId}>`, inline: true },
                { name: 'ID сообщения', value: messageId, inline: true },
                { name: 'Удалено кем', value: `<@${deletedBy}>`, inline: true }
            )
            .setTimestamp();
        
        if (content) {
            embed.addFields({ 
                name: 'Содержимое', 
                value: content.length > 1024 ? content.substring(0, 1021) + '...' : content, 
                inline: false 
            });
        }
        
        if (reason) {
            embed.addFields({ name: 'Причина', value: reason, inline: false });
        }
        
        return await this.sendModerationLog(embed);
    }
}

module.exports = DiscordLogger;
