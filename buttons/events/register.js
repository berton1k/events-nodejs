const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Подключение к SQLite базе данных
// Используем абсолютный путь для корректной работы в Docker контейнере
const dbPath = path.resolve(__dirname, '../../database.sqlite');
console.log('Register button database path:', dbPath);

// Проверяем существование файла базы данных
const fs = require('fs');
if (!fs.existsSync(dbPath)) {
    console.error(`Register button: Database file not found at: ${dbPath}`);
    console.error('Current working directory:', process.cwd());
    console.error('__dirname:', __dirname);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Register button: Error opening database:', err.message);
        console.error('Database path:', dbPath);
        console.error('Current working directory:', process.cwd());
        console.error('__dirname:', __dirname);
    } else {
        console.log('Register button: Database connected successfully');
    }
});

module.exports = {
    data: new ButtonBuilder()
        .setCustomId("register")
        .setLabel("Внести сотрудника")
        .setStyle(ButtonStyle.Success),

    /**
     *
     * @param interaction {ButtonInteraction}
     * @param client {Client}
     */
    execute: async (interaction, client) => {
        const discordId = interaction.user.id;

        try {
            // Ищем пользователя по discordId
            const user = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM users WHERE discordId = ?', [discordId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            // Если пользователь найден, проверяем его роль
            if (user) {
                const userRoles = user.role; // Предполагаем, что в базе есть поле role

                // Проверяем, есть ли у пользователя нужная роль
                if (userRoles === "Chief Event" || userRoles === "Deputy Chief Events" || userRoles === "Chief Helpers") {
                    // Если роль есть, показываем модалку
                    await interaction.showModal(client.modals.get("userRegistration").data);
                } else {
                    // Если у пользователя нет нужной роли
                    await interaction.reply({
                        content: "У вас нет прав для выполнения этой операции.",
                        flags: [MessageFlags.Ephemeral]
                    });
                }
            } else {
                // Если пользователь не найден в базе данных
                await interaction.reply({
                    content: "Пользователь не найден в базе данных.",
                    flags: [MessageFlags.Ephemeral]
                });
            }
        } catch (error) {
            console.error("Ошибка при подключении к базе данных:", error);
            await interaction.reply({
                content: "Произошла ошибка при подключении к базе данных.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
}
