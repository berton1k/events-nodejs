const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const {
    getNicknameHistory,
    getAvatarHistory,
    getVoiceMovementLogs,
    getRoleChangeLogs,
    getInviteLinkCreationLogs,
    getInviteLinkUsageLogs,
    getVoiceControlLogs,
    getMessageEditLogs,
    getMessageDeleteLogs
} = require('../../utilities/data/logging');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('View various server logs')
        .addSubcommand(subcommand =>
            subcommand
                .setName('nickname')
                .setDescription('View nickname history for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check nickname history for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('avatar')
                .setDescription('View avatar history for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check avatar history for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('voice')
                .setDescription('View voice channel movement logs')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check voice logs for')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of logs to show (max 100)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('roles')
                .setDescription('View role change logs')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check role logs for')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of logs to show (max 100)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('invites')
                .setDescription('View invite link logs')
                .addUserOption(option =>
                    option.setName('creator')
                        .setDescription('User who created the invites')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of logs to show (max 100)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('voice-control')
                .setDescription('View voice control logs (microphone/sound)')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check voice control logs for')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of logs to show (max 100)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('message-edit')
                .setDescription('View message edit logs')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check message edit logs for')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of logs to show (max 100)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('message-delete')
                .setDescription('View message delete logs')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check message delete logs for')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of logs to show (max 100)')
                        .setRequired(false))),
    
    admin: true,
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const limit = Math.min(interaction.options.getInteger('limit') || 25, 100);
        
        try {
            switch (subcommand) {
                case 'nickname':
                    await handleNicknameLogs(interaction, limit);
                    break;
                case 'avatar':
                    await handleAvatarLogs(interaction, limit);
                    break;
                case 'voice':
                    await handleVoiceLogs(interaction, limit);
                    break;
                case 'roles':
                    await handleRoleLogs(interaction, limit);
                    break;
                case 'invites':
                    await handleInviteLogs(interaction, limit);
                    break;
                case 'voice-control':
                    await handleVoiceControlLogs(interaction, limit);
                    break;
                case 'message-edit':
                    await handleMessageEditLogs(interaction, limit);
                    break;
                case 'message-delete':
                    await handleMessageDeleteLogs(interaction, limit);
                    break;
            }
        } catch (error) {
            console.error('Error executing logs command:', error);
            await interaction.reply({
                content: '❌ An error occurred while fetching logs',
                ephemeral: true
            });
        }
    }
};

async function handleNicknameLogs(interaction, limit) {
    const user = interaction.options.getUser('user');
    const nicknameHistory = await getNicknameHistory(user.id, limit);
    
    if (nicknameHistory.length === 0) {
        await interaction.reply({
            content: `No nickname history found for ${user.username}`,
            ephemeral: true
        });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setTitle(`Nickname History for ${user.username}`)
        .setColor('#0099ff')
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();
    
    nicknameHistory.forEach((entry, index) => {
        const oldNick = entry.old_nickname || 'None';
        const newNick = entry.new_nickname || 'None';
        const changedBy = entry.changed_by ? `<@${entry.changed_by}>` : 'Self';
        const timestamp = new Date(entry.timestamp).toLocaleString();
        
        embed.addFields({
            name: `Change ${index + 1}`,
            value: `**From:** ${oldNick}\n**To:** ${newNick}\n**Changed by:** ${changedBy}\n**Date:** ${timestamp}`,
            inline: false
        });
    });
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAvatarLogs(interaction, limit) {
    const user = interaction.options.getUser('user');
    const avatarHistory = await getAvatarHistory(user.id, limit);
    
    if (avatarHistory.length === 0) {
        await interaction.reply({
            content: `No avatar history found for ${user.username}`,
            ephemeral: true
        });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setTitle(`Avatar History for ${user.username}`)
        .setColor('#0099ff')
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();
    
    avatarHistory.forEach((entry, index) => {
        const oldAvatar = entry.old_avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${entry.old_avatar}.png` : 'None';
        const newAvatar = entry.new_avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${entry.new_avatar}.png` : 'None';
        const timestamp = new Date(entry.timestamp).toLocaleString();
        
        embed.addFields({
            name: `Change ${index + 1}`,
            value: `**Old Avatar:** ${oldAvatar === 'None' ? 'None' : '[View](oldAvatar)'}\n**New Avatar:** ${newAvatar === 'None' ? 'None' : '[View](newAvatar)'}\n**Date:** ${timestamp}`,
            inline: false
        });
    });
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleVoiceLogs(interaction, limit) {
    const user = interaction.options.getUser('user');
    const voiceLogs = user ? await getVoiceMovementLogs(user.id, limit) : await getVoiceMovementLogs(null, limit);
    
    if (voiceLogs.length === 0) {
        const message = user ? `No voice movement logs found for ${user.username}` : 'No voice movement logs found';
        await interaction.reply({
            content: message,
            ephemeral: true
        });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setTitle('Voice Channel Movement Logs')
        .setColor('#00ff00')
        .setTimestamp();
    
    if (user) {
        embed.setThumbnail(user.displayAvatarURL());
        embed.setDescription(`Voice movement logs for ${user.username}`);
    }
    
    voiceLogs.forEach((entry, index) => {
        const oldChannel = entry.old_channel_name || 'None';
        const newChannel = entry.new_channel_name || 'None';
        const movedBy = entry.moved_by_username ? entry.moved_by_username : 'Self';
        const timestamp = new Date(entry.timestamp).toLocaleString();
        
        embed.addFields({
            name: `Movement ${index + 1}`,
            value: `**User:** ${entry.username}\n**From:** ${oldChannel}\n**To:** ${newChannel}\n**Moved by:** ${movedBy}\n**Date:** ${timestamp}`,
            inline: false
        });
    });
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleRoleLogs(interaction, limit) {
    const user = interaction.options.getUser('user');
    const roleLogs = user ? await getRoleChangeLogs(user.id, limit) : await getRoleChangeLogs(null, limit);
    
    if (roleLogs.length === 0) {
        const message = user ? `No role change logs found for ${user.username}` : 'No role change logs found';
        await interaction.reply({
            content: message,
            ephemeral: true
        });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setTitle('Role Change Logs')
        .setColor('#ff9900')
        .setTimestamp();
    
    if (user) {
        embed.setThumbnail(user.displayAvatarURL());
        embed.setDescription(`Role change logs for ${user.username}`);
    }
    
    roleLogs.forEach((entry, index) => {
        const action = entry.action === 'ADDED' ? '➕ Added' : '➖ Removed';
        const changedBy = entry.changed_by_username;
        const reason = entry.reason || 'No reason provided';
        const timestamp = new Date(entry.timestamp).toLocaleString();
        
        embed.addFields({
            name: `${action} ${entry.role_name}`,
            value: `**User:** ${entry.username}\n**Changed by:** ${changedBy}\n**Reason:** ${reason}\n**Date:** ${timestamp}`,
            inline: false
        });
    });
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleInviteLogs(interaction, limit) {
    const creator = interaction.options.getUser('creator');
    const inviteLogs = creator ? await getInviteLinkCreationLogs(creator.id, limit) : await getInviteLinkCreationLogs(null, limit);
    
    if (inviteLogs.length === 0) {
        const message = creator ? `No invite link logs found for ${creator.username}` : 'No invite link logs found';
        await interaction.reply({
            content: message,
            ephemeral: true
        });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setTitle('Invite Link Creation Logs')
        .setColor('#ff00ff')
        .setTimestamp();
    
    if (creator) {
        embed.setThumbnail(creator.displayAvatarURL());
        embed.setDescription(`Invite link creation logs for ${creator.username}`);
    }
    
    inviteLogs.forEach((entry, index) => {
        const maxUses = entry.max_uses || 'Unlimited';
        const maxAge = entry.max_age ? `${entry.max_age} seconds` : 'Never expires';
        const temporary = entry.temporary ? 'Yes' : 'No';
        const timestamp = new Date(entry.created_at).toLocaleString();
        
        embed.addFields({
            name: `Invite ${entry.invite_code}`,
            value: `**Created by:** ${entry.created_by_username}\n**Channel:** ${entry.channel_name}\n**Max uses:** ${maxUses}\n**Max age:** ${maxAge}\n**Temporary:** ${temporary}\n**Created:** ${timestamp}`,
            inline: false
        });
    });
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleVoiceControlLogs(interaction, limit) {
    const user = interaction.options.getUser('user');
    const voiceControlLogs = user ? await getVoiceControlLogs(user.id, limit) : await getVoiceControlLogs(null, limit);
    
    if (voiceControlLogs.length === 0) {
        const message = user ? `No voice control logs found for ${user.username}` : 'No voice control logs found';
        await interaction.reply({
            content: message,
            ephemeral: true
        });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setTitle('Voice Control Logs')
        .setColor('#00ccff')
        .setTimestamp();
    
    if (user) {
        embed.setThumbnail(user.displayAvatarURL());
        embed.setDescription(`Voice control logs for ${user.username}`);
    }
    
    voiceControlLogs.forEach((entry, index) => {
        let actionEmoji = '⚙️';
        
        // Определяем эмодзи в зависимости от типа действия
        switch (entry.action_type) {
            case 'микрофон_включен':
                actionEmoji = '🟢';
                break;
            case 'микрофон_выключен':
                actionEmoji = '🔴';
                break;
            case 'звук_включен':
                actionEmoji = '🟢';
                break;
            case 'звук_выключен':
                actionEmoji = '🔴';
                break;
            case 'микрофон_заглушен':
                actionEmoji = '🟠';
                break;
            case 'микрофон_разглушен':
                actionEmoji = '🟢';
                break;
            case 'звук_заглушен':
                actionEmoji = '🟠';
                break;
            case 'звук_разглушен':
                actionEmoji = '🟢';
                break;
        }
        
        const controlledBy = entry.controlled_by_username ? entry.controlled_by_username : 'Self';
        const timestamp = new Date(entry.timestamp).toLocaleString();
        
        embed.addFields({
            name: `${actionEmoji} ${entry.action_target}`,
            value: `**User:** ${entry.username}\n**Action:** ${entry.action_target}\n**Controlled by:** ${controlledBy}\n**Date:** ${timestamp}`,
            inline: false
        });
    });
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleMessageEditLogs(interaction, limit) {
    const user = interaction.options.getUser('user');
    const messageEditLogs = user ? await getMessageEditLogs(user.id, limit) : await getMessageEditLogs(null, limit);
    
    if (messageEditLogs.length === 0) {
        const message = user ? `No message edit logs found for ${user.username}` : 'No message edit logs found';
        await interaction.reply({
            content: message,
            ephemeral: true
        });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setTitle('Message Edit Logs')
        .setColor('#0099ff')
        .setTimestamp();
    
    if (user) {
        embed.setThumbnail(user.displayAvatarURL());
        embed.setDescription(`Message edit logs for ${user.username}`);
    }
    
    messageEditLogs.forEach((entry, index) => {
        const oldContent = entry.old_content.length > 100 ? entry.old_content.substring(0, 97) + '...' : entry.old_content;
        const newContent = entry.new_content.length > 100 ? entry.new_content.substring(0, 97) + '...' : entry.new_content;
        const timestamp = new Date(entry.timestamp).toLocaleString();
        
        embed.addFields({
            name: `Edit ${index + 1} in #${entry.channel_name}`,
            value: `**User:** ${entry.username}\n**Old Content:** ${oldContent}\n**New Content:** ${newContent}\n**Date:** ${timestamp}`,
            inline: false
        });
    });
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleMessageDeleteLogs(interaction, limit) {
    const user = interaction.options.getUser('user');
    const messageDeleteLogs = user ? await getMessageDeleteLogs(user.id, limit) : await getMessageDeleteLogs(null, limit);
    
    if (messageDeleteLogs.length === 0) {
        const message = user ? `No message delete logs found for ${user.username}` : 'No message delete logs found';
        await interaction.reply({
            content: message,
            ephemeral: true
        });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setTitle('Message Delete Logs')
        .setColor('#ff0000')
        .setTimestamp();
    
    if (user) {
        embed.setThumbnail(user.displayAvatarURL());
        embed.setDescription(`Message delete logs for ${user.username}`);
    }
    
    messageDeleteLogs.forEach((entry, index) => {
        const content = entry.content.length > 100 ? entry.content.substring(0, 97) + '...' : entry.content;
        const deletedBy = entry.deleted_by_username ? entry.deleted_by_username : 'Unknown';
        const timestamp = new Date(entry.timestamp).toLocaleString();
        
        let fieldValue = `**User:** ${entry.username}\n**Content:** ${content}\n**Deleted by:** ${deletedBy}\n**Date:** ${timestamp}`;
        
        // Добавляем информацию о медиафайлах
        if (entry.has_attachments && entry.attachment_info) {
            try {
                const attachments = JSON.parse(entry.attachment_info);
                if (attachments.length > 0) {
                    fieldValue += `\n**📎 Медиафайлы (${attachments.length}):**`;
                    attachments.forEach(att => {
                        const sizeKB = Math.round(att.size / 1024);
                        fieldValue += `\n• ${att.filename} (${sizeKB} KB)`;
                    });
                }
            } catch (error) {
                fieldValue += `\n**📎 Медиафайлы:** Ошибка парсинга данных`;
            }
        }
        
        embed.addFields({
            name: `Delete ${index + 1} in #${entry.channel_name}`,
            value: fieldValue,
            inline: false
        });
    });
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}
