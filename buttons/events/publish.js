
const { ButtonBuilder, ButtonStyle, MessageFlags} = require('discord.js');
const {getEvents} = require("../../utilities/data/DataBase");
const {createPagination} = require("../../utilities/data/utils");

module.exports = {
    rules: ['canPublish'],
    data: new ButtonBuilder()
        .setCustomId('event-publish')
        .setLabel('📌 Опубликовать ивент')
        .setStyle(ButtonStyle.Primary),

    async execute(interaction, client) {
        console.log('=== PUBLISH EVENT BUTTON CLICKED ===');
        console.log(`👤 Пользователь: ${interaction.user.tag}`);
        console.log(`🔘 Кнопка: ${interaction.customId}`);

        try {
            const events = await getEvents();
            console.log(`📋 Найдено событий: ${events.length}`);
            
            if (!events.length) {
                console.log('❌ События не найдены');
                await interaction.reply({flags: [MessageFlags.Ephemeral], content: "Ивенты не найдены. Для начала добавьте их."});
                return;
            }

            const mappedEvents = events.map((event, index) => ({ 
                label: event.name.length > 100 ? event.name.substring(0, 97) + '...' : event.name, 
                value: `event_${index}_${event.id}`
            }));
            console.log(`📝 События подготовлены для отображения: ${mappedEvents.length}`);

            console.log('🚀 Создаем пагинацию для публикации событий...');
            await createPagination(25, interaction, mappedEvents, 'event-select-publish', client, 'Выберите ивент для публикации');
            console.log('✅ Пагинация для публикации создана');
            
        } catch (error) {
            console.error('❌ Ошибка при создании пагинации для публикации:', error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Произошла ошибка при загрузке событий.',
                        flags: [MessageFlags.Ephemeral]
                    });
                } else {
                    await interaction.followUp({
                        content: '❌ Произошла ошибка при загрузке событий.',
                        flags: [MessageFlags.Ephemeral]
                    });
                }
            } catch (replyError) {
                console.error('❌ Не удалось отправить сообщение об ошибке:', replyError);
            }
        }
    }
};