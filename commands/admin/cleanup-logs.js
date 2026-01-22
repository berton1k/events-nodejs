const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { cleanupOldLogs } = require('../../utilities/data/logging');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cleanup-logs')
        .setDescription('Clean up old log entries')
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Remove logs older than this many days (default: 30)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(365)),
    
    admin: true,
    
    async execute(interaction) {
        const days = interaction.options.getInteger('days') || 30;
        
        try {
            await interaction.deferReply({ ephemeral: true });
            
            const deletedCount = await cleanupOldLogs(days);
            
            const embed = new EmbedBuilder()
                .setTitle('Log Cleanup Completed')
                .setColor('#00ff00')
                .setDescription(`Successfully cleaned up old log entries`)
                .addFields(
                    { name: 'Days Old', value: `${days}`, inline: true },
                    { name: 'Entries Deleted', value: `${deletedCount}`, inline: true }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error cleaning up logs:', error);
            await interaction.editReply({
                content: '❌ An error occurred while cleaning up logs',
                ephemeral: true
            });
        }
    }
};
