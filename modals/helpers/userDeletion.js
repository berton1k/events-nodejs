const sqlite3 = require('sqlite3').verbose();
const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, ModalSubmitInteraction } = require("discord.js");
const path = require('path');
const { MessageFlags } = require('discord.js');

// Подключение к SQLite базе данных
// Используем абсолютный путь для корректной работы в Docker контейнере
const dbPath = path.resolve(__dirname, '../../database.sqlite');
console.log('UserDeletion database path:', dbPath);

// Проверяем существование файла базы данных
const fs = require('fs');
if (!fs.existsSync(dbPath)) {
    console.error(`UserDeletion: Database file not found at: ${dbPath}`);
    console.error('Current working directory:', process.cwd());
    console.error('__dirname:', __dirname);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('UserDeletion: Error opening database:', err.message);
        console.error('Database path:', dbPath);
        console.error('Current working directory:', process.cwd());
        console.error('__dirname:', __dirname);
    } else {
        console.log('UserDeletion: Database connected successfully');
    }
});

// Инициализируем таблицу пользователей если её нет
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discordId TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        name TEXT
    )
`);

module.exports = {
    data: new ModalBuilder()
        .setTitle("Удаление пользователя")
        .setCustomId("userDeletion")
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
                    .setCustomId("reason")
                    .setLabel("Причина удаления")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Paragraph)
            )
        ),

    /**
     * @param interaction {ModalSubmitInteraction}
     */
    async execute(interaction) {
        const discordId = interaction.fields.getTextInputValue("discordId");
        const reason = interaction.fields.getTextInputValue("reason");

        try {
            // Сначала подтверждаем взаимодействие
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            
            // Проверяем права пользователя
            const requestingUser = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM users WHERE discordId = ?', [interaction.user.id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!requestingUser || (requestingUser.role !== "Deputy Chief Events" && requestingUser.role !== "Chief Event")) {
                return await interaction.editReply({
                    content: "У вас нет прав для удаления пользователей."
                });
            }

            // Проверяем существование пользователя для удаления
            const userToDelete = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM users WHERE discordId = ?', [discordId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!userToDelete) {
                return await interaction.editReply({
                    content: "Пользователь с таким Discord ID не найден."
                });
            }

            // Удаляем пользователя
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM users WHERE discordId = ?', [discordId], function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                });
            });

            await interaction.editReply({
                content: `Пользователь с Discord ID ${discordId} успешно удалён. Причина: ${reason}`
            });
            console.log(`User with Discord ID ${discordId} deleted. Reason: ${reason}`);

            const channel = await interaction.client.channels.fetch('1350137697108492298');
            let roleText = userToDelete.role === "eventAdmin" ? "с event adm" : userToDelete.role === "eventHelper" ? "с event helper" : "";
            await channel.send(`<@${discordId}> ${reason} ${roleText}`.trim());

        } catch (error) {
            console.error("Ошибка при удалении пользователя:", error);
            
            // Пытаемся отправить сообщение об ошибке
            try {
                if (interaction.deferred) {
                    await interaction.editReply({
                        content: "Произошла ошибка при удалении пользователя. Пожалуйста, попробуйте снова позже."
                    });
                } else {
                    await interaction.reply({
                        content: "Произошла ошибка при удалении пользователя. Пожалуйста, попробуйте снова позже.",
                        flags: [MessageFlags.Ephemeral]
                    });
                }
            } catch (replyError) {
                console.error("Не удалось отправить сообщение об ошибке:", replyError);
            }
        }
    }
};
