const { google } = require('googleapis');
const { log } = require('./data/utils');
const { saveNicknameMappings, loadNicknameMappings } = require('./data/DataBase');

class GoogleSheetsManager {
    constructor() {
        this.auth = null;
        this.sheets = null;
        this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
        
        // Инициализируем пустой маппинг ников
        this.nicknameMapping = {};
        
        this.initializeAuth();
        // Загружаем маппинги синхронно при инициализации
        this.loadMappingsFromDatabaseSync();
        
        // Дополнительная проверка через небольшую задержку
        setTimeout(() => {
            if (Object.keys(this.nicknameMapping).length === 0) {
                log('No mappings loaded, trying async load...');
                this.loadMappingsFromDatabase();
            }
        }, 1000);
    }

    async initializeAuth() {
        try {
            // Проверяем, есть ли необходимые переменные окружения
            if (!process.env.GOOGLE_SPREADSHEET_ID) {
                log('Warning: GOOGLE_SPREADSHEET_ID not set');
                return;
            }

            // Инициализация аутентификации через Service Account
            this.auth = new google.auth.GoogleAuth({
                keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || './google-credentials.json',
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            this.sheets = google.sheets({ version: 'v4', auth: this.auth });
            log('Google Sheets API initialized successfully');
        } catch (error) {
            log(`Error initializing Google Sheets API: ${error.message}`);
        }
    }

    // Получить текущую дату в формате DD.MM
    getCurrentDate() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}`;
    }

    // Преобразовать Discord ник в ник для Google Sheets
    async mapNickname(discordNickname) {
        // Убеждаемся, что маппинги загружены
        if (Object.keys(this.nicknameMapping).length === 0) {
            await this.loadMappingsFromDatabase();
        }
        return this.nicknameMapping[discordNickname] || discordNickname;
    }

    // Добавить новый маппинг ник
    async addNicknameMapping(discordNickname, sheetsNickname) {
        this.nicknameMapping[discordNickname] = sheetsNickname;
        log(`Added nickname mapping: ${discordNickname} -> ${sheetsNickname}`);
        await this.saveMappingsToDatabase();
    }

    // Удалить маппинг ник
    async removeNicknameMapping(discordNickname) {
        if (this.nicknameMapping[discordNickname]) {
            const sheetsNickname = this.nicknameMapping[discordNickname];
            delete this.nicknameMapping[discordNickname];
            log(`Removed nickname mapping: ${discordNickname} -> ${sheetsNickname}`);
            await this.saveMappingsToDatabase();
            return sheetsNickname;
        }
        return null;
    }

    // Загрузить маппинги из базы данных (синхронно)
    loadMappingsFromDatabaseSync() {
        try {
            const fs = require('fs');
            const path = require('path');
            // Используем абсолютный путь для корректной работы в Docker контейнере
            const dbPath = path.resolve(__dirname, 'data', '../../database.sqlite');
            console.log('GoogleSheets database path:', dbPath);
            
            if (fs.existsSync(dbPath)) {
                const sqlite3 = require('sqlite3').verbose();
                const db = new sqlite3.Database(dbPath, (err) => {
                    if (err) {
                        log(`Error opening database in loadMappingsFromDatabaseSync: ${err.message}`);
                        log(`Database path: ${dbPath}`);
                        log(`Current working directory: ${process.cwd()}`);
                        log(`__dirname: ${__dirname}`);
                        return;
                    }
                    
                    // Используем асинхронный метод для получения данных
                    db.get('SELECT value FROM settings WHERE key = ?', ['nickname_mappings'], (err, row) => {
                        if (err) {
                            log(`Error loading mappings from database (sync): ${err.message}`);
                        } else if (row && row.value) {
                            try {
                                const mappings = JSON.parse(row.value);
                                this.nicknameMapping = { ...this.nicknameMapping, ...mappings };
                                log(`Loaded ${Object.keys(mappings).length} mappings from database (sync)`);
                            } catch (parseError) {
                                log(`Error parsing mappings: ${parseError.message}`);
                            }
                        }
                        db.close();
                    });
                });
            } else {
                log(`Database file not found at: ${dbPath}`);
                log(`Current working directory: ${process.cwd()}`);
                log(`__dirname: ${__dirname}`);
            }
        } catch (error) {
            log(`Error loading mappings from database (sync): ${error.message}`);
        }
    }

    // Загрузить маппинги из базы данных (асинхронно)
    async loadMappingsFromDatabase() {
        try {
            const mappings = await loadNicknameMappings();
            this.nicknameMapping = { ...this.nicknameMapping, ...mappings };
            log(`Loaded ${Object.keys(mappings).length} mappings from database`);
        } catch (error) {
            log(`Error loading mappings from database: ${error.message}`);
        }
    }

    // Сохранить маппинги в базу данных
    async saveMappingsToDatabase() {
        try {
            await saveNicknameMappings(this.nicknameMapping);
        } catch (error) {
            log(`Error saving mappings to database: ${error.message}`);
        }
    }

    // Получить все маппинги ников
    getNicknameMappings() {
        log(`Returning ${Object.keys(this.nicknameMapping).length} mappings`);
        return this.nicknameMapping;
    }

    // Принудительно перезагрузить маппинги из базы данных
    async reloadMappings() {
        try {
            const mappings = await loadNicknameMappings();
            this.nicknameMapping = mappings;
            log(`Reloaded ${Object.keys(mappings).length} mappings from database`);
            return mappings;
        } catch (error) {
            log(`Error reloading mappings: ${error.message}`);
            return {};
        }
    }

    // Проверить состояние инициализации
    isInitialized() {
        return !!(this.sheets && this.spreadsheetId);
    }

    // Получить статус инициализации
    getInitializationStatus() {
        return {
            sheets: !!this.sheets,
            spreadsheetId: !!this.spreadsheetId,
            auth: !!this.auth,
            isReady: this.isInitialized()
        };
    }

    // Найти колонку и строку с датой
    async findDateInfo(date) {
        try {
            // Проверяем больше строк для поиска даты в разных месяцах
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'A1:AH50', // Проверяем первые 50 строк для поиска даты
            });

            const values = response.data.values;
            if (!values || values.length === 0) {
                log('No data found in spreadsheet');
                return null;
            }

            log(`Searching for date ${date} in ${values.length} rows...`);
            
            // Ищем дату во всех строках
            for (let rowIndex = 0; rowIndex < values.length; rowIndex++) {
                const row = values[rowIndex];
                const dateIndex = row.findIndex(cell => cell === date);
                
                if (dateIndex !== -1) {
                    // Конвертируем индекс в букву колонки (A, B, C, etc.)
                    const columnLetter = this.indexToColumnLetter(dateIndex);
                    log(`Found date ${date} at column ${columnLetter} (index ${dateIndex}) in row ${rowIndex + 1}`);
                    return {
                        column: columnLetter,
                        row: rowIndex + 1,
                        columnIndex: dateIndex
                    };
                }
            }

            log(`Date ${date} not found in any row`);
            return null;
        } catch (error) {
            log(`Error finding date info: ${error.message}`);
            return null;
        }
    }

    // Конвертировать индекс в букву колонки
    indexToColumnLetter(index) {
        let result = '';
        while (index >= 0) {
            result = String.fromCharCode(65 + (index % 26)) + result;
            index = Math.floor(index / 26) - 1;
        }
        return result;
    }

    // Найти информацию об участнике в конкретной строке (где находится дата)
    async findParticipantInfoInRow(nickname, dateRow) {
        try {
            // Получаем данные только для строки с датой
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `A${dateRow}:A${dateRow + 50}`, // Проверяем 50 строк начиная со строки с датой
            });

            const values = response.data.values;
            if (!values || values.length === 0) {
                log(`No data found in row ${dateRow} and below`);
                return null;
            }

            log(`Searching for participant ${nickname} in rows starting from ${dateRow}`);

            // Сначала пробуем найти оригинальный ник
            let nicknameIndex = values.findIndex(row => row[0] === nickname);
            
            // Если не найден, пробуем найти через маппинг
            if (nicknameIndex === -1) {
                const mappedNickname = await this.mapNickname(nickname);
                if (mappedNickname !== nickname) {
                    log(`Trying mapped nickname: ${nickname} -> ${mappedNickname}`);
                    nicknameIndex = values.findIndex(row => row[0] === mappedNickname);
                }
            }
            
            if (nicknameIndex === -1) {
                const mappedNickname = await this.mapNickname(nickname);
            log(`Participant ${nickname} (mapped: ${mappedNickname}) not found in rows starting from ${dateRow}`);
                return null;
            }

            const actualRow = dateRow + nicknameIndex;
            log(`Found participant ${nickname} at row ${actualRow}`);
            return {
                row: actualRow,
                rowIndex: nicknameIndex
            };
        } catch (error) {
            log(`Error finding participant info in row: ${error.message}`);
            return null;
        }
    }

    // Отметить участие участника на определенную дату
    async markParticipation(nickname, date = null) {
        try {
            if (!this.isInitialized()) {
                log('Google Sheets not initialized');
                return false;
            }

            const targetDate = date || this.getCurrentDate();
            log(`Marking participation for ${nickname} on ${targetDate}`);

            // Сначала ищем дату в таблице
            const dateInfo = await this.findDateInfo(targetDate);
            if (!dateInfo) {
                log(`Could not find date ${targetDate} in spreadsheet`);
                return false;
            }

            log(`Found date ${targetDate} at column ${dateInfo.column}, row ${dateInfo.row}`);

            // Затем ищем участника в строке с датой и ниже
            const participantInfo = await this.findParticipantInfoInRow(nickname, dateInfo.row);
            if (!participantInfo) {
                log(`Could not find participant ${nickname} in rows starting from ${dateInfo.row}`);
                return false;
            }

            // Получаем текущее значение в ячейке
            const range = `${dateInfo.column}${participantInfo.row}`;
            let currentValue = 0;
            
            try {
                const currentResponse = await this.sheets.spreadsheets.values.get({
                    spreadsheetId: this.spreadsheetId,
                    range: range,
                });

                const currentValues = currentResponse.data.values;
                if (currentValues && currentValues.length > 0 && currentValues[0][0]) {
                    const parsedValue = parseInt(currentValues[0][0]);
                    if (!isNaN(parsedValue)) {
                        currentValue = parsedValue;
                    }
                }
            } catch (getError) {
                log(`Could not get current value for ${range}, assuming 0: ${getError.message}`);
            }

            // Увеличиваем значение на 1
            const newValue = currentValue + 1;
            log(`Current value: ${currentValue}, new value: ${newValue} for ${range}`);

            // Обновляем ячейку с новым значением
            const updateResponse = await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [[newValue]]
                }
            });

            log(`Update response: ${JSON.stringify(updateResponse.data)}`);
            log(`Successfully marked participation for ${nickname} on ${targetDate} at ${range} (value: ${newValue})`);
            return true;
        } catch (error) {
            log(`Error marking participation: ${error.message}`);
            log(`Error details: ${JSON.stringify(error)}`);
            return false;
        }
    }

    // Отметить участие нескольких участников на текущую дату
    async markMultipleParticipation(nicknames, date = null) {
        const results = [];
        for (const nickname of nicknames) {
            const success = await this.markParticipation(nickname, date);
            results.push({ nickname, success });
        }
        return results;
    }

    // Получить список всех участников из таблицы
    async getAllParticipants() {
        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'A:A',
            });

            const values = response.data.values;
            if (!values || values.length === 0) {
                return [];
            }

            // Фильтруем пустые строки и заголовки
            const participants = values
                .map(row => row[0])
                .filter(cell => cell && cell !== 'НИК' && cell !== 'total / den')
                .filter(cell => cell.trim() !== '');

            return participants;
        } catch (error) {
            log(`Error getting participants: ${error.message}`);
            return [];
        }
    }

    // Получить список участников для конкретной даты
    async getParticipantsForDate(date) {
        try {
            const dateInfo = await this.findDateInfo(date);
            if (!dateInfo) {
                log(`Could not find date ${date} in spreadsheet`);
                return [];
            }

            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `A${dateInfo.row}:A${dateInfo.row + 50}`,
            });

            const values = response.data.values;
            if (!values || values.length === 0) {
                return [];
            }

            // Фильтруем пустые строки и заголовки
            const participants = values
                .map(row => row[0])
                .filter(cell => cell && cell !== 'НИК' && cell !== 'total / den')
                .filter(cell => cell.trim() !== '');

            return participants;
        } catch (error) {
            log(`Error getting participants for date: ${error.message}`);
            return [];
        }
    }

    // Проверить, участвовал ли участник в определенную дату
    async checkParticipation(nickname, date = null) {
        try {
            const targetDate = date || this.getCurrentDate();
            const dateInfo = await this.findDateInfo(targetDate);
            
            if (!dateInfo) {
                return false;
            }

            const participantInfo = await this.findParticipantInfoInRow(nickname, dateInfo.row);
            if (!participantInfo) {
                return false;
            }

            const range = `${dateInfo.column}${participantInfo.row}`;
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: range,
            });

            const values = response.data.values;
            if (!values || values.length === 0 || !values[0][0]) {
                return false;
            }

            const participationCount = parseInt(values[0][0]);
            return !isNaN(participationCount) && participationCount > 0;
        } catch (error) {
            log(`Error checking participation: ${error.message}`);
            return false;
        }
    }

    // Получить количество участий участника в определенную дату
    async getParticipationCount(nickname, date = null) {
        try {
            const targetDate = date || this.getCurrentDate();
            const dateInfo = await this.findDateInfo(targetDate);
            
            if (!dateInfo) {
                return 0;
            }

            const participantInfo = await this.findParticipantInfoInRow(nickname, dateInfo.row);
            if (!participantInfo) {
                return 0;
            }

            const range = `${dateInfo.column}${participantInfo.row}`;
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: range,
            });

            const values = response.data.values;
            if (!values || values.length === 0 || !values[0][0]) {
                return 0;
            }

            const participationCount = parseInt(values[0][0]);
            return isNaN(participationCount) ? 0 : participationCount;
        } catch (error) {
            log(`Error getting participation count: ${error.message}`);
            return 0;
        }
    }
}

// Создаем экземпляр менеджера
const googleSheetsManager = new GoogleSheetsManager();

module.exports = googleSheetsManager; 