const {
    logNicknameChange,
    logAvatarChange,
    logVoiceMovement,
    logRoleChange,
    logInviteLinkCreation,
    logInviteLinkUsage,
    logVoiceControl,
    logMessageEdit,
    logMessageDelete
} = require('./data/logging');

// Импортируем константы для типов аудит-логов
const { AuditLogEvent } = require('discord.js');

// Глобальная переменная для Discord логгера
let discordLogger = null;

// Функция для установки Discord логгера
const setDiscordLogger = (logger) => {
    console.log('loggingEvents: setDiscordLogger called with:', !!logger);
    discordLogger = logger;
    console.log('loggingEvents: Discord logger set successfully');
};

// Обработчик изменения никнейма
const handleNicknameChange = async (oldMember, newMember) => {
    try {
        const oldNickname = oldMember.nickname;
        const newNickname = newMember.nickname;
        
        if (oldNickname !== newNickname) {
            await logNicknameChange(
                newMember.id,
                oldNickname,
                newNickname,
                null // Discord не предоставляет информацию о том, кто изменил ник
            );
        }
    } catch (error) {
        console.error('Error handling nickname change:', error);
    }
};

// Обработчик изменения аватара
const handleAvatarChange = async (oldUser, newUser) => {
    try {
        const oldAvatar = oldUser.avatar;
        const newAvatar = newUser.avatar;
        
        if (oldAvatar !== newAvatar) {
            await logAvatarChange(
                newUser.id,
                oldAvatar,
                newAvatar
            );
        }
    } catch (error) {
        console.error('Error handling avatar change:', error);
    }
};

// Обработчик перемещения в голосовой канал
const handleVoiceStateUpdate = async (oldState, newState) => {
    try {
        const oldChannel = oldState.channel;
        const newChannel = newState.channel;
        
        // Логируем перемещения между каналами
        if (oldChannel !== newChannel) {
            try {
                // Проверяем, было ли это перемещение администратором
                const auditLogs = await newState.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberMove,
                    limit: 1,
                    user: newState.member
                });
                
                let movedBy = null;
                let movedByUsername = null;
                
                if (auditLogs.entries.size > 0) {
                    const moveLog = auditLogs.entries.first();
                    if (moveLog.createdTimestamp > (Date.now() - 5000)) { // Проверяем последние 5 секунд
                        movedBy = moveLog.executor.id;
                        movedByUsername = moveLog.executor.username;
                    }
                }
                
                await logVoiceMovement(
                    newState.member.id,
                    newState.member.user.username,
                    oldChannel ? oldChannel.id : null,
                    newChannel ? newChannel.id : null,
                    oldChannel ? oldChannel.name : null,
                    newChannel ? newChannel.name : null,
                    movedBy,
                    movedByUsername
                );
            } catch (auditError) {
                // Если не удалось получить аудит-логи, логируем без информации о том, кто переместил
                await logVoiceMovement(
                    newState.member.id,
                    newState.member.user.username,
                    oldChannel ? oldChannel.id : null,
                    newChannel ? newChannel.id : null,
                    oldChannel ? oldChannel.name : null,
                    newChannel ? newChannel.name : null,
                    null, // movedBy
                    null  // movedByUsername
                );
                console.log(`Could not fetch audit logs for voice movement: ${auditError.message}`);
            }
        }
        
        // Логируем изменения состояния микрофона и звука
        if (oldChannel && newChannel) { // Только если пользователь в голосовом канале
            // Проверяем изменения микрофона
            if (oldState.mute !== newState.mute) {
                const actionType = newState.mute ? 'микрофон_выключен' : 'микрофон_включен';
                const actionTarget = newState.mute ? 'Микрофон выключен' : 'Микрофон включен';
                
                try {
                    // Проверяем, было ли это изменение администратором
                    const auditLogs = await newState.guild.fetchAuditLogs({
                        type: AuditLogEvent.MemberUpdate,
                        limit: 5
                    });
                    
                    let controlledBy = null;
                    
                    if (auditLogs.entries.size > 0) {
                        // Ищем запись, где цель - наш пользователь
                        for (const [key, controlLog] of auditLogs.entries) {
                            if (controlLog.target && controlLog.target.id === newState.member.id && 
                                controlLog.createdTimestamp > (Date.now() - 5000)) {
                                controlledBy = controlLog.executor.id;
                                break;
                            }
                        }
                    }
                    
                    await logVoiceControl(
                        newState.member.id,
                        newState.member.user.username,
                        actionType,
                        actionTarget,
                        controlledBy
                    );
                } catch (auditError) {
                    await logVoiceControl(
                        newState.member.id,
                        newState.member.user.username,
                        actionType,
                        actionTarget,
                        null
                    );
                }
            }
            
            // Проверяем изменения звука
            if (oldState.deaf !== newState.deaf) {
                const actionType = newState.deaf ? 'звук_выключен' : 'звук_включен';
                const actionTarget = newState.deaf ? 'Звук выключен' : 'Звук включен';
                
                try {
                    // Проверяем, было ли это изменение администратором
                    const auditLogs = await newState.guild.fetchAuditLogs({
                        type: AuditLogEvent.MemberUpdate,
                        limit: 5
                    });
                    
                    let controlledBy = null;
                    
                    if (auditLogs.entries.size > 0) {
                        // Ищем запись, где цель - наш пользователь
                        for (const [key, controlLog] of auditLogs.entries) {
                            if (controlLog.target && controlLog.target.id === newState.member.id && 
                                controlLog.createdTimestamp > (Date.now() - 5000)) {
                                controlledBy = controlLog.executor.id;
                                break;
                            }
                        }
                    }
                    
                    await logVoiceControl(
                        newState.member.id,
                        newState.member.user.username,
                        actionType,
                        actionTarget,
                        controlledBy
                    );
                } catch (auditError) {
                    await logVoiceControl(
                        newState.member.id,
                        newState.member.user.username,
                        actionType,
                        actionTarget,
                        null
                    );
                }
            }
            
            // Проверяем server mute/deafen (когда администратор заглушает пользователя)
            if (oldState.serverMute !== newState.serverMute) {
                const actionType = newState.serverMute ? 'микрофон_заглушен' : 'микрофон_разглушен';
                const actionTarget = newState.serverMute ? 'Микрофон заглушен администратором' : 'Микрофон разглушен администратором';
                
                try {
                    // Проверяем, кто заглушил/разглушил пользователя
                    const auditLogs = await newState.guild.fetchAuditLogs({
                        type: AuditLogEvent.MemberUpdate,
                        limit: 5
                    });
                    
                    let controlledBy = null;
                    
                    if (auditLogs.entries.size > 0) {
                        // Ищем запись, где цель - наш пользователь
                        for (const [key, controlLog] of auditLogs.entries) {
                            if (controlLog.target && controlLog.target.id === newState.member.id && 
                                controlLog.createdTimestamp > (Date.now() - 5000)) {
                                controlledBy = controlLog.executor.id;
                                break;
                            }
                        }
                    }
                    
                    await logVoiceControl(
                        newState.member.id,
                        newState.member.user.username,
                        actionType,
                        actionTarget,
                        controlledBy
                    );
                } catch (auditError) {
                    await logVoiceControl(
                        newState.member.id,
                        newState.member.user.username,
                        actionType,
                        actionTarget,
                        null
                    );
                }
            }
            
            // Проверяем server deafen (когда администратор отключает звук пользователя)
            if (oldState.serverDeaf !== newState.serverDeaf) {
                const actionType = newState.serverDeaf ? 'звук_заглушен' : 'звук_разглушен';
                const actionTarget = newState.serverDeaf ? 'Звук заглушен администратором' : 'Звук разглушен администратором';
                
                try {
                    // Проверяем, кто заглушил/разглушил звук пользователя
                    const auditLogs = await newState.guild.fetchAuditLogs({
                        type: AuditLogEvent.MemberUpdate,
                        limit: 5
                    });
                    
                    let controlledBy = null;
                    
                    if (auditLogs.entries.size > 0) {
                        // Ищем запись, где цель - наш пользователь
                        for (const [key, controlLog] of auditLogs.entries) {
                            if (controlLog.target && controlLog.target.id === newState.member.id && 
                                controlLog.createdTimestamp > (Date.now() - 5000)) {
                                controlledBy = controlLog.executor.id;
                                break;
                            }
                        }
                    }
                    
                    await logVoiceControl(
                        newState.member.id,
                        newState.member.user.username,
                        actionType,
                        actionTarget,
                        controlledBy
                    );
                } catch (auditError) {
                    await logVoiceControl(
                        newState.member.id,
                        newState.member.user.username,
                        actionType,
                        actionTarget,
                        null
                    );
                    console.log(`Could not fetch audit logs for server voice control: ${auditError.message}`);
                }
            }
        }
    } catch (error) {
        console.error('Error handling voice state update:', error);
    }
};

// Обработчик изменения ролей
const handleRoleUpdate = async (oldMember, newMember) => {
    try {
        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;
        
        // Проверяем добавленные роли
        for (const [roleId, role] of newRoles) {
            if (!oldRoles.has(roleId)) {
                // Роль была добавлена
                try {
                    const auditLogs = await newMember.guild.fetchAuditLogs({
                        type: AuditLogEvent.MemberRoleUpdate,
                        limit: 1,
                        user: newMember.user
                    });
                    
                    let changedBy = 'Unknown';
                    let changedByUsername = 'Unknown';
                    let reason = null;
                    
                    if (auditLogs.entries.size > 0) {
                        const roleLog = auditLogs.entries.first();
                        if (roleLog.createdTimestamp > (Date.now() - 5000)) {
                            changedBy = roleLog.executor.id;
                            changedByUsername = roleLog.executor.username;
                            reason = roleLog.reason;
                        }
                    }
                    
                    await logRoleChange(
                        newMember.id,
                        newMember.user.username,
                        roleId,
                        role.name,
                        'добавлена',
                        changedBy,
                        changedByUsername,
                        reason
                    );
                } catch (auditError) {
                    // Если не удалось получить аудит-логи, логируем без информации об исполнителе
                    await logRoleChange(
                        newMember.id,
                        newMember.user.username,
                        roleId,
                        role.name,
                        'добавлена',
                        'Unknown',
                        'Unknown',
                        null
                    );
                }
            }
        }
        
        // Проверяем удаленные роли
        for (const [roleId, role] of oldRoles) {
            if (!newRoles.has(roleId)) {
                // Роль была удалена
                try {
                    const auditLogs = await newMember.guild.fetchAuditLogs({
                        type: AuditLogEvent.MemberRoleUpdate,
                        limit: 1,
                        user: newMember.user
                    });
                    
                    let changedBy = 'Unknown';
                    let changedByUsername = 'Unknown';
                    let reason = null;
                    
                    if (auditLogs.entries.size > 0) {
                        const roleLog = auditLogs.entries.first();
                        if (roleLog.createdTimestamp > (Date.now() - 5000)) {
                            changedBy = roleLog.executor.id;
                            changedByUsername = roleLog.executor.username;
                            reason = roleLog.reason;
                        }
                    }
                    
                    await logRoleChange(
                        newMember.id,
                        newMember.user.username,
                        roleId,
                        role.name,
                        'удалена',
                        changedBy,
                        changedByUsername,
                        reason
                    );
                } catch (auditError) {
                    // Если не удалось получить аудит-логи, логируем без информации об исполнителе
                    await logRoleChange(
                        newMember.id,
                        newMember.user.username,
                        roleId,
                        role.name,
                        'удалена',
                        'Unknown',
                        'Unknown',
                        null
                    );
                    console.log(`Could not fetch audit logs for role removal: ${auditError.message}`);
                }
            }
        }
    } catch (error) {
        console.error('Error handling role update:', error);
    }
};

// Обработчик создания ссылки приглашения
const handleInviteCreate = async (invite) => {
    try {
        await logInviteLinkCreation(
            invite.code,
            invite.inviter ? invite.inviter.id : 'Unknown',
            invite.inviter ? invite.inviter.username : 'Unknown',
            invite.channel.id,
            invite.channel.name,
            invite.maxUses,
            invite.maxAge,
            invite.temporary
        );
    } catch (error) {
        console.error('Error handling invite create:', error);
    }
};

// Обработчик использования ссылки приглашения
const handleInviteUse = async (invite, user) => {
    try {
        await logInviteLinkUsage(
            invite.code,
            user.id,
            user.username
        );
    } catch (error) {
        console.error('Error handling invite use:', error);
    }
};

// Обработчик входа пользователя на сервер (для отслеживания использования ссылок)
const handleGuildMemberAdd = async (member) => {
    try {
        // Получаем последние ссылки приглашений
        const invites = await member.guild.invites.fetch();
        
        // Проверяем, какая ссылка была использована
        for (const [code, invite] of invites) {
            if (invite.uses > 0) {
                // Это может быть использованная ссылка
                // В реальности Discord не предоставляет прямой способ узнать, какая ссылка была использована
                // Но мы можем логировать вход пользователя
                console.log(`User ${member.user.username} joined the server`);
            }
        }
    } catch (error) {
        console.error('Error handling guild member add:', error);
    }
};

// Обработчик редактирования сообщения
const handleMessageUpdate = async (oldMessage, newMessage) => {
    try {
        // Проверяем, что сообщение не от бота и содержимое изменилось
        if (oldMessage.author.bot || oldMessage.content === newMessage.content) {
            return;
        }
        
        await logMessageEdit(
            newMessage.id,
            newMessage.channel.id,
            newMessage.channel.name,
            newMessage.author.id,
            newMessage.author.username,
            oldMessage.content,
            newMessage.content
        );
    } catch (error) {
        console.error('Error handling message update:', error);
    }
};

// Обработчик удаления сообщения
const handleMessageDelete = async (message) => {
    try {
        // Проверяем, что сообщение не от бота
        if (message.author.bot) {
            return;
        }
        
        let deletedBy = null;
        let deletedByUsername = null;
        
        // Пытаемся определить, кто удалил сообщение через аудит-логи
        // Для MessageDelete цель в аудит-логе - это ID сообщения, а не канал
        // Примечание: Discord создает аудит-лог MessageDelete только когда сообщение удаляет НЕ автор
        try {
            const auditLogs = await message.guild.fetchAuditLogs({
                type: AuditLogEvent.MessageDelete,
                limit: 10
            });
            
            console.log(`Found ${auditLogs.entries.size} audit log entries for message delete`);
            
            if (auditLogs.entries.size > 0) {
                // Ищем запись, где цель - это ID удаленного сообщения
                for (const [key, auditLog] of auditLogs.entries) {
                    console.log(`Checking audit log: target=${auditLog.target?.id}, message=${message.id}, executor=${auditLog.executor?.id}, author=${message.author.id}, timestamp=${auditLog.createdTimestamp}, now=${Date.now()}`);
                    
                    // Проверяем, что цель - это ID сообщения
                    if (auditLog.target && auditLog.target.id === message.id) {
                        console.log(`Found matching message ID in audit log: executor=${auditLog.executor?.id}, author=${message.author.id}`);
                        
                        // Проверяем время (увеличиваем окно до 30 секунд для надежности)
                        if (auditLog.createdTimestamp > (Date.now() - 30000)) {
                            console.log(`Audit log is recent enough`);
                            
                            // Если исполнитель не является автором сообщения, значит кто-то другой удалил его
                            if (auditLog.executor && auditLog.executor.id !== message.author.id) {
                                deletedBy = auditLog.executor.id;
                                deletedByUsername = auditLog.executor.username;
                                console.log(`Message deleted by: ${deletedByUsername} (${deletedBy})`);
                                break;
                            } else {
                                console.log(`Message was deleted by its author`);
                            }
                        } else {
                            console.log(`Audit log is too old: ${Date.now() - auditLog.createdTimestamp}ms ago`);
                        }
                    }
                }
            }
            
            // Если не нашли аудит-лог, значит сообщение удалил автор
            if (!deletedBy) {
                console.log(`No audit log found - message was likely deleted by its author`);
            }
        } catch (auditError) {
            console.log(`Could not fetch audit logs for message delete: ${auditError.message}`);
            console.log(`Message was likely deleted by its author`);
        }
        
        // Подготавливаем информацию о медиафайлах для отображения в логе
        let attachments = [];
        if (message.attachments && message.attachments.size > 0) {
            attachments = Array.from(message.attachments.values()).map(att => ({
                id: att.id,
                name: att.name,
                size: att.size,
                url: att.url,
                contentType: att.contentType
            }));
        }
        
        await logMessageDelete(
            message.id,
            message.channel.id,
            message.channel.name,
            message.author.id,
            message.author.username,
            message.content,
            deletedBy,
            deletedByUsername,
            attachments
        );
    } catch (error) {
        console.error('Error handling message delete:', error);
    }
};

// Функция для настройки всех обработчиков событий
const setupLoggingEvents = (client, logger = null) => {
    console.log('setupLoggingEvents called with logger:', !!logger);
    // Устанавливаем Discord логгер
    if (logger) {
        setDiscordLogger(logger);
    }
    // Событие изменения участника (никнейм, роли)
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        await handleNicknameChange(oldMember, newMember);
        await handleRoleUpdate(oldMember, newMember);
    });
    
    // Событие изменения пользователя (аватар)
    client.on('userUpdate', async (oldUser, newUser) => {
        await handleAvatarChange(oldUser, newUser);
    });
    
    // Событие изменения голосового состояния
    client.on('voiceStateUpdate', async (oldState, newState) => {
        await handleVoiceStateUpdate(oldState, newState);
    });
    
    // Событие создания ссылки приглашения
    client.on('inviteCreate', async (invite) => {
        await handleInviteCreate(invite);
    });
    
    // Событие добавления участника на сервер
    client.on('guildMemberAdd', async (member) => {
        await handleGuildMemberAdd(member);
    });
    
    // Событие редактирования сообщения
    client.on('messageUpdate', async (oldMessage, newMessage) => {
        await handleMessageUpdate(oldMessage, newMessage);
    });
    
    // Событие удаления сообщения
    client.on('messageDelete', async (message) => {
        await handleMessageDelete(message);
    });
    
    console.log('Logging events setup completed');
    console.log('setupLoggingEvents: All event handlers configured');
};

module.exports = {
    setupLoggingEvents,
    handleNicknameChange,
    handleAvatarChange,
    handleVoiceStateUpdate,
    handleRoleUpdate,
    handleInviteCreate,
    handleInviteUse,
    handleMessageUpdate,
    handleMessageDelete,
    setDiscordLogger
};
