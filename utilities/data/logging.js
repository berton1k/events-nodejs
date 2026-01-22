const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { log } = require('./utils');

// Глобальная переменная для Discord логгера
let discordLogger = null;

// Функция для установки Discord логгера
const setDiscordLogger = (logger) => {
    console.log('setDiscordLogger called with:', !!logger);
    discordLogger = logger;
    console.log('Discord logger set successfully');
};

// Создаем базу данных для логирования
// Используем абсолютный путь для корректной работы в Docker контейнере
const logDbPath = path.resolve(__dirname, '../../logs.sqlite');
console.log('Log database path:', logDbPath);

// Проверяем существование файла базы данных логирования
if (!fs.existsSync(logDbPath)) {
    console.error(`Log database file not found at: ${logDbPath}`);
    console.error('Current working directory:', process.cwd());
    console.error('__dirname:', __dirname);
}

let logDb = new sqlite3.Database(logDbPath, (err) => {
    if (err) {
        console.error('Error opening log database:', err.message);
        console.error('Log database path:', logDbPath);
        console.error('Current working directory:', process.cwd());
        console.error('__dirname:', __dirname);
    } else {
        console.log('Log database connected successfully');
    }
});

// Инициализируем таблицы логирования
const initializeLoggingDatabase = () => {
    return new Promise((resolve, reject) => {
        // Таблица истории ников
        logDb.run(`
            CREATE TABLE IF NOT EXISTS nickname_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                old_nickname TEXT,
                new_nickname TEXT,
                changed_by TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Таблица истории аватаров
            logDb.run(`
                CREATE TABLE IF NOT EXISTS avatar_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    old_avatar TEXT,
                    new_avatar TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Таблица логирования перемещений в голосовые каналы
                logDb.run(`
                    CREATE TABLE IF NOT EXISTS voice_movement_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        username TEXT NOT NULL,
                        old_channel_id TEXT,
                        new_channel_id TEXT,
                        old_channel_name TEXT,
                        new_channel_name TEXT,
                        moved_by TEXT,
                        moved_by_username TEXT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    // Таблица логирования изменений ролей
                    logDb.run(`
                        CREATE TABLE IF NOT EXISTS role_change_logs (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id TEXT NOT NULL,
                            username TEXT NOT NULL,
                            role_id TEXT NOT NULL,
                            role_name TEXT NOT NULL,
                            action TEXT NOT NULL,
                            changed_by TEXT NOT NULL,
                            changed_by_username TEXT NOT NULL,
                            reason TEXT,
                            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    `, (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        // Таблица логирования ссылок приглашений
                        logDb.run(`
                            CREATE TABLE IF NOT EXISTS invite_link_logs (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                invite_code TEXT NOT NULL,
                                created_by TEXT NOT NULL,
                                created_by_username TEXT NOT NULL,
                                channel_id TEXT,
                                channel_name TEXT,
                                max_uses INTEGER,
                                max_age INTEGER,
                                temporary BOOLEAN,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            )
                        `, (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            
                                             // Таблица логирования использования ссылок приглашений
                 logDb.run(`
                     CREATE TABLE IF NOT EXISTS invite_usage_logs (
                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                         invite_code TEXT NOT NULL,
                         user_id TEXT NOT NULL,
                         username TEXT NOT NULL,
                         used_at DATETIME DEFAULT CURRENT_TIMESTAMP
                     )
                 `, (err) => {
                     if (err) {
                         reject(err);
                         return;
                     }
                     
                     // Таблица логирования управления микрофоном и звуком
                     logDb.run(`
                         CREATE TABLE IF NOT EXISTS voice_control_logs (
                             id INTEGER PRIMARY KEY AUTOINCREMENT,
                             user_id TEXT NOT NULL,
                             username TEXT NOT NULL,
                             action_type TEXT NOT NULL,
                             action_target TEXT NOT NULL,
                             controlled_by TEXT,
                             controlled_by_username TEXT,
                             timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                         )
                     `, (err) => {
                         if (err) {
                             reject(err);
                             return;
                         }
                         
                         // Таблица логирования редактирования сообщений
                         logDb.run(`
                             CREATE TABLE IF NOT EXISTS message_edit_logs (
                                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                                 message_id TEXT NOT NULL,
                                 channel_id TEXT NOT NULL,
                                 channel_name TEXT NOT NULL,
                                 user_id TEXT NOT NULL,
                                 username TEXT NOT NULL,
                                 old_content TEXT NOT NULL,
                                 new_content TEXT NOT NULL,
                                 timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                             )
                         `, (err) => {
                             if (err) {
                                 reject(err);
                                 return;
                             }
                             
                             // Таблица логирования удаления сообщений
                             logDb.run(`
                                 CREATE TABLE IF NOT EXISTS message_delete_logs (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     message_id TEXT NOT NULL,
                                     channel_id TEXT NOT NULL,
                                     channel_name TEXT NOT NULL,
                                     user_id TEXT NOT NULL,
                                     username TEXT NOT NULL,
                                     content TEXT NOT NULL,
                                     deleted_by TEXT,
                                     deleted_by_username TEXT,
                                     has_attachments BOOLEAN DEFAULT 0,
                                     attachment_count INTEGER DEFAULT 0,
                                     attachment_info TEXT,
                                     timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                                 )
                             `, (err) => {
                                 if (err) {
                                     reject(err);
                                     return;
                                 }
                                 
                                 // Добавляем новые поля, если их нет (миграция)
                                 logDb.run(`ALTER TABLE message_delete_logs ADD COLUMN has_attachments BOOLEAN DEFAULT 0`, (err) => {
                                     if (err && !err.message.includes('duplicate column name')) {
                                         log(`Warning: Could not add has_attachments column: ${err.message}`);
                                     }
                                 });
                                 
                                 logDb.run(`ALTER TABLE message_delete_logs ADD COLUMN attachment_count INTEGER DEFAULT 0`, (err) => {
                                     if (err && !err.message.includes('duplicate column name')) {
                                         log(`Warning: Could not add attachment_count column: ${err.message}`);
                                     }
                                 });
                                 
                                 logDb.run(`ALTER TABLE message_delete_logs ADD COLUMN attachment_info TEXT`, (err) => {
                                     if (err && !err.message.includes('duplicate column name')) {
                                         log(`Warning: Could not add attachment_info column: ${err.message}`);
                                     }
                                 });
                                 
                                 log("Logging database initialized successfully");
                                 resolve();
                             });
                         });
                     });
                 });
                        });
                    });
                });
            });
        });
    });
};

// Логирование изменения никнейма
const logNicknameChange = async (userId, oldNickname, newNickname, changedBy = null) => {
    return new Promise((resolve, reject) => {
        logDb.run(`
            INSERT INTO nickname_history (user_id, old_nickname, new_nickname, changed_by)
            VALUES (?, ?, ?, ?)
        `, [userId, oldNickname, newNickname, changedBy], async function(err) {
            if (err) {
                log(`Error logging nickname change: ${err.message}`);
                reject(err);
            } else {
                log(`Nickname change logged for user ${userId}: ${oldNickname} -> ${newNickname}`);
                
                // Отправляем лог в Discord, если логгер доступен
                if (discordLogger) {
                    try {
                        await discordLogger.logNicknameChange(userId, oldNickname, newNickname, changedBy);
                    } catch (discordError) {
                        log(`Error sending nickname change to Discord: ${discordError.message}`);
                    }
                }
                
                resolve(this.lastID);
            }
        });
    });
};

// Логирование изменения аватара
const logAvatarChange = async (userId, oldAvatar, newAvatar) => {
    return new Promise((resolve, reject) => {
        logDb.run(`
            INSERT INTO avatar_history (user_id, old_avatar, new_avatar)
            VALUES (?, ?, ?)
        `, [userId, oldAvatar, newAvatar], async function(err) {
            if (err) {
                log(`Error logging avatar change: ${err.message}`);
                reject(err);
            } else {
                log(`Avatar change logged for user ${userId}`);
                
                // Отправляем лог в Discord, если логгер доступен
                if (discordLogger) {
                    try {
                        await discordLogger.logAvatarChange(userId, oldAvatar, newAvatar);
                    } catch (discordError) {
                        log(`Error sending avatar change to Discord: ${discordError.message}`);
                    }
                }
                
                resolve(this.lastID);
            }
        });
    });
};

// Логирование перемещения в голосовой канал
const logVoiceMovement = async (userId, username, oldChannelId, newChannelId, oldChannelName, newChannelName, movedBy = null, movedByUsername = null) => {
    return new Promise((resolve, reject) => {
        logDb.run(`
            INSERT INTO voice_movement_logs (user_id, username, old_channel_id, new_channel_id, old_channel_name, new_channel_name, moved_by, moved_by_username)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, username, oldChannelId, newChannelId, oldChannelName, newChannelName, movedBy, movedByUsername], async function(err) {
            if (err) {
                log(`Error logging voice movement: ${err.message}`);
                reject(err);
            } else {
                log(`Voice movement logged for user ${username}: ${oldChannelName || 'None'} -> ${newChannelName || 'None'}`);
                
                                   // Отправляем лог в Discord, если логгер доступен
                   if (discordLogger) {
                       try {
                           await discordLogger.logVoiceMovement(userId, username, oldChannelId, newChannelId, oldChannelName, newChannelName, movedBy);
                       } catch (discordError) {
                           log(`Error sending voice movement to Discord: ${discordError.message}`);
                       }
                   }
                
                resolve(this.lastID);
            }
        });
    });
};

// Логирование изменения роли
const logRoleChange = async (userId, username, roleId, roleName, action, changedBy, changedByUsername, reason = null) => {
    return new Promise((resolve, reject) => {
        logDb.run(`
            INSERT INTO role_change_logs (user_id, username, role_id, role_name, action, changed_by, changed_by_username, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, username, roleId, roleName, action, changedBy, changedByUsername, reason], async function(err) {
            if (err) {
                log(`Error logging role change: ${err.message}`);
                reject(err);
            } else {
                log(`Role change logged for user ${username}: ${action} ${roleName}`);
                
                                   // Отправляем лог в Discord, если логгер доступен
                   if (discordLogger) {
                       try {
                           await discordLogger.logRoleChange(userId, username, roleId, roleName, action, changedBy, reason);
                       } catch (discordError) {
                           log(`Error sending role change to Discord: ${discordError.message}`);
                       }
                   }
                
                resolve(this.lastID);
            }
        });
    });
};

// Логирование создания ссылки приглашения
const logInviteLinkCreation = async (inviteCode, createdBy, createdByUsername, channelId, channelName, maxUses, maxAge, temporary) => {
    return new Promise((resolve, reject) => {
        logDb.run(`
            INSERT INTO invite_link_logs (invite_code, created_by, created_by_username, channel_id, channel_name, max_uses, max_age, temporary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [inviteCode, createdBy, createdByUsername, channelId, channelName, maxUses, maxAge, temporary], async function(err) {
            if (err) {
                log(`Error logging invite link creation: ${err.message}`);
                reject(err);
            } else {
                log(`Invite link creation logged: ${inviteCode} by ${createdByUsername}`);
                
                                   // Отправляем лог в Discord, если логгер доступен
                   if (discordLogger) {
                       try {
                           await discordLogger.logInviteLinkCreation(inviteCode, createdBy, channelId, channelName, maxUses, maxAge, temporary);
                       } catch (discordError) {
                           log(`Error sending invite link creation to Discord: ${discordError.message}`);
                       }
                   }
                
                resolve(this.lastID);
            }
        });
    });
};

// Логирование использования ссылки приглашения
const logInviteLinkUsage = async (inviteCode, userId, username) => {
    return new Promise((resolve, reject) => {
        logDb.run(`
            INSERT INTO invite_usage_logs (invite_code, user_id, username)
            VALUES (?, ?, ?)
        `, [inviteCode, userId, username], async function(err) {
            if (err) {
                log(`Error logging invite link usage: ${err.message}`);
                reject(err);
            } else {
                log(`Invite link usage logged: ${inviteCode} by ${username}`);
                
                // Отправляем лог в Discord, если логгер доступен
                if (discordLogger) {
                    try {
                        await discordLogger.logInviteLinkUsage(inviteCode, userId, username);
                    } catch (discordError) {
                        log(`Error sending invite link usage to Discord: ${discordError.message}`);
                    }
                }
                
                resolve(this.lastID);
            }
        });
    });
};

// Логирование управления микрофоном и звуком
const logVoiceControl = async (userId, username, actionType, actionTarget, controlledBy = null, controlledByUsername = null) => {
    return new Promise((resolve, reject) => {
        logDb.run(`
            INSERT INTO voice_control_logs (user_id, username, action_type, action_target, controlled_by, controlled_by_username)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [userId, username, actionType, actionTarget, controlledBy, controlledByUsername], async function(err) {
            if (err) {
                log(`Error logging voice control: ${err.message}`);
                reject(err);
            } else {
                log(`Voice control logged: ${actionType} ${actionTarget} for ${username}`);
                
                // Отправляем лог в Discord, если логгер доступен
                if (discordLogger) {
                    try {
                        await discordLogger.logVoiceControl(userId, username, actionType, actionTarget, controlledBy);
                    } catch (discordError) {
                        log(`Error sending voice control to Discord: ${discordError.message}`);
                    }
                }
                
                resolve(this.lastID);
            }
        });
    });
};

// Получение истории ников пользователя
const getNicknameHistory = (userId, limit = 10) => {
    return new Promise((resolve, reject) => {
        logDb.all(`
            SELECT * FROM nickname_history 
            WHERE user_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        `, [userId, limit], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Получение истории аватаров пользователя
const getAvatarHistory = (userId, limit = 10) => {
    return new Promise((resolve, reject) => {
        logDb.all(`
            SELECT * FROM avatar_history 
            WHERE user_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        `, [userId, limit], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Получение логов перемещений в голосовые каналы
const getVoiceMovementLogs = (userId = null, limit = 50) => {
    return new Promise((resolve, reject) => {
        let query = `SELECT * FROM voice_movement_logs ORDER BY timestamp DESC LIMIT ?`;
        let params = [limit];
        
        if (userId) {
            query = `SELECT * FROM voice_movement_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?`;
            params = [userId, limit];
        }
        
        logDb.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Получение логов изменений ролей
const getRoleChangeLogs = (userId = null, limit = 50) => {
    return new Promise((resolve, reject) => {
        let query = `SELECT * FROM role_change_logs ORDER BY timestamp DESC LIMIT ?`;
        let params = [limit];
        
        if (userId) {
            query = `SELECT * FROM role_change_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?`;
            params = [userId, limit];
        }
        
        logDb.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Получение логов создания ссылок приглашений
const getInviteLinkCreationLogs = (createdBy = null, limit = 50) => {
    return new Promise((resolve, reject) => {
        let query = `SELECT * FROM invite_link_logs ORDER BY created_at DESC LIMIT ?`;
        let params = [limit];
        
        if (createdBy) {
            query = `SELECT * FROM invite_link_logs WHERE created_by = ? ORDER BY created_at DESC LIMIT ?`;
            params = [createdBy, limit];
        }
        
        logDb.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Получение логов использования ссылок приглашений
const getInviteLinkUsageLogs = (inviteCode = null, limit = 50) => {
    return new Promise((resolve, reject) => {
        let query = `SELECT * FROM invite_usage_logs ORDER BY used_at DESC LIMIT ?`;
        let params = [limit];
        
        if (inviteCode) {
            query = `SELECT * FROM invite_usage_logs WHERE invite_code = ? ORDER BY used_at DESC LIMIT ?`;
            params = [inviteCode, limit];
        }
        
        logDb.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Получение логов управления микрофоном и звуком
const getVoiceControlLogs = (userId = null, limit = 50) => {
    return new Promise((resolve, reject) => {
        let query = `SELECT * FROM voice_control_logs ORDER BY timestamp DESC LIMIT ?`;
        let params = [limit];
        
        if (userId) {
            query = `SELECT * FROM voice_control_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?`;
            params = [userId, limit];
        }
        
        logDb.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Логирование редактирования сообщения
const logMessageEdit = async (messageId, channelId, channelName, userId, username, oldContent, newContent) => {
    return new Promise((resolve, reject) => {
        logDb.run(`
            INSERT INTO message_edit_logs (message_id, channel_id, channel_name, user_id, username, old_content, new_content)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [messageId, channelId, channelName, userId, username, oldContent, newContent], async function(err) {
            if (err) {
                log(`Error logging message edit: ${err.message}`);
                reject(err);
            } else {
                log(`Message edit logged: ${messageId} in #${channelName}`);
                
                // Отправляем лог в Discord, если логгер доступен
                if (discordLogger) {
                    try {
                        await discordLogger.logMessageEdit(messageId, channelId, channelName, userId, username, oldContent, newContent);
                    } catch (discordError) {
                        log(`Error sending message edit to Discord: ${discordError.message}`);
                    }
                }
                
                resolve(this.lastID);
            }
        });
    });
};

// Функция для сохранения медиафайлов на диск
const saveAttachments = async (attachments, messageId) => {
    if (!attachments || attachments.length === 0) {
        return [];
    }
    
    const savedAttachments = [];
    const logsDir = path.join(__dirname, '..', '..', 'logs', 'deleted_media');
    
    // Создаем директорию для сохранения медиафайлов, если её нет
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    
    for (const attachment of attachments) {
        try {
            // Определяем расширение файла
            const fileExtension = path.extname(attachment.name) || '.bin';
            const fileName = `${messageId}_${attachment.id}${fileExtension}`;
            const filePath = path.join(logsDir, fileName);
            
            // Проверяем, не существует ли уже файл
            if (fs.existsSync(filePath)) {
                log(`File already exists: ${fileName}`);
                savedAttachments.push({
                    ...attachment,
                    savedPath: filePath
                });
                continue;
            }
            
            // Скачиваем файл
            await new Promise((resolve, reject) => {
                const protocol = attachment.url.startsWith('https:') ? https : http;
                
                const request = protocol.get(attachment.url, (response) => {
                    if (response.statusCode !== 200) {
                        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                        return;
                    }
                    
                    const fileStream = fs.createWriteStream(filePath);
                    response.pipe(fileStream);
                    
                    fileStream.on('finish', () => {
                        fileStream.close();
                        log(`Saved attachment: ${fileName} (${attachment.size} bytes)`);
                        resolve();
                    });
                    
                    fileStream.on('error', (err) => {
                        fs.unlink(filePath, () => {}); // Удаляем частично скачанный файл
                        reject(err);
                    });
                });
                
                request.on('error', (err) => {
                    reject(err);
                });
                
                request.setTimeout(30000, () => {
                    request.destroy();
                    reject(new Error('Download timeout'));
                });
            });
            
            savedAttachments.push({
                ...attachment,
                savedPath: filePath
            });
            
        } catch (error) {
            log(`Error saving attachment ${attachment.name}: ${error.message}`);
            // Добавляем информацию о файле даже если не удалось его сохранить
            savedAttachments.push({
                ...attachment,
                savedPath: null,
                error: error.message
            });
        }
    }
    
    return savedAttachments;
};

// Логирование удаления сообщения
const logMessageDelete = async (messageId, channelId, channelName, userId, username, content, deletedBy = null, deletedByUsername = null, attachments = null) => {
    return new Promise((resolve, reject) => {
        let hasAttachments = 0;
        let attachmentCount = 0;
        let attachmentInfo = null;
        
        if (attachments && attachments.length > 0) {
            hasAttachments = 1;
            attachmentCount = attachments.length;
            attachmentInfo = JSON.stringify(attachments.map(att => ({
                id: att.id,
                filename: att.name,
                size: att.size,
                url: att.url,
                contentType: att.contentType
            })));
        }
        
        logDb.run(`
            INSERT INTO message_delete_logs (message_id, channel_id, channel_name, user_id, username, content, deleted_by, deleted_by_username, has_attachments, attachment_count, attachment_info)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [messageId, channelId, channelName, userId, username, content, deletedBy, deletedByUsername, hasAttachments, attachmentCount, attachmentInfo], async function(err) {
            if (err) {
                log(`Error logging message delete: ${err.message}`);
                reject(err);
            } else {
                log(`Message delete logged: ${messageId} in #${channelName}`);
                
                // Отправляем лог в Discord, если логгер доступен
                if (discordLogger) {
                    try {
                        await discordLogger.logMessageDelete(messageId, channelId, channelName, userId, username, content, deletedBy, deletedByUsername, attachments);
                    } catch (discordError) {
                        log(`Error sending message delete to Discord: ${discordError.message}`);
                    }
                }
                
                resolve(this.lastID);
            }
        });
    });
};

// Получение логов редактирования сообщений
const getMessageEditLogs = (userId = null, limit = 50) => {
    return new Promise((resolve, reject) => {
        let query = `SELECT * FROM message_edit_logs ORDER BY timestamp DESC LIMIT ?`;
        let params = [limit];
        
        if (userId) {
            query = `SELECT * FROM message_edit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?`;
            params = [userId, limit];
        }
        
        logDb.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Получение логов удаления сообщений
const getMessageDeleteLogs = (userId = null, limit = 50) => {
    return new Promise((resolve, reject) => {
        let query = `SELECT * FROM message_delete_logs ORDER BY timestamp DESC LIMIT ?`;
        let params = [limit];
        
        if (userId) {
            query = `SELECT * FROM message_delete_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?`;
            params = [userId, limit];
        }
        
        logDb.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Очистка старых логов (старше указанного количества дней)
const cleanupOldLogs = (days = 30) => {
    return new Promise((resolve, reject) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffTimestamp = cutoffDate.toISOString();
        
        Promise.all([
            new Promise((res, rej) => {
                logDb.run(`DELETE FROM nickname_history WHERE timestamp < ?`, [cutoffTimestamp], function(err) {
                    if (err) rej(err);
                    else res(this.changes);
                });
            }),
            new Promise((res, rej) => {
                logDb.run(`DELETE FROM avatar_history WHERE timestamp < ?`, [cutoffTimestamp], function(err) {
                    if (err) rej(err);
                    else res(this.changes);
                });
            }),
            new Promise((res, rej) => {
                logDb.run(`DELETE FROM voice_movement_logs WHERE timestamp < ?`, [cutoffTimestamp], function(err) {
                    if (err) rej(err);
                    else res(this.changes);
                });
            }),
            new Promise((res, rej) => {
                logDb.run(`DELETE FROM role_change_logs WHERE timestamp < ?`, [cutoffTimestamp], function(err) {
                    if (err) rej(err);
                    else res(this.changes);
                });
            }),
            new Promise((res, rej) => {
                logDb.run(`DELETE FROM invite_link_logs WHERE created_at < ?`, [cutoffTimestamp], function(err) {
                    if (err) rej(err);
                    else res(this.changes);
                });
            }),
            new Promise((res, rej) => {
                logDb.run(`DELETE FROM invite_usage_logs WHERE used_at < ?`, [cutoffTimestamp], function(err) {
                    if (err) rej(err);
                    else res(this.changes);
                });
            }),
            new Promise((res, rej) => {
                logDb.run(`DELETE FROM voice_control_logs WHERE timestamp < ?`, [cutoffTimestamp], function(err) {
                    if (err) rej(err);
                    else res(this.changes);
                });
            }),
            new Promise((res, rej) => {
                logDb.run(`DELETE FROM message_edit_logs WHERE timestamp < ?`, [cutoffTimestamp], function(err) {
                    if (err) rej(err);
                    else res(this.changes);
                });
            }),
            new Promise((res, rej) => {
                logDb.run(`DELETE FROM message_delete_logs WHERE timestamp < ?`, [cutoffTimestamp], function(err) {
                    if (err) rej(err);
                    else res(this.changes);
                });
            })
        ]).then(results => {
            const totalDeleted = results.reduce((sum, count) => sum + count, 0);
            log(`Cleaned up ${totalDeleted} old log entries`);
            resolve(totalDeleted);
        }).catch(reject);
    });
};

// Функция для обновления канала логов в Discord логгере
const refreshDiscordLogChannel = async () => {
    console.log('refreshDiscordLogChannel called, discordLogger:', !!discordLogger);
    if (discordLogger) {
        console.log('Refreshing Discord logger channels...');
        await discordLogger.refreshLogChannel();
        console.log('Discord logger channels refreshed');
    } else {
        console.log('No Discord logger available for refresh');
    }
};

module.exports = {
    initializeLoggingDatabase,
    logNicknameChange,
    logAvatarChange,
    logVoiceMovement,
    logRoleChange,
    logInviteLinkCreation,
    logInviteLinkUsage,
    logVoiceControl,
    logMessageEdit,
    logMessageDelete,
    saveAttachments,
    getNicknameHistory,
    getAvatarHistory,
    getVoiceMovementLogs,
    getRoleChangeLogs,
    getInviteLinkCreationLogs,
    getInviteLinkUsageLogs,
    getVoiceControlLogs,
    getMessageEditLogs,
    getMessageDeleteLogs,
    cleanupOldLogs,
    setDiscordLogger,
    refreshDiscordLogChannel
};
