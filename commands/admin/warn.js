const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { addWarning, getWarningCount, addWarningKick, banUser, getSettings } = require('../../utilities/data/DataBase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Выдать предупреждение пользователю')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для предупреждения')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина предупреждения')
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
            const reason = interaction.options.getString('reason');
            const moderator = interaction.user;

            // Проверяем, не пытается ли модератор выдать предупреждение самому себе
            if (targetUser.id === moderator.id) {
                await interaction.editReply({
                    content: '❌ Вы не можете выдать предупреждение самому себе.',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Проверяем, не пытается ли модератор выдать предупреждение боту
            if (targetUser.id === client.user.id) {
                await interaction.editReply({
                    content: '❌ Вы не можете выдать предупреждение боту.',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Добавляем предупреждение в базу данных
            await addWarning(targetUser.id, moderator.id, reason);

            // Получаем текущее количество предупреждений
            const warningCount = await getWarningCount(targetUser.id);

            // Создаем embed для ответа
            const embed = new EmbedBuilder()
                .setColor(warningCount >= 3 ? '#ff0000' : warningCount >= 2 ? '#ffa500' : '#ffff00')
                .setTitle('⚠️ Предупреждение выдано')
                .setDescription(`Пользователю **${targetUser.tag}** выдано предупреждение`)
                .addFields(
                    { name: 'Причина', value: reason, inline: true },
                    { name: 'Модератор', value: moderator.tag, inline: true },
                    { name: 'Всего предупреждений', value: warningCount.toString(), inline: true }
                )
                .setTimestamp();

            // Если 3 предупреждения - кикаем пользователя
            if (warningCount >= 3) {
                try {
                    const member = await interaction.guild.members.fetch(targetUser.id);
                    await member.kick(`Автоматический кик за 3 предупреждения. Последняя причина: ${reason}`);
                    
                    // Добавляем запись о кике в базу данных
                    await addWarningKick(targetUser.id, moderator.id, `Автоматический кик за 3 предупреждения. Причина: ${reason}`);
                    
                    embed.setColor('#ff0000')
                        .setTitle('🚫 Пользователь кикнут')
                        .addFields(
                            { name: 'Действие', value: 'Автоматический кик за 3 предупреждения', inline: false }
                        );

                    // Отправляем сообщение в ЛС пользователю
                    try {
                        await targetUser.send(`Вам пришло предупреждение от модератора сервера seattle events, "${moderator.tag}": ${reason}\n\n⚠️ **ВНИМАНИЕ:** У вас накопилось 3 предупреждения, поэтому вы были автоматически кикнуты с сервера.`);
                    } catch (dmError) {
                        console.log(`Не удалось отправить сообщение в ЛС пользователю ${targetUser.tag}: ${dmError.message}`);
                    }
                } catch (kickError) {
                    console.error('Ошибка при кике пользователя:', kickError);
                    embed.addFields({ name: '⚠️ Ошибка', value: 'Не удалось кикнуть пользователя, но предупреждение добавлено', inline: false });
                }
            } else if (warningCount >= 2) {
                embed.setColor('#ffa500')
                    .setTitle('⚠️ Последнее предупреждение')
                    .addFields(
                        { name: '⚠️ Внимание', value: 'Следующее предупреждение приведет к автоматическому кику', inline: false }
                    );

                // Отправляем сообщение в ЛС пользователю
                try {
                    await targetUser.send(`Вам пришло предупреждение от модератора сервера seattle events, "${moderator.tag}": ${reason}\n\n⚠️ **ВНИМАНИЕ:** У вас уже ${warningCount} предупреждения. Следующее приведет к автоматическому кику.`);
                } catch (dmError) {
                    console.log(`Не удалось отправить сообщение в ЛС пользователю ${targetUser.tag}: ${dmError.message}`);
                }
            } else {
                // Отправляем сообщение в ЛС пользователю
                try {
                    await targetUser.send(`Вам пришло предупреждение от модератора сервера seattle events, "${moderator.tag}": ${reason}`);
                } catch (dmError) {
                    console.log(`Не удалось отправить сообщение в ЛС пользователю ${targetUser.tag}: ${dmError.message}`);
                }
            }

            await interaction.editReply({
                embeds: [embed],
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            console.error('Ошибка в команде warn:', error);
            await interaction.editReply({
                content: `❌ Ошибка при выдаче предупреждения: ${error.message}`,
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};
