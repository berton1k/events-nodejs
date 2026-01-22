const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const googleSheetsManager = require('./googleSheets');

class MappingPanelUpdater {
    constructor() {
        this.activePanels = new Map(); // Map для хранения активных панелей
    }

    // Создать панель управления маппингом
    createPanel() {
        const mappings = googleSheetsManager.getNicknameMappings();
        const mappingCount = Object.keys(mappings).length;

        const embed = new EmbedBuilder()
            .setTitle('🔗 Панель управления маппингом ников')
            .setDescription('Управляйте сопоставлением Discord ников с никами в Google Таблицах')
            .setColor('#0099ff')
            .addFields(
                { name: '📊 Статистика', value: `Настроено маппингов: **${mappingCount}**`, inline: true },
                { name: 'ℹ️ Инструкция', value: 'Используйте кнопки ниже для управления маппингом', inline: false }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mapping_add')
                    .setLabel('Добавить маппинг')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('mapping_list')
                    .setLabel('Список маппингов')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('mapping_delete')
                    .setLabel('Удалить маппинг')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
            );

        return { embed, components: [buttons] };
    }

    // Обновить существующую панель
    async updatePanel(message) {
        try {
            const { embed, components } = this.createPanel();
            await message.edit({ embeds: [embed], components });
            console.log('✅ Панель управления маппингом обновлена');
        } catch (error) {
            console.error('❌ Ошибка при обновлении панели:', error);
        }
    }

    // Добавить панель в список активных
    addActivePanel(messageId, message) {
        this.activePanels.set(messageId, message);
        console.log(`📋 Добавлена активная панель: ${messageId}`);
    }

    // Удалить панель из списка активных
    removeActivePanel(messageId) {
        this.activePanels.delete(messageId);
        console.log(`🗑️ Удалена активная панель: ${messageId}`);
    }

    // Обновить все активные панели
    async updateAllPanels() {
        console.log(`🔄 Обновление ${this.activePanels.size} активных панелей...`);
        
        for (const [messageId, message] of this.activePanels) {
            try {
                await this.updatePanel(message);
            } catch (error) {
                console.error(`❌ Ошибка при обновлении панели ${messageId}:`, error);
                // Удаляем панель, если она больше не доступна
                this.activePanels.delete(messageId);
            }
        }
    }

    // Получить количество активных панелей
    getActivePanelsCount() {
        return this.activePanels.size;
    }

    // Очистить все активные панели
    clearAllPanels() {
        this.activePanels.clear();
        console.log('🧹 Все активные панели очищены');
    }
}

// Создаем единственный экземпляр
const mappingPanelUpdater = new MappingPanelUpdater();

module.exports = mappingPanelUpdater; 