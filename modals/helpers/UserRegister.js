const sqlite3 = require('sqlite3').verbose();
const { ModalBuilder, Client, TextInputBuilder, ActionRowBuilder, TextInputStyle, ModalSubmitInteraction, MessageFlags } = require("discord.js");
const path = require('path');

// Подключение к SQLite базе данных
// Используем абсолютный путь для корректной работы в Docker контейнере
const dbPath = path.resolve(__dirname, '../../database.sqlite');
console.log('UserRegister database path:', dbPath);

// Проверяем существование файла базы данных
const fs = require('fs');
if (!fs.existsSync(dbPath)) {
    console.error(`UserRegister: Database file not found at: ${dbPath}`);
    console.error('Current working directory:', process.cwd());
    console.error('__dirname:', __dirname);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('UserRegister: Error opening database:', err.message);
        console.error('Database path:', dbPath);
        console.error('Current working directory:', process.cwd());
        console.error('__dirname:', __dirname);
    } else {
        console.log('UserRegister: Database connected successfully');
    }
});

// Инициализируем таблицу пользователей если её нет
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discordId TEXT UNIQUE NOT NULL,
        staticId TEXT UNIQUE NOT NULL,
        name TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        verbalWarnings INTEGER DEFAULT 0,
        strictWarnings INTEGER DEFAULT 0,
        eventsHosted INTEGER DEFAULT 0,
        eventsHelped INTEGER DEFAULT 0
    )
`);

module.exports = {
    data: new ModalBuilder()
        .setTitle("Регистрация пользователя")
        .setCustomId("userRegistration")
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("discordId")
                    .setLabel("Discord ID")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("staticId")
                    .setLabel("Static ID")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("role")
                    .setLabel("Роль")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("name")
                    .setLabel("Имя")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
            )
        ),

    /**
     *
     * @param interaction {ModalSubmitInteraction}
     */
    async execute(interaction, Client) {
        const discordId = interaction.fields.getTextInputValue("discordId");
        const staticId = interaction.fields.getTextInputValue("staticId");
        let role = interaction.fields.getTextInputValue("role");
        const name = interaction.fields.getTextInputValue("name");

        if (role.toLowerCase() === "admin") {
            role = "eventAdmin";
        } else if (role.toLowerCase() === "helper") {
            role = "eventHelper";
        }
          else if ( role.toLowerCase() === "Deputy Chief") {
            role = "Deputy Chief Events";
        }
          else if ( role.toLowerCase() === "Chief") {
            role = "Chief Event";
        }
          else if ( role.toLowerCase() === "ChiefHelpers") {
            role = "Chief Helpers"
          }
        try {
            // Сначала подтверждаем взаимодействие
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            
            // Проверяем существование пользователя
            const existingUser = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM users WHERE discordId = ? OR staticId = ? OR name = ?', 
                    [discordId, staticId, name], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (existingUser) {
                let errorMessage = "Ошибка: ";

                if (existingUser.discordId === discordId) {
                    errorMessage += "Этот Discord ID уже зарегистрирован. ";
                }
                if (existingUser.staticId === staticId) {
                    errorMessage += "Этот Static ID уже зарегистрирован. ";
                }
                if (existingUser.name === name) {
                    errorMessage += "Это имя уже используется.";
                }

                return await interaction.editReply({
                    content: errorMessage.trim()
                });
            }

            // Добавляем нового пользователя
            await new Promise((resolve, reject) => {
                db.run('INSERT INTO users (discordId, staticId, name, role, verbalWarnings, strictWarnings, eventsHosted, eventsHelped) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
                    [discordId, staticId, name, role, 0, 0, 0, 0], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });

            await interaction.editReply({
                content: "Пользователь успешно зарегистрирован!"
            });

            const channel = await interaction.client.channels.fetch('1350137697108492298'); 
            
            if (role === "eventAdmin") {
                await channel.send(`new event admin <@${discordId}>`);
            } else if (role === "eventHelper") {
                await channel.send(`new event helper <@${discordId}>`);
            }

            console.log("User added successfully");
        } catch (error) {
            console.error("Error inserting user:", error);
            
            // Пытаемся отправить сообщение об ошибке
            try {
                if (interaction.deferred) {
                    await interaction.editReply({
                        content: "Произошла ошибка при регистрации пользователя. Пожалуйста, попробуйте снова позже."
                    });
                } else {
                    await interaction.reply({
                        content: "Произошла ошибка при регистрации пользователя. Пожалуйста, попробуйте снова позже.",
                        flags: [MessageFlags.Ephemeral]
                    });
                }
            } catch (replyError) {
                console.error("Не удалось отправить сообщение об ошибке:", replyError);
            }
        }
    }
};
