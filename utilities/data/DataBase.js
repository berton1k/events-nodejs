const sqlite3 = require('sqlite3').verbose();
const CyrillicToTranslit = require("cyrillic-to-translit-js");
const cyrillicToTranslit = new CyrillicToTranslit();
const path = require('path');

// Создаем базу данных в локальном файле
// Используем абсолютный путь для корректной работы в Docker контейнере
const dbPath = path.resolve(__dirname, '../../database.sqlite');
console.log('Database path:', dbPath);

// Проверяем существование файла базы данных
const fs = require('fs');
if (!fs.existsSync(dbPath)) {
    console.error(`Database file not found at: ${dbPath}`);
    console.error('Current working directory:', process.cwd());
    console.error('__dirname:', __dirname);
}

let db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        console.error('Database path:', dbPath);
        console.error('Current working directory:', process.cwd());
        console.error('__dirname:', __dirname);
    } else {
        console.log('Database connected successfully');
    }
});

// Инициализируем таблицы при первом запуске
const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        // Таблица событий
        db.run(`
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                task TEXT,
                prize TEXT,
                image TEXT,
                rules TEXT,
                organizer TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Таблица настроек
            db.run(`
                CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT UNIQUE NOT NULL,
                    value TEXT
                )
            `, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Таблица участников событий
                db.run(`
                    CREATE TABLE IF NOT EXISTS event_participants (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        event_id TEXT NOT NULL,
                        user_id TEXT NOT NULL,
                        username TEXT NOT NULL,
                        join_date TEXT NOT NULL,
                        UNIQUE(event_id, user_id)
                    )
                `, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    // Таблица розыгрышей
                    db.run(`
                        CREATE TABLE IF NOT EXISTS giveaways (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            prize TEXT NOT NULL,
                            spots INTEGER NOT NULL,
                            end_date TEXT NOT NULL,
                            image TEXT,
                            created_by TEXT NOT NULL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            is_active BOOLEAN DEFAULT 1,
                            message_id TEXT
                        )
                    `, (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        // Таблица участников розыгрышей
                        db.run(`
                            CREATE TABLE IF NOT EXISTS giveaway_participants (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                giveaway_id INTEGER NOT NULL,
                                user_id TEXT NOT NULL,
                                username TEXT NOT NULL,
                                join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                                UNIQUE(giveaway_id, user_id),
                                FOREIGN KEY (giveaway_id) REFERENCES giveaways (id)
                            )
                        `, (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            
                            // Таблица шаблонов Ошки
                            db.run(`
                                CREATE TABLE IF NOT EXISTS oshka_templates (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    name TEXT NOT NULL,
                                    content TEXT NOT NULL,
                                    description TEXT,
                                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                                )
                            `, (err) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                
                                // Таблица предупреждений
                                db.run(`
                                    CREATE TABLE IF NOT EXISTS warnings (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        user_id TEXT NOT NULL,
                                        moderator_id TEXT NOT NULL,
                                        reason TEXT,
                                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                                    )
                                `, (err) => {
                                    if (err) {
                                        reject(err);
                                        return;
                                    }
                                    
                                    // Таблица банов
                                    db.run(`
                                        CREATE TABLE IF NOT EXISTS bans (
                                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                                            user_id TEXT NOT NULL,
                                            moderator_id TEXT NOT NULL,
                                            reason TEXT,
                                            ban_until DATETIME,
                                            is_permanent BOOLEAN DEFAULT 0,
                                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                                        )
                                    `, (err) => {
                                        if (err) {
                                            reject(err);
                                            return;
                                        }
                                        
                                        // Таблица киков по предупреждениям
                                        db.run(`
                                            CREATE TABLE IF NOT EXISTS warning_kicks (
                                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                user_id TEXT NOT NULL,
                                                moderator_id TEXT NOT NULL,
                                                reason TEXT,
                                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                                            )
                                        `, (err) => {
                                            if (err) {
                                                reject(err);
                                                return;
                                            }
                                            
                                            // Обновляем структуру существующих таблиц
                                            updateExistingTables().then(() => resolve()).catch(reject);
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

// Функция для обновления структуры существующих таблиц
const updateExistingTables = async () => {
    return new Promise((resolve, reject) => {
        // Проверяем и обновляем таблицу oshka_templates
        db.all("PRAGMA table_info(oshka_templates)", (err, tableInfo) => {
            if (err) {
                console.log('Таблица oshka_templates не существует, пропускаем обновление');
                // Продолжаем с проверкой других таблиц
                checkWarningsTable();
                return;
            }
            
            // Проверяем, есть ли поле content
            const hasContentField = tableInfo.some(column => column.name === 'content');
            if (!hasContentField) {
                console.log('Добавляем поле content в таблицу oshka_templates...');
                db.run('ALTER TABLE oshka_templates ADD COLUMN content TEXT', (err) => {
                    if (err) {
                        console.log('Ошибка при добавлении поля content:', err.message);
                    } else {
                        console.log('Поле content успешно добавлено в таблицу oshka_templates');
                    }
                    // Продолжаем с проверкой других таблиц
                    checkWarningsTable();
                });
            } else {
                console.log('Таблица oshka_templates уже имеет поле content');
                // Продолжаем с проверкой других таблиц
                checkWarningsTable();
            }
        });

        // Функция для проверки и исправления таблицы warnings
        function checkWarningsTable() {
            db.all("PRAGMA table_info(warnings)", (err, tableInfo) => {
                if (err) {
                    console.log('Таблица warnings не существует, пропускаем обновление');
                    resolve();
                    return;
                }
                
                // Проверяем, есть ли поле username (которое не должно быть)
                const hasUsernameField = tableInfo.some(column => column.name === 'username');
                if (hasUsernameField) {
                    console.log('Обнаружено поле username в таблице warnings, исправляем структуру...');
                    
                    // Создаем временную таблицу с правильной структурой
                    db.run(`
                        CREATE TABLE warnings_temp (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id TEXT NOT NULL,
                            moderator_id TEXT NOT NULL,
                            reason TEXT,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    `, (err) => {
                        if (err) {
                            console.log('Ошибка при создании временной таблицы warnings:', err.message);
                            resolve();
                            return;
                        }
                        
                        // Копируем данные из старой таблицы (исключая поле username)
                        db.run(`
                            INSERT INTO warnings_temp (id, user_id, moderator_id, reason, created_at)
                            SELECT id, user_id, moderator_id, reason, created_at FROM warnings
                        `, (err) => {
                            if (err) {
                                console.log('Ошибка при копировании данных:', err.message);
                                resolve();
                                return;
                            }
                            
                            // Удаляем старую таблицу
                            db.run('DROP TABLE warnings', (err) => {
                                if (err) {
                                    console.log('Ошибка при удалении старой таблицы warnings:', err.message);
                                    resolve();
                                    return;
                                }
                                
                                // Переименовываем временную таблицу
                                db.run('ALTER TABLE warnings_temp RENAME TO warnings', (err) => {
                                    if (err) {
                                        console.log('Ошибка при переименовании таблицы warnings:', err.message);
                                    } else {
                                        console.log('Таблица warnings успешно исправлена');
                                    }
                                    // Проверяем таблицу warning_kicks
                                    checkWarningKicksTable();
                                });
                            });
                        });
                    });
                } else {
                    console.log('Таблица warnings уже имеет правильную структуру');
                    // Проверяем таблицу warning_kicks
                    checkWarningKicksTable();
                }
            });
        }

        // Функция для проверки и исправления таблицы warning_kicks
        function checkWarningKicksTable() {
            db.all("PRAGMA table_info(warning_kicks)", (err, tableInfo) => {
                if (err) {
                    console.log('Таблица warning_kicks не существует, пропускаем обновление');
                    resolve();
                    return;
                }
                
                // Проверяем, есть ли поле username (которое не должно быть)
                const hasUsernameField = tableInfo.some(column => column.name === 'username');
                if (hasUsernameField) {
                    console.log('Обнаружено поле username в таблице warning_kicks, исправляем структуру...');
                    
                    // Создаем временную таблицу с правильной структурой
                    db.run(`
                        CREATE TABLE warning_kicks_temp (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id TEXT NOT NULL,
                            moderator_id TEXT NOT NULL,
                            reason TEXT,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    `, (err) => {
                        if (err) {
                            console.log('Ошибка при создании временной таблицы warning_kicks:', err.message);
                            resolve();
                            return;
                        }
                        
                        // Копируем данные из старой таблицы (исключая поле username)
                        db.run(`
                            INSERT INTO warning_kicks_temp (id, user_id, moderator_id, reason, created_at)
                            SELECT id, user_id, moderator_id, reason, created_at FROM warning_kicks
                        `, (err) => {
                            if (err) {
                                console.log('Ошибка при копировании данных:', err.message);
                                resolve();
                                return;
                            }
                            
                            // Удаляем старую таблицу
                            db.run('DROP TABLE warning_kicks', (err) => {
                                if (err) {
                                    console.log('Ошибка при удалении старой таблицы warning_kicks:', err.message);
                                    resolve();
                                    return;
                                }
                                
                                // Переименовываем временную таблицу
                                db.run('ALTER TABLE warning_kicks_temp RENAME TO warning_kicks', (err) => {
                                    if (err) {
                                        console.log('Ошибка при переименовании таблицы warning_kicks:', err.message);
                                    } else {
                                        console.log('Таблица warning_kicks успешно исправлена');
                                    }
                                    // Проверяем таблицу bans
                                    checkBansTable();
                                });
                            });
                        });
                    });
                } else {
                    console.log('Таблица warning_kicks уже имеет правильную структуру');
                    // Проверяем таблицу bans
                    checkBansTable();
                }
            });
        }

        // Функция для проверки и исправления таблицы bans
        function checkBansTable() {
            db.all("PRAGMA table_info(bans)", (err, tableInfo) => {
                if (err) {
                    console.log('Таблица bans не существует, пропускаем обновление');
                    resolve();
                    return;
                }
                
                // Проверяем, есть ли поле username (которое не должно быть)
                const hasUsernameField = tableInfo.some(column => column.name === 'username');
                if (hasUsernameField) {
                    console.log('Обнаружено поле username в таблице bans, исправляем структуру...');
                    
                    // Создаем временную таблицу с правильной структурой
                    db.run(`
                        CREATE TABLE bans_temp (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id TEXT NOT NULL,
                            moderator_id TEXT NOT NULL,
                            reason TEXT,
                            ban_until DATETIME,
                            is_permanent BOOLEAN DEFAULT 0,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    `, (err) => {
                        if (err) {
                            console.log('Ошибка при создании временной таблицы bans:', err.message);
                            resolve();
                            return;
                        }
                        
                        // Копируем данные из старой таблицы (исключая поле username)
                        db.run(`
                            INSERT INTO bans_temp (id, user_id, moderator_id, reason, ban_until, is_permanent, created_at)
                            SELECT id, user_id, moderator_id, reason, ban_until, is_permanent, created_at FROM bans
                        `, (err) => {
                            if (err) {
                                console.log('Ошибка при копировании данных:', err.message);
                                resolve();
                                return;
                            }
                            
                            // Удаляем старую таблицу
                            db.run('DROP TABLE bans', (err) => {
                                if (err) {
                                    console.log('Ошибка при удалении старой таблицы bans:', err.message);
                                    resolve();
                                    return;
                                }
                                
                                // Переименовываем временную таблицу
                                db.run('ALTER TABLE bans_temp RENAME TO bans', (err) => {
                                    if (err) {
                                        console.log('Ошибка при переименовании таблицы bans:', err.message);
                                    } else {
                                        console.log('Таблица bans успешно исправлена');
                                    }
                                    resolve();
                                });
                            });
                        });
                    });
                } else {
                    console.log('Таблица bans уже имеет правильную структуру');
                    resolve();
                }
            });
        }
    });
};

// Инициализируем базу данных
initializeDatabase().catch(console.error);

// Функция для безопасного добавления колонки к существующей таблице
const addColumnIfNotExists = (tableName, columnName, columnDefinition) => {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (err) {
                reject(err);
                return;
            }
            
            const columnExists = columns.some(col => col.name === columnName);
            
            if (!columnExists) {
                db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`, (alterErr) => {
                    if (alterErr) {
                        console.log(`Ошибка при добавлении колонки ${columnName}:`, alterErr.message);
                    } else {
                        console.log(`Колонка ${columnName} успешно добавлена к таблице ${tableName}`);
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    });
};

// Добавляем недостающие колонки к существующим таблицам
addColumnIfNotExists('giveaways', 'image', 'TEXT').catch(console.error);
addColumnIfNotExists('giveaways', 'message_id', 'TEXT').catch(console.error);

const getSettings = async () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM settings', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                // Собираем все настройки в единый объект
                const settings = {};
                
                rows.forEach(row => {
                    try {
                        // Пытаемся распарсить JSON значение
                        const value = JSON.parse(row.value);
                        settings[row.key] = value;
                    } catch (e) {
                        // Если не JSON, сохраняем как строку
                        settings[row.key] = row.value;
                    }
                });
                
                resolve(settings);
            }
        });
    });
}

const getSettingByKey = async (key) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.value : null);
            }
        });
    });
}

const setSetting = async (key, value) => {
    return new Promise((resolve, reject) => {
        db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

const getSettingsDatabase = () => {
    return {
        findOne: () => getSettings(),
        updateOne: (filter, update) => {
            return new Promise((resolve, reject) => {
                // Проверяем, что update и update.$set существуют
                if (!update || !update.$set || typeof update.$set !== 'object') {
                    reject(new Error('Invalid update object: missing $set property'));
                    return;
                }
                
                const keys = Object.keys(update.$set);
                if (keys.length === 0) {
                    reject(new Error('Invalid update object: $set is empty'));
                    return;
                }
                
                // Обновляем каждую настройку
                const updatePromises = keys.map(key => setSetting(key, update.$set[key]));
                Promise.all(updatePromises).then(resolve).catch(reject);
            });
        }
    };
}

// Функции для работы с событиями
const getEvents = async () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM events ORDER BY created_at DESC', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

/**
 * Получает события за определенную дату
 * @param {Date} date - Дата для поиска событий
 * @returns {Promise<Array>} - Массив событий за указанную дату
 */
const getEventsByDate = async (date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM events WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC', 
            [startOfDay.toISOString(), endOfDay.toISOString()], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

/**
 * Получает участников события за определенную дату
 * @param {string} eventId - ID события
 * @param {Date} date - Дата для поиска участников
 * @returns {Promise<Array>} - Массив участников за указанную дату
 */
const getEventParticipantsByDate = async (eventId, date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM event_participants WHERE event_id = ? AND join_date >= ? AND join_date <= ? ORDER BY join_date ASC', 
            [eventId, startOfDay.toISOString(), endOfDay.toISOString()], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

const getEvent = async (id) => {
    console.log('=== GET EVENT DEBUG ===');
    console.log('Looking for event with ID:', id);
    
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM events WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.log('Database error:', err);
                reject(err);
            } else {
                console.log('Found event:', row);
                resolve(row);
            }
        });
    });
}

const getEventByName = async (name) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM events WHERE name = ?', [name], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

const createEvent = async (name, task, prize, image, rules, organizer = null) => {
    const id = cyrillicToTranslit.transform(name, "_").toLowerCase();
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO events (id, name, task, prize, image, rules, organizer) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [id, name, task, prize, image, rules, organizer], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(id);
            }
        });
    });
}

const updateEvent = async (eventId, name, task, prize, image, rules, organizer = null) => {
    return new Promise((resolve, reject) => {
        db.run('UPDATE events SET name = ?, task = ?, prize = ?, image = ?, rules = ?, organizer = ? WHERE id = ?', 
            [name, task, prize, image, rules, organizer, eventId], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(eventId);
            }
        });
    });
}

const deleteEvent = async (id) => {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM events WHERE id = ?', [id], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

const addEventParticipant = async (eventId, userId, username) => {
    return new Promise(async (resolve, reject) => {
        console.log(`=== ADD EVENT PARTICIPANT ===`);
        console.log(`Event ID: ${eventId}`);
        console.log(`User ID: ${userId}`);
        console.log(`Username: ${username}`);
        
        db.run('INSERT OR IGNORE INTO event_participants (event_id, user_id, username, join_date) VALUES (?, ?, ?, ?)', 
            [eventId, userId, username, new Date().toISOString()], async function(err) {
            if (err) {
                console.error(`❌ Error adding participant: ${err.message}`);
                reject(err);
            } else {
                const wasAdded = this.changes > 0;
                console.log(`Changes made: ${this.changes}, Was added: ${wasAdded}`);
                
                // Если участник был добавлен, обновляем Google Sheets
                if (wasAdded) {
                    try {
                        const googleSheetsManager = require('../googleSheets');
                        await googleSheetsManager.markParticipation(username);
                        console.log(`✅ Участник ${username} добавлен в Google Sheets`);
                    } catch (sheetsError) {
                        console.error(`❌ Ошибка при обновлении Google Sheets для ${username}:`, sheetsError.message);
                        // Не прерываем выполнение, если Google Sheets недоступен
                    }
                } else {
                    console.log(`⚠️ Участник ${username} уже существует в событии ${eventId}`);
                }
                
                resolve(wasAdded);
            }
        });
    });
}

const removeEventParticipant = async (eventId, userId) => {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM event_participants WHERE event_id = ? AND user_id = ?', 
            [eventId, userId], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

const getEventParticipants = async (eventId) => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM event_participants WHERE event_id = ? ORDER BY join_date ASC', 
            [eventId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

const isUserParticipating = async (eventId, userId) => {
    return new Promise((resolve, reject) => {
        console.log(`=== IS USER PARTICIPATING ===`);
        console.log(`Event ID: ${eventId}`);
        console.log(`User ID: ${userId}`);
        
        db.get('SELECT COUNT(*) as count FROM event_participants WHERE event_id = ? AND user_id = ?', 
            [eventId, userId], (err, row) => {
            if (err) {
                console.error(`❌ Error checking participation: ${err.message}`);
                reject(err);
            } else {
                const isParticipating = row.count > 0;
                console.log(`Count: ${row.count}, Is participating: ${isParticipating}`);
                resolve(isParticipating);
            }
        });
    });
}

const clearEventParticipants = async (eventId) => {
    return new Promise((resolve, reject) => {
        console.log(`=== CLEAR EVENT PARTICIPANTS ===`);
        console.log(`Event ID: ${eventId}`);
        
        db.run('DELETE FROM event_participants WHERE event_id = ?', [eventId], function(err) {
            if (err) {
                console.error(`❌ Error clearing participants: ${err.message}`);
                reject(err);
            } else {
                console.log(`✅ Cleared ${this.changes} participants for event ${eventId}`);
                resolve();
            }
        });
    });
}

const updateEventOrganizer = async (eventId, organizer) => {
    return new Promise((resolve, reject) => {
        db.run('UPDATE events SET organizer = ? WHERE id = ?', [organizer, eventId], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

const insertDefaultTemplates = async () => {
    return new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM oshka_templates', (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (row.count === 0) {
                const templates = [
                    {
                        name: 'Дерби 2.0',
                        content: '/o Уважаемые игроки, сейчас будет проведено мероприятие "Дерби 2.0".  Призовой фонд: 2.500 опыта Сезонного пропуска! Для участия введите команду /event. Напоминаю, что уход от РП, путем ухода на мероприятие - строго запрещен.'
                    },
                    {
                        name: 'Саймон говорит',
                        content: '/o Уважаемые игроки, сейчас будет проведено мероприятие "Саймон говорит".  Призовой фонд: 2.000 опыта Сезонного пропуска! Для участия введите команду /event. Напоминаю, что уход от РП, путем ухода на мероприятие - строго запрещен.'
                    },
                    {
                        name: 'Музыкальные стулья',
                        content: '/o Уважаемые игроки, сейчас будет проведено мероприятие "Музыкальные стулья".  Призовой фонд: 2.000 опыта Сезонного пропуска! Для участия введите команду /event. Напоминаю, что уход от РП, путем ухода на мероприятие - строго запрещен.'
                    },
                    {
                        name: 'Правда или ложь',
                        content: '/o Уважаемые игроки, сейчас будет проведено мероприятие "Правда или ложь".  Призовой фонд: 2.000 опыта Сезонного пропуска! Для участия введите команду /event. Напоминаю, что уход от РП, путем ухода на мероприятие - строго запрещен.'
                    },
                    {
                        name: 'Смертельный спуск',
                        content: '/o Уважаемые игроки, сейчас будет проведено мероприятие "Смертельный спуск".  Призовой фонд: 2.000 опыта Сезонного пропуска! Для участия введите команду /event. Напоминаю, что уход от РП, путем ухода на мероприятие - строго запрещен.'
                    },
                    {
                        name: 'Русская рулетка',
                        content: '/o Уважаемые игроки, сейчас будет проведено мероприятие "Русская рулетка".  Призовой фонд: 1.500 опыта Сезонного пропуска! Для участия введите команду /event. Напоминаю, что уход от РП, путем ухода на мероприятие - строго запрещен.'
                    },
                    {
                        name: 'Маньяк',
                        content: '/o Уважаемые игроки, сейчас будет проведено мероприятие "Маньяк".  Призовой фонд: 2.500 опыта Сезонного пропуска! Для участия введите команду /event. Напоминаю, что уход от РП, путем ухода на мероприятие - строго запрещен.'
                    },
                    {
                        name: 'Догони меня',
                        content: '/o Уважаемые игроки, сейчас будет проведено мероприятие "Догони меня".  Призовой фонд: 2.000 опыта Сезонного пропуска! Для участия введите команду /event. Напоминаю, что уход от РП, путем ухода на мероприятие - строго запрещен.'
                    },
                    {
                        name: 'Бойцовский клуб',
                        content: '/o Уважаемые игроки, сейчас будет проведено мероприятие "Бойцовский клуб".  Призовой фонд: 1.500 опыта Сезонного пропуска! Для участия введите команду /event. Напоминаю, что уход от РП, путем ухода на мероприятие - строго запрещен.'
                    },
                    {
                        name: 'Тише едешь - дальше будешь',
                        content: '/o Уважаемые игроки, сейчас будет проведено мероприятие "Тише едешь - дальше будешь".  Призовой фонд: 2.000 опыта Сезонного пропуска! Для участия введите команду /event. Напоминаю, что уход от РП, путем ухода на мероприятие - строго запрещен.'
                    }
                ];
                
                const stmt = db.prepare('INSERT INTO oshka_templates (name, content) VALUES (?, ?)');
                templates.forEach(template => {
                    stmt.run([template.name, template.content]);
                });
                stmt.finalize((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    });
}

const getOshkaTemplates = async () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM oshka_templates ORDER BY id ASC', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Функция для получения шаблонов с ограничением для Discord.js (максимум 25 опций)
const getOshkaTemplatesLimited = async () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM oshka_templates ORDER BY id ASC', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                // Discord.js ограничивает количество опций максимум 25
                if (rows.length > 25) {
                    console.warn(`⚠️ ВНИМАНИЕ: Количество шаблонов Ошки (${rows.length}) превышает лимит Discord.js (25 опций).`);
                    console.warn(`📋 Отображаются только первые 25 шаблонов. Остальные ${rows.length - 25} шаблонов скрыты.`);
                    console.warn(`💡 Рекомендуется удалить неиспользуемые шаблоны или реализовать пагинацию.`);
                    rows = rows.slice(0, 25); // Оставляем только первые 25
                }
                resolve(rows);
            }
        });
    });
}

const addOshkaTemplate = async (name, content) => {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO oshka_templates (name, content) VALUES (?, ?)', [name, content], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

const deleteOshkaTemplate = async (id) => {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM oshka_templates WHERE id = ?', [id], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

const updateOshkaTemplate = async (id, name, content) => {
    return new Promise((resolve, reject) => {
        db.run('UPDATE oshka_templates SET name = ?, content = ? WHERE id = ?', [name, content, id], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

async function connectDatabase() {
    // SQLite не требует подключения, база данных уже готова к использованию
    return db;
}

// Функции для работы с розыгрышами
const createGiveaway = async (prize, spots, endDate, createdBy, image = null) => {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO giveaways (prize, spots, end_date, created_by, image) VALUES (?, ?, ?, ?, ?)', 
            [prize, spots, endDate, createdBy, image], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
}

const getActiveGiveaways = async () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM giveaways WHERE is_active = 1 ORDER BY created_at DESC', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

const getGiveawayById = async (id) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM giveaways WHERE id = ?', [id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

const deactivateGiveaway = async (id) => {
    return new Promise((resolve, reject) => {
        db.run('UPDATE giveaways SET is_active = 0 WHERE id = ?', [id], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Функции для работы с участниками розыгрышей
const addGiveawayParticipant = async (giveawayId, userId, username) => {
    return new Promise((resolve, reject) => {
        db.run('INSERT OR IGNORE INTO giveaway_participants (giveaway_id, user_id, username) VALUES (?, ?, ?)', 
            [giveawayId, userId, username], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes > 0); // Возвращаем true, если участник был добавлен
            }
        });
    });
}

const removeGiveawayParticipant = async (giveawayId, userId) => {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM giveaway_participants WHERE giveaway_id = ? AND user_id = ?', 
            [giveawayId, userId], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

const getGiveawayParticipants = async (giveawayId) => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM giveaway_participants WHERE giveaway_id = ? ORDER BY join_date ASC', 
            [giveawayId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

const isUserInGiveaway = async (giveawayId, userId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM giveaway_participants WHERE giveaway_id = ? AND user_id = ?', 
            [giveawayId, userId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row.count > 0);
            }
        });
    });
}

const updateGiveawayMessageId = async (giveawayId, messageId) => {
    return new Promise((resolve, reject) => {
        db.run('UPDATE giveaways SET message_id = ? WHERE id = ?', [messageId, giveawayId], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Получить канал панели управления маппингом
const getMappingPanelChannel = async () => {
    try {
        const settings = await getSettings();
        const channels = settings?.channels || {};
        return channels.mappingPanel || null;
    } catch (error) {
        console.error('Ошибка при получении канала панели управления маппингом:', error);
        return null;
    }
};

// Проверить, может ли пользователь удалять маппинги
const canUserDeleteMappings = async (member) => {
    try {
        const settings = await getSettings();
        const roles = settings?.roles || {};
        const canDeleteMappingsRoles = roles.canDeleteMappings || [];
        
        // Если роли не настроены, только администраторы могут удалять
        if (canDeleteMappingsRoles.length === 0) {
            return member.permissions.has('Administrator');
        }
        
        // Проверяем, есть ли у пользователя одна из разрешенных ролей
        const hasRole = member.roles.cache.some(role => canDeleteMappingsRoles.includes(role.id));
        
        // Также проверяем права администратора
        return hasRole || member.permissions.has('Administrator');
    } catch (error) {
        console.error('Ошибка при проверке прав на удаление маппингов:', error);
        return false;
    }
};

// Сохранить маппинги ников в базу данных
const saveNicknameMappings = async (mappings) => {
    return new Promise((resolve, reject) => {
        const mappingsJson = JSON.stringify(mappings);
        db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', 
            ['nickname_mappings', mappingsJson], function(err) {
            if (err) {
                reject(err);
            } else {
                console.log(`✅ Сохранено ${Object.keys(mappings).length} маппингов в базу данных`);
                resolve();
            }
        });
    });
};

// Загрузить маппинги ников из базы данных
const loadNicknameMappings = async () => {
    return new Promise((resolve, reject) => {
        db.get('SELECT value FROM settings WHERE key = ?', ['nickname_mappings'], (err, row) => {
            if (err) {
                reject(err);
            } else {
                if (row && row.value) {
                    try {
                        const mappings = JSON.parse(row.value);
                        console.log(`✅ Загружено ${Object.keys(mappings).length} маппингов из базы данных`);
                        resolve(mappings);
                    } catch (parseError) {
                        console.error('Ошибка при парсинге маппингов:', parseError);
                        resolve({});
                    }
                } else {
                    console.log('📋 Маппинги не найдены в базе данных, используем пустой объект');
                    resolve({});
                }
            }
        });
    });
};

// Функции для модерации

// Принудительно исправить структуру таблицы warnings
const fixWarningsTable = async () => {
    return new Promise((resolve, reject) => {
        db.all("PRAGMA table_info(warnings)", (err, tableInfo) => {
            if (err) {
                reject(new Error('Таблица warnings не существует'));
                return;
            }
            
            // Проверяем, есть ли поле username (которое не должно быть)
            const hasUsernameField = tableInfo.some(column => column.name === 'username');
            if (hasUsernameField) {
                console.log('Обнаружено поле username в таблице warnings, исправляем структуру...');
                
                // Создаем временную таблицу с правильной структурой
                db.run(`
                    CREATE TABLE warnings_temp (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        moderator_id TEXT NOT NULL,
                        reason TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => {
                    if (err) {
                        reject(new Error(`Ошибка при создании временной таблицы warnings: ${err.message}`));
                        return;
                    }
                    
                    // Копируем данные из старой таблицы (исключая поле username)
                    db.run(`
                        INSERT INTO warnings_temp (id, user_id, moderator_id, reason, created_at)
                        SELECT id, user_id, moderator_id, reason, created_at FROM warnings
                    `, (err) => {
                        if (err) {
                            reject(new Error(`Ошибка при копировании данных: ${err.message}`));
                            return;
                        }
                        
                        // Удаляем старую таблицу
                        db.run('DROP TABLE warnings', (err) => {
                            if (err) {
                                reject(new Error(`Ошибка при удалении старой таблицы warnings: ${err.message}`));
                                return;
                            }
                            
                            // Переименовываем временную таблицу
                            db.run('ALTER TABLE warnings_temp RENAME TO warnings', (err) => {
                                if (err) {
                                    reject(new Error(`Ошибка при переименовании таблицы warnings: ${err.message}`));
                                } else {
                                    console.log('Таблица warnings успешно исправлена');
                                    resolve();
                                }
                            });
                        });
                    });
                });
            } else {
                console.log('Таблица warnings уже имеет правильную структуру');
                resolve();
            }
        });
    });
};

// Принудительно исправить структуру таблицы warning_kicks
const fixWarningKicksTable = async () => {
    return new Promise((resolve, reject) => {
        db.all("PRAGMA table_info(warning_kicks)", (err, tableInfo) => {
            if (err) {
                reject(new Error('Таблица warning_kicks не существует'));
                return;
            }
            
            // Проверяем, есть ли поле username (которое не должно быть)
            const hasUsernameField = tableInfo.some(column => column.name === 'username');
            if (hasUsernameField) {
                console.log('Обнаружено поле username в таблице warning_kicks, исправляем структуру...');
                
                // Создаем временную таблицу с правильной структурой
                db.run(`
                    CREATE TABLE warning_kicks_temp (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        moderator_id TEXT NOT NULL,
                        reason TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => {
                    if (err) {
                        reject(new Error(`Ошибка при создании временной таблицы warning_kicks: ${err.message}`));
                        return;
                    }
                    
                    // Копируем данные из старой таблицы (исключая поле username)
                    db.run(`
                        INSERT INTO warning_kicks_temp (id, user_id, moderator_id, reason, created_at)
                        SELECT id, user_id, moderator_id, reason, created_at FROM warning_kicks
                    `, (err) => {
                        if (err) {
                            reject(new Error(`Ошибка при копировании данных: ${err.message}`));
                            return;
                        }
                        
                        // Удаляем старую таблицу
                        db.run('DROP TABLE warning_kicks', (err) => {
                            if (err) {
                                reject(new Error(`Ошибка при удалении старой таблицы warning_kicks: ${err.message}`));
                                return;
                            }
                            
                            // Переименовываем временную таблицу
                            db.run('ALTER TABLE warning_kicks_temp RENAME TO warning_kicks', (err) => {
                                if (err) {
                                    reject(new Error(`Ошибка при переименовании таблицы warning_kicks: ${err.message}`));
                                } else {
                                    console.log('Таблица warning_kicks успешно исправлена');
                                    resolve();
                                }
                            });
                        });
                    });
                });
            } else {
                console.log('Таблица warning_kicks уже имеет правильную структуру');
                resolve();
            }
        });
    });
};

// Принудительно исправить структуру таблицы bans
const fixBansTable = async () => {
    return new Promise((resolve, reject) => {
        db.all("PRAGMA table_info(bans)", (err, tableInfo) => {
            if (err) {
                reject(new Error('Таблица bans не существует'));
                return;
            }
            
            // Проверяем, есть ли поле username (которое не должно быть)
            const hasUsernameField = tableInfo.some(column => column.name === 'username');
            if (hasUsernameField) {
                console.log('Обнаружено поле username в таблице bans, исправляем структуру...');
                
                // Создаем временную таблицу с правильной структурой
                db.run(`
                    CREATE TABLE bans_temp (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        moderator_id TEXT NOT NULL,
                        reason TEXT,
                        ban_until DATETIME,
                        is_permanent BOOLEAN DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => {
                    if (err) {
                        reject(new Error(`Ошибка при создании временной таблицы bans: ${err.message}`));
                        return;
                    }
                    
                    // Копируем данные из старой таблицы (исключая поле username)
                    db.run(`
                        INSERT INTO bans_temp (id, user_id, moderator_id, reason, ban_until, is_permanent, created_at)
                        SELECT id, user_id, moderator_id, reason, ban_until, is_permanent, created_at FROM bans
                    `, (err) => {
                        if (err) {
                            reject(new Error(`Ошибка при копировании данных: ${err.message}`));
                            return;
                        }
                        
                        // Удаляем старую таблицу
                        db.run('DROP TABLE bans', (err) => {
                            if (err) {
                                reject(new Error(`Ошибка при удалении старой таблицы bans: ${err.message}`));
                                return;
                            }
                            
                            // Переименовываем временную таблицу
                            db.run('ALTER TABLE bans_temp RENAME TO bans', (err) => {
                                if (err) {
                                    reject(new Error(`Ошибка при переименовании таблицы bans: ${err.message}`));
                                } else {
                                    console.log('Таблица bans успешно исправлена');
                                    resolve();
                                }
                            });
                        });
                    });
                });
            } else {
                console.log('Таблица bans уже имеет правильную структуру');
                resolve();
            }
        });
    });
};

// Добавить предупреждение пользователю
const addWarning = async (userId, moderatorId, reason) => {
    return new Promise(async (resolve, reject) => {
        try {
            // Сначала проверяем и исправляем структуру таблицы, если нужно
            await fixWarningsTable();
            
            // Теперь добавляем предупреждение
            db.run('INSERT INTO warnings (user_id, moderator_id, reason) VALUES (?, ?, ?)', 
                [userId, moderatorId, reason], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        } catch (error) {
            reject(error);
        }
    });
};

// Получить количество предупреждений пользователя
const getWarningCount = async (userId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM warnings WHERE user_id = ?', [userId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.count : 0);
            }
        });
    });
};

// Получить все предупреждения пользователя
const getUserWarnings = async (userId) => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM warnings WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows || []);
            }
        });
    });
};

// Добавить кик по предупреждениям
const addWarningKick = async (userId, moderatorId, reason) => {
    return new Promise(async (resolve, reject) => {
        try {
            // Сначала проверяем и исправляем структуру таблицы, если нужно
            await fixWarningKicksTable();
            
            // Теперь добавляем кик
            db.run('INSERT INTO warning_kicks (user_id, moderator_id, reason) VALUES (?, ?, ?)', 
                [userId, moderatorId, reason], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        } catch (error) {
            reject(error);
        }
    });
};

// Забанить пользователя
const banUser = async (userId, moderatorId, reason, days = 0) => {
    return new Promise((resolve, reject) => {
        // Сначала проверяем и исправляем структуру таблицы, если нужно
        fixBansTable().then(() => {
            // Проверяем структуру таблицы перед добавлением
            db.all("PRAGMA table_info(bans)", (err, tableInfo) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const columns = tableInfo.map(col => col.name);
                
                // Проверяем наличие всех необходимых колонок
                if (!columns.includes('is_permanent') || !columns.includes('ban_until')) {
                    console.log('В таблице bans отсутствуют необходимые колонки, обновляем структуру...');
                    updateExistingTables().then(() => {
                        executeBanInsert();
                    }).catch(reject);
                } else {
                    executeBanInsert();
                }
            });
            
            function executeBanInsert() {
                const banUntil = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;
                const isPermanent = days === 0 ? 1 : 0;
                
                const query = `
                    INSERT INTO bans (user_id, moderator_id, reason, ban_until, is_permanent, created_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                `;
                
                db.run(query, [userId, moderatorId, reason, banUntil, isPermanent], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                });
            }
        }).catch((error) => {
            reject(error);
        });
    });
};

// Получить информацию о бане пользователя
const getUserBanInfo = async (userId) => {
    return new Promise((resolve, reject) => {
        // Проверяем структуру таблицы
        db.all("PRAGMA table_info(bans)", (err, tableInfo) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Проверяем, что tableInfo существует и является массивом
            if (!tableInfo || !Array.isArray(tableInfo) || tableInfo.length === 0) {
                console.log('Таблица bans пуста или не содержит колонок, пропускаем обновление');
                executeBanInfoQuery();
                return;
            }
            
            const columns = tableInfo.map(col => col.name);
            
            // Проверяем наличие всех необходимых колонок
            if (!columns.includes('is_permanent') || !columns.includes('ban_until')) {
                console.log('В таблице bans отсутствуют необходимые колонки, обновляем структуру...');
                updateExistingTables().then(() => {
                    executeBanInfoQuery();
                }).catch(reject);
            } else {
                executeBanInfoQuery();
            }
        });
        
        function executeBanInfoQuery() {
            db.get('SELECT * FROM bans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        }
    });
};

// Получить статистику модерации пользователя
const getUserModerationStats = async (userId) => {
    return new Promise((resolve, reject) => {
        // Проверяем структуру таблицы bans
        db.all("PRAGMA table_info(bans)", (err, tableInfo) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Проверяем, что tableInfo существует и является массивом
            if (!tableInfo || !Array.isArray(tableInfo) || tableInfo.length === 0) {
                console.log('Таблица bans пуста или не содержит колонок, пропускаем обновление');
                executeStatsQuery();
                return;
            }
            
            const columns = tableInfo.map(col => col.name);
            
            // Проверяем наличие всех необходимых колонок
            if (!columns.includes('is_permanent') || !columns.includes('ban_until')) {
                console.log('В таблице bans отсутствуют необходимые колонки, обновляем структуру...');
                updateExistingTables().then(() => {
                    executeStatsQuery();
                }).catch(reject);
            } else {
                executeStatsQuery();
            }
        });
        
        function executeStatsQuery() {
            db.get(`
                SELECT 
                    (SELECT COUNT(*) FROM warnings WHERE user_id = ?) as warning_count,
                    (SELECT COUNT(*) FROM bans WHERE user_id = ?) as ban_count,
                    (SELECT COUNT(*) FROM warning_kicks WHERE user_id = ?) as kick_count,
                    (SELECT created_at FROM warning_kicks WHERE user_id = ? ORDER BY created_at DESC LIMIT 1) as last_kick_date
            `, [userId, userId, userId, userId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        warningCount: row ? row.warning_count : 0,
                        banCount: row ? row.ban_count : 0,
                        kickCount: row ? row.kick_count : 0,
                        lastKickDate: row ? row.last_kick_date : null
                    });
                }
            });
        }
    });
};

// Проверить, забанен ли пользователь
const isUserBanned = async (userId) => {
    return new Promise((resolve, reject) => {
        // Сначала проверяем структуру таблицы
        db.all("PRAGMA table_info(bans)", (err, tableInfo) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Проверяем, что tableInfo существует и является массивом
            if (!tableInfo || !Array.isArray(tableInfo) || tableInfo.length === 0) {
                console.log('Таблица bans пуста или не содержит колонок, пропускаем обновление');
                executeBanCheck();
                return;
            }
            
            const columns = tableInfo.map(col => col.name);
            
            // Проверяем наличие всех необходимых колонок
            if (!columns.includes('is_permanent') || !columns.includes('ban_until')) {
                console.log('В таблице bans отсутствуют необходимые колонки, обновляем структуру...');
                updateExistingTables().then(() => {
                    executeBanCheck();
                }).catch(reject);
            } else {
                executeBanCheck();
            }
        });
        
        function executeBanCheck() {
            db.get('SELECT * FROM bans WHERE user_id = ? AND (is_permanent = 1 OR ban_until > datetime("now")) ORDER BY created_at DESC LIMIT 1', [userId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        }
    });
};

// Снять последнее предупреждение пользователя
const removeLastWarning = async (userId) => {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM warnings WHERE id = (SELECT id FROM warnings WHERE user_id = ? ORDER BY created_at DESC LIMIT 1)', 
            [userId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes > 0);
            }
        });
    });
};

// Снять конкретное предупреждение по ID
const removeWarningById = async (warningId) => {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM warnings WHERE id = ?', [warningId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes > 0);
            }
        });
    });
};

// Разбанить пользователя
const unbanUser = async (userId) => {
    return new Promise((resolve, reject) => {
        // Проверяем структуру таблицы
        db.all("PRAGMA table_info(bans)", (err, tableInfo) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Проверяем, что tableInfo существует и является массивом
            if (!tableInfo || !Array.isArray(tableInfo) || tableInfo.length === 0) {
                console.log('Таблица bans пуста или не содержит колонок, пропускаем обновление');
                executeUnbanQuery();
                return;
            }
            
            const columns = tableInfo.map(col => col.name);
            
            // Проверяем наличие всех необходимых колонок
            if (!columns.includes('is_permanent') || !columns.includes('ban_until')) {
                console.log('В таблице bans отсутствуют необходимые колонки, обновляем структуру...');
                updateExistingTables().then(() => {
                    executeUnbanQuery();
                }).catch(reject);
            } else {
                executeUnbanQuery();
            }
        });
        
        function executeUnbanQuery() {
            db.run('UPDATE bans SET ban_until = datetime("now") WHERE user_id = ? AND (is_permanent = 1 OR ban_until > datetime("now"))', 
                [userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        }
    });
};

// Получить все активные баны пользователя
const getActiveBans = async (userId) => {
    return new Promise((resolve, reject) => {
        // Проверяем структуру таблицы
        db.all("PRAGMA table_info(bans)", (err, tableInfo) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Проверяем, что tableInfo существует и является массивом
            if (!tableInfo || !Array.isArray(tableInfo) || tableInfo.length === 0) {
                console.log('Таблица bans пуста или не содержит колонок, пропускаем обновление');
                executeActiveBansQuery();
                return;
            }
            
            const columns = tableInfo.map(col => col.name);
            
            // Проверяем наличие всех необходимых колонок
            if (!columns.includes('is_permanent') || !columns.includes('ban_until')) {
                console.log('В таблице bans отсутствуют необходимые колонки, обновляем структуру...');
                updateExistingTables().then(() => {
                    executeActiveBansQuery();
                }).catch(reject);
            } else {
                executeActiveBansQuery();
            }
        });
        
        function executeActiveBansQuery() {
            db.all('SELECT * FROM bans WHERE user_id = ? AND (is_permanent = 1 OR ban_until > datetime("now")) ORDER BY created_at DESC', 
                [userId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        }
    });
};

module.exports = {
    connectDatabase, 
    getSettings, 
    getSettingByKey, 
    setSetting, 
    getSettingsDatabase, 
    getEvents, 
    getEventsByDate,
    createEvent, 
    updateEvent, 
    getEvent, 
    getEventByName, 
    deleteEvent, 
    addEventParticipant, 
    removeEventParticipant, 
    getEventParticipants, 
    getEventParticipantsByDate,
    isUserParticipating, 
    clearEventParticipants, 
    updateEventOrganizer, 
    getOshkaTemplates, 
    getOshkaTemplatesLimited,
    addOshkaTemplate, 
    deleteOshkaTemplate, 
    updateOshkaTemplate, 
    createGiveaway, 
    getActiveGiveaways, 
    getGiveawayById, 
    deactivateGiveaway, 
    addColumnIfNotExists, 
    addGiveawayParticipant, 
    removeGiveawayParticipant, 
    getGiveawayParticipants, 
    isUserInGiveaway, 
    updateGiveawayMessageId,
    getMappingPanelChannel,
    saveNicknameMappings,
    loadNicknameMappings,
    canUserDeleteMappings,
    addWarning,
    getWarningCount,
    getUserWarnings,
    addWarningKick,
    banUser,
    getUserBanInfo,
    getUserModerationStats,
    isUserBanned,
    removeLastWarning,
    removeWarningById,
    unbanUser,
    getActiveBans,
    updateExistingTables,
    fixWarningsTable,
    fixWarningKicksTable,
    fixBansTable
}