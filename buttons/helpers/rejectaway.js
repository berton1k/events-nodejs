const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId("rejectaway")
        .setLabel("❌ Отклонить отпуск")
        .setStyle(ButtonStyle.Danger),

    /**
     * @param {ButtonInteraction} interaction
     * @param {Client}            client
     * @param {string|null}       id        — ID автора заявки (указывается при создании кнопки)
     */
    execute: async (interaction, client, id) => {
        try {
            const allowedRoleIds = [
                "1349492150508851230",
                "1349608313624596645",
                "1349492329395912745",
                "1349776856106274867",
                "1389336260924936294",
            ];

            const member = interaction.member;
            const hasPermission = allowedRoleIds.some(roleId => member.roles.cache.has(roleId));

            if (!hasPermission) {
                return await interaction.reply({
                    content: "❌ У вас нет прав для отклонения отпусков.",
                    flags: [MessageFlags.Ephemeral]
                });
            }

            const user = await interaction.guild.members.fetch(id).catch(() => null);
            if (!user) {
                await interaction.reply({
                    content: "Ошибка: автор не найден.",
                    flags: [MessageFlags.Ephemeral]
                });
                return await interaction.message.edit({ components: [] });
            }

            try {
                await interaction.update({
                    content: `Отклонено by <@${interaction.user.id}>`,
                    components: []
                });
            } catch (error) {
                console.error("Не удалось обновить взаимодействие:", error);
            }

            await interaction.followUp({
                content: `Вы отклонили отпуск пользователя ${user.user.tag}`,
                flags: [MessageFlags.Ephemeral]
            });

            await user.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setAuthor({ name: `Ваш отпуск был отклонён Ст.организатором: ${interaction.user.tag}.` })
                        .setDescription(`\`\`\`\n${interaction.message.embeds[0].fields[0].value}\n\`\`\``)
                ]
            }).catch(async () => {
                await interaction.followUp({
                    content: "Не удалось отправить личное сообщение. Возможно, пользователь заблокировал бота или ограничил ЛС.",
                    flags: [MessageFlags.Ephemeral]
                });
            });
        } catch (error) {
            console.error("Ошибка в обработке кнопки:", error);
            await interaction.reply({
                content: "❌ Произошла ошибка. Попробуйте позже.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};