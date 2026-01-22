const {ButtonBuilder, ButtonInteraction, Client, ButtonStyle, EmbedBuilder} = require("discord.js");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId("reject-player-report")
        .setLabel("Отклонить")
        .setStyle(ButtonStyle.Danger),
    /**
     *
     * @param interaction {ButtonInteraction}
     * @param client {Client}
     */
    execute: async (interaction, client) => {
        // Получаем данные из оригинального эмбеда
        const embed = interaction.message.embeds[0];

        // Обновляем оригинальное сообщение, показывая что жалоба отклонена
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Жалоба на игрока - ОТКЛОНЕНА")
                    .setAuthor({ name: embed.author.name, iconURL: embed.author.iconURL })
                    .setFields(embed.fields)
                    .setColor(0xff0000)
                    .setTimestamp(new Date())
                    .setFooter({ text: embed.footer.text })
            ],
            components: []
        });
    }
} 