const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription('Executes vote. Usage: /vote chain prop# option').addStringOption(option =>
            option.setName('input')
            .setDescription('chain prop# option')),
    async execute(interaction) {

        const { options, applicationId, channelId, commandGuildId, commandName, commandId, user } = interaction
        await interaction.reply({ content: 'Processing vote now...', ephemeral: true });
        try {
            const params = new URLSearchParams();
            params.append('text', options.getString('input'));
            params.append('channel_id', channelId);
            let res = await axios.post("http://localhost:4040/vote", params)
            await interaction.followUp(`Processed ${res}`);
        } catch (e) {
            console.log(e)
            await interaction.reply({ content: `Err: ${e.message}`, ephemeral: true });
        }

    },
};