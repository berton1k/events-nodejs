const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId("acceptaway")
        .setLabel("✅ Одобрить отпуск")
        .setStyle(ButtonStyle.Success),

    /**
     * Executes when the button is clicked.
     * @param {ButtonInteraction} interaction
     * @param {Client} client
     * @param {string | null} id — Discord user ID of the vacation requester
     */
    execute: async (interaction, client, id) => {
        try {
            const allowedRoleIds = [
                "1349492150508851230",
                "1349608313624596645",
                "1349492329395912745",
                "1389336260924936294"
            ];

            const member = interaction.member;
            const hasPermission = allowedRoleIds.some(roleId => member.roles.cache.has(roleId));

            if (!hasPermission) {
                return await interaction.reply({
                    content: "❌ У вас нет прав для одобрения отпусков.",
                    flags: [MessageFlags.Ephemeral]
                });
            }

            const user = await interaction.guild.members.fetch(id).catch(() => null);
            if (!user) {
                await interaction.reply({
                    content: "Ошибка: автор не найден.",
                    flags: [MessageFlags.Ephemeral]
                });
                return interaction.message.edit({ components: [] });
            }

            try {
                await interaction.update({
                    content: `Одобрено by <@${interaction.user.id}>`,
                    components: []
                });
            } catch (error) {
                console.error("Не удалось обновить взаимодействие:", error);
            }

            await interaction.followUp({
                content: `Вы одобрили отпуск пользователя ${user.user.tag}`,
                flags: [MessageFlags.Ephemeral]
            });
            await user.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setAuthor({
                            name: `Ваш отпуск был одобрен Ст.организатором: ${interaction.user.tag}.`
                        })
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