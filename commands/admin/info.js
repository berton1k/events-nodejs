const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUserModerationStats, getUserWarnings, getUserBanInfo, getSettings } = require('../../utilities/data/DataBase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Показать информацию о модерации пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для просмотра информации')
                .setRequired(true)),

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
            const moderator = interaction.user;

            // Получаем статистику модерации
            const stats = await getUserModerationStats(targetUser.id);
            const warnings = await getUserWarnings(targetUser.id);
            const banInfo = await getUserBanInfo(targetUser.id);

            // Создаем embed для отображения информации
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`📊 Информация о модерации`)
                .setDescription(`Пользователь: **${targetUser.tag}**`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '🆔 ID пользователя', value: targetUser.id, inline: true },
                    { name: '📅 Дата регистрации', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: true },
                    { name: '📅 Дата присоединения к серверу', value: targetUser.joinedAt ? `<t:${Math.floor(targetUser.joinedAt.getTime() / 1000)}:F>` : 'Неизвестно', inline: true }
                )
                .setTimestamp();

            // Добавляем статистику предупреждений
            if (stats.warningCount > 0) {
                embed.addFields(
                    { name: '⚠️ Предупреждения', value: `${stats.warningCount}/3`, inline: true },
                    { name: '🚫 Баны', value: stats.banCount.toString(), inline: true },
                    { name: '👢 Кики по предупреждениям', value: stats.kickCount.toString(), inline: true }
                );

                // Показываем последние предупреждения
                if (warnings.length > 0) {
                    const recentWarnings = warnings.slice(0, 3); // Показываем только последние 3
                    const warningsList = recentWarnings.map((warning, index) => {
                        const date = new Date(warning.created_at);
                        return `${index + 1}. ${warning.reason} (<t:${Math.floor(date.getTime() / 1000)}:R>)`;
                    }).join('\n');
                    
                    embed.addFields({
                        name: '📝 Последние предупреждения',
                        value: warningsList,
                        inline: false
                    });
                }

                // Показываем информацию о последнем кике
                if (stats.lastKickDate) {
                    const kickDate = new Date(stats.lastKickDate);
                    embed.addFields({
                        name: '👢 Последний кик по предупреждениям',
                        value: `<t:${Math.floor(kickDate.getTime() / 1000)}:F>`,
                        inline: false
                    });
                }
            } else {
                embed.addFields({
                    name: '✅ Статус',
                    value: 'Пользователь не имеет предупреждений',
                    inline: false
                });
            }

            // Добавляем информацию о текущем бане
            if (banInfo) {
                const banDate = new Date(banInfo.created_at);
                const isActive = banInfo.is_permanent || (banInfo.ban_until && new Date(banInfo.ban_until) > new Date());
                
                if (isActive) {
                    embed.setColor('#ff0000');
                    embed.addFields({
                        name: '🚫 Текущий бан',
                        value: `**Причина:** ${banInfo.reason}\n**Дата:** <t:${Math.floor(banDate.getTime() / 1000)}:F>\n**Тип:** ${banInfo.is_permanent ? 'Навсегда' : 'Временный'}`,
                        inline: false
                    });

                    if (!banInfo.is_permanent && banInfo.ban_until) {
                        const banUntil = new Date(banInfo.ban_until);
                        embed.addFields({
                            name: '⏰ Окончание бана',
                            value: `<t:${Math.floor(banUntil.getTime() / 1000)}:F>`,
                            inline: false
                        });
                    }
                }
            }

            // Добавляем цветовую индикацию статуса
            let statusColor = '#00ff00'; // Зеленый - все хорошо
            let statusText = '✅ Пользователь в порядке';

            if (stats.warningCount >= 3) {
                statusColor = '#ff0000'; // Красный - много предупреждений
                statusText = '🚫 Критический уровень предупреждений';
            } else if (stats.warningCount >= 2) {
                statusColor = '#ffa500'; // Оранжевый - предупреждения
                statusText = '⚠️ Высокий уровень предупреждений';
            } else if (stats.warningCount >= 1) {
                statusColor = '#ffff00'; // Желтый - есть предупреждения
                statusText = '⚠️ Есть предупреждения';
            }

            if (banInfo && (banInfo.is_permanent || (banInfo.ban_until && new Date(banInfo.ban_until) > new Date()))) {
                statusColor = '#ff0000';
                statusText = '🚫 Пользователь заблокирован';
            }

            embed.addFields({
                name: '📊 Общий статус',
                value: statusText,
                inline: false
            });

            embed.setColor(statusColor);

            await interaction.editReply({
                embeds: [embed],
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            console.error('Ошибка в команде info:', error);
            await interaction.editReply({
                content: `❌ Ошибка при получении информации: ${error.message}`,
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};
