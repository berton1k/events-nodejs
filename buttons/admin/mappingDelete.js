const { ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require('discord.js');
const googleSheetsManager = require('../../utilities/googleSheets');
const { canUserDeleteMappings } = require('../../utilities/data/DataBase');

module.exports = {
    data: new ButtonBuilder()
        .setCustomId('mapping_delete')
        .setLabel('🗑️ Удалить маппинг')
        .setStyle(ButtonStyle.Danger),

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

            const mappings = googleSheetsManager.getNicknameMappings();
            const mappingCount = Object.keys(mappings).length;

            if (mappingCount === 0) {
                await interaction.reply({
                    content: '📋 Маппинги ников не настроены',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Удаление маппинга никнейма')
                .setDescription('Выберите маппинг для удаления из списка ниже')
                .setColor('#ff0000')
                .addFields({
                    name: '📊 Доступные маппинги',
                    value: `Найдено маппингов: **${mappingCount}**`,
                    inline: false
                })
                .setTimestamp();

            // Создаем меню выбора
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('mapping_delete_select')
                .setPlaceholder('Выберите маппинг для удаления')
                .setMinValues(1)
                .setMaxValues(1);

            // Добавляем опции для каждого маппинга
            Object.entries(mappings).forEach(([discord, sheets], index) => {
                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${discord} → ${sheets}`)
                        .setDescription(`Discord: ${discord} | Sheets: ${sheets}`)
                        .setValue(discord)
                );
            });

            const actionRow = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [actionRow],
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            console.error('Ошибка в кнопке mapping_delete:', error);
            // Ошибка обрабатывается в index.js, не нужно дублировать
            throw error;
        }
    }
}; 