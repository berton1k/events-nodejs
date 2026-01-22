const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const googleSheetsManager = require('../../utilities/googleSheets');
const { canUserDeleteMappings } = require('../../utilities/data/DataBase');

module.exports = {
    data: new StringSelectMenuBuilder()
        .setCustomId('mapping_delete_select')
        .setPlaceholder('Выберите маппинг для удаления')
        .setMinValues(1)
        .setMaxValues(1),

    async execute(interaction, client) {
        try {
            // Проверяем права пользователя на удаление маппингов
            const canDelete = await canUserDeleteMappings(interaction.member);
            if (!canDelete) {
                await interaction.reply({
                    content: '❌ У вас нет прав для удаления маппингов ников',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            const selectedDiscordNickname = interaction.values[0];
            const mappings = googleSheetsManager.getNicknameMappings();
            const sheetsNickname = mappings[selectedDiscordNickname];

            if (!sheetsNickname) {
                await interaction.reply({
                    content: '❌ Выбранный маппинг не найден',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Подтверждение удаления маппинга')
                .setDescription('Вы уверены, что хотите удалить этот маппинг?')
                .setColor('#ff9900')
                .addFields(
                    { name: 'Discord ник', value: selectedDiscordNickname, inline: true },
                    { name: 'Google Sheets ник', value: sheetsNickname, inline: true },
                    { name: '⚠️ Внимание', value: 'Это действие нельзя отменить!', inline: false }
                )
                .setTimestamp();

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mapping_delete_confirm_${selectedDiscordNickname}`)
                        .setLabel('✅ Подтвердить удаление')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId('mapping_delete_cancel')
                        .setLabel('❌ Отменить')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('❌')
                );

            await interaction.reply({
                embeds: [embed],
                components: [buttons],
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            console.error('Ошибка в меню mapping_delete_select:', error);
            // Ошибка обрабатывается в index.js, не нужно дублировать
            throw error;
        }
    }
}; 