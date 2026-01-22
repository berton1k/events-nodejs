const {ButtonBuilder, ButtonInteraction, Client, ButtonStyle, EmbedBuilder} = require("discord.js");
const {getSettings} = require("../../utilities/data/DataBase");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId("approve-player-report")
        .setLabel("Одобрить")
        .setStyle(ButtonStyle.Success),
    /**
     *
     * @param interaction {ButtonInteraction}
     * @param client {Client}
     */
    execute: async (interaction, client) => {
        // Получаем данные из оригинального эмбеда
        const embed = interaction.message.embeds[0];
        const staticIdRepField = embed.fields.find(field => field.name === "Static ID нарушителя:");
        const proofField = embed.fields.find(field => field.name === "Доказательство:");
        
        if (!staticIdRepField || !proofField) {
            await interaction.reply({
                content: "Ошибка: не удалось найти данные в жалобе",
                ephemeral: true
            });
            return;
        }

        const staticIdRep = staticIdRepField.value;
        const proof = proofField.value;

        // Получаем настройки для канала одобренных жалоб
        const settings = await getSettings();
        const approvedReportsChannelId = settings?.channels?.approvedPlayerReports;

        // Роли для тегания при отправке уведомления о ЧС
        const roleMentions = "<@&1349492150508851230><@&1349492329395912745>";

        // Создаем эмбед для отправки
        const approvedEmbed = new EmbedBuilder()
            .setTitle("🚫 Игрок добавлен в ЧС МП")
            .setAuthor({ name: interaction.member.user.username, iconURL: interaction.member.user.avatarURL({}) })
            .setFields([
                {
                    name: "Static ID нарушителя:",
                    value: staticIdRep
                },
                {
                    name: "Доказательство:",
                    value: proof
                },
                {
                    name: "Одобрено модератором:",
                    value: `<@${interaction.member.id}>`
                }
            ])
            .setColor(0xff0000)
            .setTimestamp(Date.now());

        // Отправляем эмбед в настроенный канал или в текущий канал, если настройка не установлена
        if (approvedReportsChannelId) {
            const approvedChannel = await interaction.guild.channels.fetch(approvedReportsChannelId).catch(() => null);
            if (approvedChannel) {
                await approvedChannel.send({
                    content: roleMentions,
                    embeds: [approvedEmbed]
                });
            } else {
                // Если канал не найден, отправляем в текущий канал
                await interaction.channel.send({
                    content: roleMentions,
                    embeds: [approvedEmbed]
                });
            }
        } else {
            // Если настройка не установлена, отправляем в текущий канал
            await interaction.channel.send({
                content: roleMentions,
                embeds: [approvedEmbed]
            });
        }

        // Обновляем оригинальное сообщение, показывая что жалоба одобрена
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Жалоба на игрока - ОДОБРЕНА")
                    .setAuthor({ name: embed.author.name, iconURL: embed.author.iconURL })
                    .setFields(embed.fields)
                    .setColor(0x00ff00)
                    .setTimestamp(new Date())
                    .setFooter({ text: embed.footer.text })
            ],
            components: []
        });
    }
} 