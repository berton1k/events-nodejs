const {ButtonBuilder, ButtonInteraction, Client, ButtonStyle, MessageFlags} = require("discord.js");


module.exports = {
    data: new ButtonBuilder()
        .setCustomId("notifications")
        .setLabel("Получать уведомления о мероприятиях")
        .setStyle(ButtonStyle.Primary),
    /**
     *
     * @param interaction {ButtonInteraction}
     * @param client {Client}
     */
    execute: async (interaction, client) => {
        try {
            const roleId = "1361458195456983213";
            const member = interaction.member;
            const role = interaction.guild.roles.cache.get(roleId);

            if (!role) {
                await interaction.reply({
                    content: "❌ Роль для уведомлений не найдена. Обратитесь к администратору.",
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Проверяем, есть ли у бота права на управление ролями
            if (!interaction.guild.members.me.permissions.has("ManageRoles")) {
                await interaction.reply({
                    content: "❌ У бота нет прав на управление ролями.",
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Проверяем, может ли бот управлять этой ролью
            if (role.position >= interaction.guild.members.me.roles.highest.position) {
                await interaction.reply({
                    content: `❌ Бот не может управлять ролью ${role.name} (роль выше роли бота).`,
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            if (member.roles.cache.has(roleId)) {
                // Удаляем роль
                await member.roles.remove(role);
                await interaction.reply({
                    content: `🔕 Вы больше не будете получать уведомления о мероприятиях`,
                    flags: [MessageFlags.Ephemeral]
                });
            } else {
                // Добавляем роль
                await member.roles.add(role);
                await interaction.reply({
                    content: `🔔 Теперь вы будете получать уведомления о новых мероприятиях!`,
                    flags: [MessageFlags.Ephemeral]
                });
            }
        } catch (error) {
            console.error("Ошибка при управлении ролью уведомлений:", error);
            
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: "❌ Произошла ошибка при управлении ролью. Обратитесь к администратору.",
                        flags: [MessageFlags.Ephemeral]
                    });
                } else {
                    await interaction.reply({
                        content: "❌ Произошла ошибка при управлении ролью. Обратитесь к администратору.",
                        flags: [MessageFlags.Ephemeral]
                    });
                }
            } catch (followUpError) {
                console.error("Не удалось отправить сообщение об ошибке:", followUpError);
            }
        }
    }
} 