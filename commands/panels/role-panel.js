const {SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("role-panel")
        .setDescription("Role Panel")
        .addStringOption(option =>
            option.setName("channel")
                .setDescription("ID канала или ветки (необязательно)")
                .setRequired(false)),
    execute: async (interaction, client) => {
        if (!interaction.member.permissions.has("Administrator")) return;
        
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // Проверяем, указан ли канал в параметрах
        const specifiedChannelId = interaction.options.getString("channel");
        
        if (specifiedChannelId) {
            // Если указан канал, используем его
            const targetChannel = interaction.guild.channels.cache.get(specifiedChannelId);
            
            if (!targetChannel) {
                await interaction.editReply({
                    content: `Ошибка: канал с ID ${specifiedChannelId} не найден.`
                });
                return;
            }

            // Отправляем панель в указанный канал
            await targetChannel.send({
                content: "Нажмите на кнопку снизу, чтобы выбрать роли.",
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Получение роли")
                        .setDescription("Каждая роль дает доступ к определенной категории, в которой есть индивидуальные мероприятия.")
                        .setImage("https://i.imgur.com/9zhbuzC.png")
                        .setColor("#009dbf")
                ],
                components: [
                    new ActionRowBuilder()
                        .setComponents(
                            client.selectMenus.get("role-select").data
                        ),
                    new ActionRowBuilder()
                        .setComponents(
                            client.buttons.get("notifications").data
                        )
                ]
            });

            await interaction.editReply({
                content: `Панель отправлена в канал <#${specifiedChannelId}>.`
            });
            return;
        }

        // Если канал не указан, отправляем в текущий канал
        await interaction.editReply({
            content: "Отправлено."
        });

        await interaction.channel.send({
            content: "Нажмите на кнопку снизу, чтобы выбрать роли.",
            embeds: [
                new EmbedBuilder()
                    .setTitle("Получение роли")
                    .setDescription("Каждая роль дает доступ к определенной категории, в которой есть индивидуальные мероприятия.")
                    .setImage("https://i.imgur.com/9zhbuzC.png")
                    .setColor("#009dbf")
            ],
            components: [
                new ActionRowBuilder()
                    .setComponents(
                        client.selectMenus.get("role-select").data
                    ),
                new ActionRowBuilder()
                    .setComponents(
                        client.buttons.get("notifications").data
                    )
            ]
        })
    }
}