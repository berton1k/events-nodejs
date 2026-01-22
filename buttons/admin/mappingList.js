const { ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const googleSheetsManager = require('../../utilities/googleSheets');

module.exports = {
    data: new ButtonBuilder()
        .setCustomId('mapping_list')
        .setLabel('📋 Список маппингов')
        .setStyle(ButtonStyle.Primary),

    async execute(interaction, client) {
        try {
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
                .setTitle('📋 Список маппингов ников')
                .setDescription('Discord ник → Ник в Google Sheets')
                .setColor('#00ff00')
                .setTimestamp();

            // Разбиваем список на части, если маппингов много
            const mappingEntries = Object.entries(mappings);
            const chunkSize = 10;
            
            for (let i = 0; i < mappingEntries.length; i += chunkSize) {
                const chunk = mappingEntries.slice(i, i + chunkSize);
                const fieldName = i === 0 ? 'Текущие маппинги' : `Маппинги (продолжение ${Math.floor(i / chunkSize) + 1})`;
                
                const mappingList = chunk.map(([discord, sheets], index) => 
                    `${i + index + 1}. **${discord}** → **${sheets}**`
                ).join('\n');

                embed.addFields({
                    name: fieldName,
                    value: mappingList,
                    inline: false
                });
            }

            embed.addFields({
                name: '📊 Статистика',
                value: `Всего маппингов: **${mappingCount}**`,
                inline: false
            });

            await interaction.reply({
                embeds: [embed],
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            console.error('Ошибка в кнопке mapping_list:', error);
            // Ошибка обрабатывается в index.js, не нужно дублировать
            throw error;
        }
    }
}; 