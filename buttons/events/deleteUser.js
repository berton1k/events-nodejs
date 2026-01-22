const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Подключение к SQLite базе данных
const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath);

module.exports = {
    data: new ButtonBuilder()
        .setCustomId("deleteUser")
        .setLabel("Удалить сотрудника")
        .setStyle(ButtonStyle.Danger),

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
                    await interaction.showModal(client.modals.get("userDeletion").data);
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

