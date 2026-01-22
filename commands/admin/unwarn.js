const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { removeLastWarning, removeWarningById, getUserWarnings, getWarningCount, getSettings } = require('../../utilities/data/DataBase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Снять предупреждение с пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для снятия предупреждения')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('warning_id')
                .setDescription('ID конкретного предупреждения (необязательно)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина снятия предупреждения')
                .setRequired(false)),

    admin: false, // Теперь проверяем роли модерации

    async execute(interaction, client) {
        try {
            // Проверяем права на модерацию
            const settings = await getSettings();
            const roles = settings?.roles || {};
            const canModerateRoles = roles.canModerate || [];
            
            // Если роли не настроены, только администраторы могут использовать команды
            if (canModerateRoles.length === 0) {
                if (!interaction.member || !interaction.member.permissions || !interaction.member.permissions.has("Administrator")) {
                    return await interaction.reply({ 
                        flags: [MessageFlags.Ephemeral], 
                        content: "У вас нет доступа к этой команде." 
                    });
                }
            } else {
                // Проверяем, есть ли у пользователя одна из разрешенных ролей
                const hasRole = interaction.member.roles.cache.some(role => canModerateRoles.includes(role.id));
                
                // Также проверяем права администратора
                if (!hasRole && !interaction.member.permissions.has("Administrator")) {
                    return await interaction.reply({ 
                        flags: [MessageFlags.Ephemeral], 
                        content: "У вас нет доступа к этой команде." 
                    });
                }
            }

            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const targetUser = interaction.options.getUser('user');
            const warningId = interaction.options.getInteger('warning_id');
            const reason = interaction.options.getString('reason') || 'Причина не указана';
            const moderator = interaction.user;

            // Проверяем, не пытается ли модератор снять предупреждение с самого себя
            if (targetUser.id === moderator.id) {
                await interaction.editReply({
                    content: '❌ Вы не можете снять предупреждение с самого себя.',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Получаем текущие предупреждения пользователя
            const warnings = await getUserWarnings(targetUser.id);
            const currentWarningCount = await getWarningCount(targetUser.id);

            if (currentWarningCount === 0) {
                await interaction.editReply({
                    content: `❌ У пользователя **${targetUser.tag}** нет предупреждений.`,
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            let removedWarning = null;
            let success = false;

            if (warningId) {
                // Снимаем конкретное предупреждение по ID
                const warningToRemove = warnings.find(w => w.id === warningId);
                if (!warningToRemove) {
                    await interaction.editReply({
                        content: `❌ Предупреждение с ID ${warningId} не найдено у пользователя **${targetUser.tag}**.`,
                        flags: [MessageFlags.Ephemeral]
                    });
                    return;
                }
                
                success = await removeWarningById(warningId);
                if (success) {
                    removedWarning = warningToRemove;
                }
            } else {
                // Снимаем последнее предупреждение
                success = await removeLastWarning(targetUser.id);
                if (success) {
                    removedWarning = warnings[0]; // Первое в списке - самое последнее
                }
            }

            if (!success) {
                await interaction.editReply({
                    content: `❌ Не удалось снять предупреждение с пользователя **${targetUser.tag}**.`,
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Получаем обновленное количество предупреждений
            const newWarningCount = await getWarningCount(targetUser.id);

            // Создаем embed для ответа
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Предупреждение снято')
                .setDescription(`С пользователя **${targetUser.tag}** снято предупреждение`)
                .addFields(
                    { name: 'Снятое предупреждение', value: removedWarning.reason, inline: true },
                    { name: 'Модератор', value: moderator.tag, inline: true },
                    { name: 'Причина снятия', value: reason, inline: true },
                    { name: 'Предупреждений осталось', value: `${newWarningCount}/3`, inline: true }
                )
                .setTimestamp();

            // Добавляем информацию о дате снятого предупреждения
            if (removedWarning.created_at) {
                const warningDate = new Date(removedWarning.created_at);
                embed.addFields({
                    name: '📅 Дата снятого предупреждения',
                    value: `<t:${Math.floor(warningDate.getTime() / 1000)}:F>`,
                    inline: false
                });
            }

            // Если у пользователя больше нет предупреждений, меняем цвет на зеленый
            if (newWarningCount === 0) {
                embed.setColor('#00ff00')
                    .addFields({
                        name: '🎉 Статус',
                        value: 'У пользователя больше нет предупреждений',
                        inline: false
                    });
            }

            await interaction.editReply({
                embeds: [embed],
                flags: [MessageFlags.Ephemeral]
            });

            // Отправляем сообщение в ЛС пользователю
            try {
                const unwarnMessage = `С вас снято предупреждение на сервере seattle events модератором "${moderator.tag}".\n\n✅ **Предупреждение снято**\n**Причина снятия:** ${reason}\n**Осталось предупреждений:** ${newWarningCount}/3`;
                await targetUser.send(unwarnMessage);
            } catch (dmError) {
                console.log(`Не удалось отправить сообщение в ЛС пользователю ${targetUser.tag}: ${dmError.message}`);
            }

        } catch (error) {
            console.error('Ошибка в команде unwarn:', error);
            await interaction.editReply({
                content: `❌ Ошибка при снятии предупреждения: ${error.message}`,
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};
