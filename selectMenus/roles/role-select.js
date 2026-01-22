const {StringSelectMenuBuilder, ButtonBuilder, Client, StringSelectMenuInteraction, ButtonInteraction, MessageFlags, EmbedBuilder, ButtonStyle} = require("discord.js");


module.exports = {
    data: new StringSelectMenuBuilder()
        .setOptions(
            { label: "State Events", description: "Дает доступ к фракционным мероприятиям", value: "state-events" },
            { label: "Crime Events", description: "Дает доступ к фракционным мероприятиям", value: "crime-events" },
            { label: "Family Events", description: "Дает доступ к фракционным мероприятиям", value: "family-events" },
            { label: "Discord Events", description: "Дает доступ к дискорд мероприятиям", value: "discord-events" }
        )
        .setPlaceholder("Выберите роль")
        .setCustomId("role-select")
        .setMaxValues(1),
    
    /**
     * Обработчик селектора ролей
     * @param interaction {StringSelectMenuInteraction}
     * @param client {Client}
     */
    execute: async (interaction, client) => {
        try {
            const roleIds = {
                "discord-events": "1350422369235243098",
                "state-events": "1349752309776912385",
                "crime-events": "1349752366693613698",
                "family-events": "1349608977444376586"
            };

            const selectedValue = interaction.values[0];
            const selectedRoleId = roleIds[selectedValue];

            if (!selectedRoleId) {
                try {
                    await interaction.update({ 
                        content: `Некорректный выбор роли: ${selectedValue}`, 
                        flags: [MessageFlags.Ephemeral] 
                    });
                } catch (error) {
                    console.error("Не удалось обновить взаимодействие:", error);
                }
                return;
            }

            const member = interaction.guild.members.cache.get(interaction.user.id);

            if (!member) {
                try {
                    await interaction.update({ 
                        content: "Не удалось найти пользователя.", 
                        flags: [MessageFlags.Ephemeral] 
                    });
                } catch (error) {
                    console.error("Не удалось обновить взаимодействие:", error);
                }
                return;
            }

            const role = interaction.guild.roles.cache.get(selectedRoleId);

            if (!role) {
                try {
                    await interaction.update({ 
                        content: `Роль с ID ${selectedRoleId} не найдена на сервере. Обратитесь к администратору.`, 
                        flags: [MessageFlags.Ephemeral] 
                    });
                } catch (error) {
                    console.error("Не удалось обновить взаимодействие:", error);
                }
                return;
            }

            // Проверяем, есть ли у бота права на управление этой ролью
            if (!interaction.guild.members.me.permissions.has("ManageRoles")) {
                try {
                    await interaction.update({ 
                        content: "У бота нет прав на управление ролями.", 
                        flags: [MessageFlags.Ephemeral] 
                    });
                } catch (error) {
                    console.error("Не удалось обновить взаимодействие:", error);
                }
                return;
            }

            // Проверяем, может ли бот управлять этой ролью
            if (role.position >= interaction.guild.members.me.roles.highest.position) {
                try {
                    await interaction.update({ 
                        content: `Бот не может управлять ролью ${role.name} (роль выше роли бота).`, 
                        flags: [MessageFlags.Ephemeral] 
                    });
                } catch (error) {
                    console.error("Не удалось обновить взаимодействие:", error);
                }
                return;
            }

            if (member.roles.cache.has(selectedRoleId)) {
                // Удаляем роль
                await member.roles.remove(role);
                try {
                    await interaction.update({ 
                        content: `Роль ${role.name} была удалена`, 
                        flags: [MessageFlags.Ephemeral] 
                    });
                } catch (error) {
                    console.error("Не удалось обновить взаимодействие:", error);
                }
            } else {
                // Добавляем роль
                await member.roles.add(role);
                try {
                    await interaction.update({ 
                        content: `Роль ${role.name} была выдана`, 
                        flags: [MessageFlags.Ephemeral] 
                    });
                } catch (error) {
                    console.error("Не удалось обновить взаимодействие:", error);
                }
            }
        } catch (error) {
            console.error("Ошибка при выдаче роли:", error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.update({ 
                        content: `Произошла ошибка при выдаче роли: ${error.message}`, 
                        flags: [MessageFlags.Ephemeral] 
                    });
                } else {
                    await interaction.followUp({ 
                        content: `Произошла ошибка при выдаче роли: ${error.message}`, 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }
            } catch (replyError) {
                console.error("Не удалось отправить сообщение об ошибке:", replyError);
            }
        }
    }
}