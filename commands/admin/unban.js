const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { unbanUser, getActiveBans, getUserBanInfo, getSettings } = require('../../utilities/data/DataBase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Разбанить пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для разбанивания')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина разбанивания')
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
            const reason = interaction.options.getString('reason') || 'Причина не указана';
            const moderator = interaction.user;

            // Проверяем, не пытается ли модератор разбанить самого себя
            if (targetUser.id === moderator.id) {
                await interaction.editReply({
                    content: '❌ Вы не можете разбанить самого себя.',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Проверяем, не пытается ли модератор разбанить бота
            if (targetUser.id === client.user.id) {
                await interaction.editReply({
                    content: '❌ Вы не можете разбанить бота.',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Получаем информацию о текущих банах пользователя
            const activeBans = await getActiveBans(targetUser.id);
            const currentBanInfo = await getUserBanInfo(targetUser.id);

            if (!activeBans || activeBans.length === 0) {
                await interaction.editReply({
                    content: `❌ Пользователь **${targetUser.tag}** не заблокирован.`,
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Разбаниваем пользователя в базе данных
            const unbanSuccess = await unbanUser(targetUser.id);

            if (!unbanSuccess) {
                await interaction.editReply({
                    content: `❌ Не удалось разбанить пользователя **${targetUser.tag}** в базе данных.`,
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Разбаниваем пользователя на сервере
            try {
                await interaction.guild.members.unban(targetUser.id, `Разбан от ${moderator.tag}. Причина: ${reason}`);
                
                // Создаем embed для ответа
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Пользователь разбанен')
                    .setDescription(`Пользователь **${targetUser.tag}** разбанен`)
                    .addFields(
                        { name: 'Модератор', value: moderator.tag, inline: true },
                        { name: 'Причина разбанивания', value: reason, inline: true }
                    )
                    .setTimestamp();

                // Добавляем информацию о снятых банах
                if (activeBans.length > 0) {
                    const banReasons = activeBans.map(ban => {
                        const banDate = new Date(ban.created_at);
                        const banType = ban.is_permanent ? 'Навсегда' : 'Временный';
                        return `• ${ban.reason} (${banType}) - <t:${Math.floor(banDate.getTime() / 1000)}:F>`;
                    }).join('\n');

                    embed.addFields({
                        name: '🚫 Снятые баны',
                        value: banReasons,
                        inline: false
                    });

                    // Если было несколько банов, показываем общее количество
                    if (activeBans.length > 1) {
                        embed.addFields({
                            name: '📊 Статистика',
                            value: `Снято банов: ${activeBans.length}`,
                            inline: false
                        });
                    }
                }

                await interaction.editReply({
                    embeds: [embed],
                    flags: [MessageFlags.Ephemeral]
                });

                // Отправляем сообщение в ЛС пользователю
                try {
                    const unbanMessage = `Вы были разбанены на сервере seattle events модератором "${moderator.tag}".\n\n✅ **Бан снят**\n**Причина разбанивания:** ${reason}\n\nТеперь вы можете снова присоединиться к серверу.`;
                    await targetUser.send(unbanMessage);
                } catch (dmError) {
                    console.log(`Не удалось отправить сообщение в ЛС пользователю ${targetUser.tag}: ${dmError.message}`);
                }

                console.log(`✅ Пользователь ${targetUser.tag} (${targetUser.id}) разбанен модератором ${moderator.tag}`);

            } catch (unbanError) {
                console.error('Ошибка при разбанивании пользователя на сервере:', unbanError);
                
                // Если не удалось разбанить на сервере, но в БД разбанен, уведомляем об этом
                embed.addFields({
                    name: '⚠️ Внимание',
                    value: 'Пользователь разбанен в базе данных, но не удалось разбанить на сервере. Возможно, пользователь уже не забанен на сервере.',
                    inline: false
                });

                await interaction.editReply({
                    embeds: [embed],
                    flags: [MessageFlags.Ephemeral]
                });
            }

        } catch (error) {
            console.error('Ошибка в команде unban:', error);
            await interaction.editReply({
                content: `❌ Ошибка при разбанивании пользователя: ${error.message}`,
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};
