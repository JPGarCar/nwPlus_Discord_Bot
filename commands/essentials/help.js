// Discord.js commando requirements
const { Command, CommandoGuild } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const BotGuild = require('../../db/mongo/BotGuild');

// Command export
module.exports = class ClearChat extends Command {
    constructor(client) {
        super(client, {
            name: 'help',
            group: 'essentials',
            memberName: 'help user',
            description: 'Will send available commands depending on role!',
            hidden: true,
        });
    }

    async run(message) {

        let botGuild = await BotGuild.findById(message.guild.id);

        /** @type {CommandoGuild} */
        let guild = message.guild;
        
        /** @type {Command[]} */
        var commands = [];

        // if message on DM then send hacker commands
        if (message.channel.type === 'dm') {
            var commandGroups = this.client.registry.findGroups('utility', true);
        } else {
            discordServices.deleteMessage(message);

            if ((discordServices.checkForRole(message.member, botGuild.roleIDs.staffRole))) {
                var commandGroups = this.client.registry.groups;
            } else {
                var commandGroups = this.client.registry.findGroups('utility', true);
            }
        }

        // add all the commands from the command groups
        commandGroups.forEach((value) => {
            if (guild.isGroupEnabled(value)) {
                value.commands.forEach((command, index) => {
                    if (guild.isCommandEnabled(command)) commands.push(command);
                });
            }
        });

        var length = commands.length;

        const textEmbed = new Discord.MessageEmbed()
            .setColor(botGuild.colors.embedColor)
            .setTitle('Commands Available for you')
            .setDescription('All other interactions with me will be via emoji reactions!')
            .setTimestamp();

        // add each command as a field in the embed
        for (var i = 0; i < length; i++) {
            let command = commands[i];
            if (command.format != null) {
                textEmbed.addField(this.client.commandPrefix + command.name, command.description + ', arguments: ' + command.format);
            } else {
                textEmbed.addField(this.client.commandPrefix + command.name, command.description + ', no arguments');
            }
        }

        message.author.send(textEmbed);
    }

}