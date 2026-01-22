// Примеры использования методов логирования модерации
// Этот файл показывает, как использовать новые методы DiscordLogger для логирования действий модерации

const DiscordLogger = require('./discordLogger');

// Примеры использования (замените на реальные вызовы в ваших командах модерации)

/*
// В команде бана:
async function banUser(interaction, userId, reason) {
    try {
        // ... логика бана ...
        
        // Логируем действие
        if (interaction.client.discordLogger) {
            await interaction.client.discordLogger.logUserBan(
                userId,
                interaction.guild.members.cache.get(userId)?.user.username || 'Unknown',
                reason,
                interaction.user.id
            );
        }
        
        await interaction.reply({ content: 'Пользователь забанен', flags: [MessageFlags.Ephemeral] });
    } catch (error) {
        console.error('Error banning user:', error);
    }
}

// В команде разбана:
async function unbanUser(interaction, userId) {
    try {
        // ... логика разбана ...
        
        // Логируем действие
        if (interaction.client.discordLogger) {
            await interaction.client.discordLogger.logUserUnban(
                userId,
                'Username from audit log or cache',
                interaction.user.id
            );
        }
        
        await interaction.reply({ content: 'Пользователь разбанен', flags: [MessageFlags.Ephemeral] });
    } catch (error) {
        console.error('Error unbanning user:', error);
    }
}

// В команде предупреждения:
async function warnUser(interaction, userId, reason) {
    try {
        // ... логика предупреждения ...
        
        // Логируем действие
        if (interaction.client.discordLogger) {
            await interaction.client.discordLogger.logUserWarn(
                userId,
                interaction.guild.members.cache.get(userId)?.user.username || 'Unknown',
                reason,
                interaction.user.id
            );
        }
        
        await interaction.reply({ content: 'Пользователь предупрежден', flags: [MessageFlags.Ephemeral] });
    } catch (error) {
        console.error('Error warning user:', error);
    }
}

// В команде снятия предупреждения:
async function unwarnUser(interaction, userId) {
    try {
        // ... логика снятия предупреждения ...
        
        // Логируем действие
        if (interaction.client.discordLogger) {
            await interaction.client.discordLogger.logUserUnwarn(
                userId,
                interaction.guild.members.cache.get(userId)?.user.username || 'Unknown',
                interaction.user.id
            );
        }
        
        await interaction.reply({ content: 'Предупреждение снято', flags: [MessageFlags.Ephemeral] });
    } catch (error) {
        console.error('Error unwarning user:', error);
    }
}

// В обработчике удаления сообщения модератором:
async function handleModeratorMessageDelete(message, moderator, reason) {
    try {
        // ... логика удаления сообщения ...
        
        // Логируем действие
        if (message.client.discordLogger) {
            await message.client.discordLogger.logMessageDeleteByModerator(
                message.id,
                message.channel.id,
                message.channel.name,
                message.author.id,
                message.author.username,
                message.content,
                moderator.id,
                reason
            );
        }
    } catch (error) {
        console.error('Error logging moderator message delete:', error);
    }
}
*/

module.exports = {
    // Экспортируем примеры для использования в других файлах
    examples: {
        banUser: 'await discordLogger.logUserBan(userId, username, reason, bannedBy)',
        unbanUser: 'await discordLogger.logUserUnban(userId, username, unbannedBy)',
        warnUser: 'await discordLogger.logUserWarn(userId, username, reason, warnedBy)',
        unwarnUser: 'await discordLogger.logUserUnwarn(userId, username, unwarnedBy)',
        deleteMessageByModerator: 'await discordLogger.logMessageDeleteByModerator(messageId, channelId, channelName, userId, username, content, deletedBy, reason)'
    }
};
