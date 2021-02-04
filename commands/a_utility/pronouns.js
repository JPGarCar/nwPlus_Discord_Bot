// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class RoleSelector extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'pronouns',
            group: 'a_utility',
            memberName: 'pronoun role',
            description: 'Set up pronouns reaction role message.',
            guildOnly: true,
        },
            {
                roleID: discordServices.roleIDs.staffRole,
                roleMessage: 'Hey there, the command !pronouns is only available to staff!',
            });
    }


    /**
     * 
     * @param {Discord.Message} message - the command message
     */
    async runCommand(message) {
        const sheRole = message.guild.roles.cache.find(role => role.name === "she/her");
        const heRole = message.guild.roles.cache.find(role => role.name === "he/him");
        const theyRole = message.guild.roles.cache.find(role => role.name === "they/them");
        const otherRole = message.guild.roles.cache.find(role => role.name === "other pronouns");

        var emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

        let embed = new Discord.MessageEmbed()
            .setColor('#e42643')
            .setTitle('Set your pronouns by reacting to one of the emojis!')
            .setDescription(
                `${sheEmoji} she/her\n`
                + `${heEmoji} he/him\n`
                + `${theyEmoji} they/them\n`
                + `${otherEmoji} other pronouns\n`);

        let messageEmbed = await message.channel.send(embed);
        messageEmbed.react(sheEmoji);
        messageEmbed.react(heEmoji);
        messageEmbed.react(theyEmoji);
        messageEmbed.react(otherEmoji);

        // create collector
        const reactionCollector = await msgConsole.createReactionCollector((reaction, user) => user.bot != true && emojis.includes(reaction.emoji.name));

        // on emoji reaction
        reactionCollector.on('collect', async (reaction, user) => {
            // if (reaction.message.partial) await reaction.message.fetch();
            // if (reaction.partial) await reaction.fetch();
            // if (user.bot) return;
            // if (!reaction.message.guild) return;

            if (reaction.emoji.name === emojis[0]) {
                await addRoleToMember(message.guild.member(user), sheRole);
            } if (reaction.emoji.name === emojis[1]) {
                await addRoleToMember(message.guild.member(user), heRole);
            } if (reaction.emoji.name === emojis[2]) {
                await addRoleToMember(message.guild.member(user), theyRole);
            } if (reaction.emoji.name === emojis[3]) {
                await addRoleToMember(message.guild.member(user), otherRole);
            }
        });

        reactionCollector.on('collect', async (reaction, user) => {
            // if (reaction.message.partial) await reaction.message.fetch();
            // if (reaction.partial) await reaction.fetch();
            // if (user.bot) return;
            // if (!reaction.message.guild) return;

            if (reaction.emoji.name === emojis[0]) {
                await removeRolToMember(message.guild.member(user), sheRole);
            } if (reaction.emoji.name === emojis[1]) {
                await removeRolToMember(message.guild.member(user), heRole);
            } if (reaction.emoji.name === emojis[2]) {
                await removeRolToMember(message.guild.member(user), theyRole);
            } if (reaction.emoji.name === emojis[3]) {
                await removeRolToMember(message.guild.member(user), otherRole);
            }
        });

    }

}