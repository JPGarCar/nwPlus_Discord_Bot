// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class StartTeamFormation extends Command {
    constructor(client) {
        super(client, {
            name: 'starttf',
            group: 'a_teamformation',
            memberName: 'start team formation',
            description: 'Send a message with emoji collector, one meoji for recruiters, one emoji for team searchers. Instructions will be sent via DM.',
            guildOnly: true,
        });
    }

    async run (message) {
        discordServices.deleteMessage(message);

        // can only be called my staff
        if (!(await discordServices.checkForRole(message.member, discordServices.staffRole))) {
            discordServices.replyAndDelete(message, 'Hey there, the !starttf command is only for staff!');
            return;
        }
        // can only be called in the team formation information channel
        if (message.channel.id != discordServices.teamformationChannel) {
            discordServices.replyAndDelete(message, 'Hey there, the !starttf command is only available in the create-channel channel.');
            return;
        }

        // grab current channel
        var channel = message.channel;
                
        // create and send embed message to channel with emoji collector
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Team Formation Information')
            .setDescription('Welcome to the team formation section! If you are looking for a team or need a few more memebers to complete your ultimate group, you are in the right place!')
            .addField('How does this work?', 'Teams and hackers will react to this message, the bot will send them a template they need to fill out and send back to the bot via DM.' +
            'Then the bot will post the team\'s or hacker\'s information in the respective channels. Other hackers or teams can then browse the channels and reach out to those intersted ' +
            'by reacting to the post.')
            .addField('Disclaimer!!', 'By participating in this activity you consent to letting the bot iniciate a conversation between you and other teams or hackers.')
            .addField('Teams looking for a new members', 'React with 🚎 and the bot will send you instructions.')
            .addField('Hacker looking for a team', 'React with 🏍️ and the bot will send you isntructions.')
        
        var cardMessage = await channel.send(msgEmbed);

        await cardMessage.react('🚎');
        await cardMessage.react('🏍️');

        // collect form reaction collector and its filter
        const emojiFilter = (reaction, user) => !user.bot && (reaction.emoji.name === '🏍️' || reaction.emoji.name === '🚎');
        var mainCollector = await cardMessage.createReactionCollector(emojiFilter);

        mainCollector.on('collect', async (reaction, user) => {
            await this.reachOutToHacker(reaction, user, message);
        });
        
    }


    // send message with instructions to hacker, will also collect the form to send it to the correct channel
    async reachOutToHacker(reaction, user, message) {
        // boolean if team or hacker, depends on emoji used
        var isTeam = reaction.emoji.name === '🚎';

        const dmMessage = new Discord.MessageEmbed();

        // branch between team and hacker
        if (isTeam) {
            dmMessage.setTitle('Team Formation - Team Format');
            dmMessage.setDescription('We are very exited for you to find your perfect team members! Please copy and paste the following format in your next message. ' +
                'Try to respond to all the sections! Once you are ready to submit, please react to this message with 🇩 and then send me your information!\n' +
                'Once you find a hacker, please come back and click the ⛔ emoji.');
            dmMessage.addField('Format:', 'This \n is a \n format!');
        } else {
            dmMessage.setTitle('Team Formation - Hacker Format');
            dmMessage.setDescription('We are very exited for you to find your perfect team! Please copy and paste the following format in your next message. ' +
                'Try to respond to all the sections! Once you are ready to submit, please react to this message with 🇩 and then send me your information!\n' +
                'Once you find a team, please come back and click the ⛔ emoji.');
            dmMessage.addField('Format:', 'This \n is a \n format!');
        }

        // send message to hacker via DM
        var dmMsg = await user.send(dmMessage);
        await dmMsg.react('🇩');  // emoji for user to send form to bot


        // user sends form to bot collector and filter
        const filter = (reaction, user) => (reaction.emoji.name === '🇩') && user.bot === false;
        const dmCollector = await dmMsg.createReactionCollector(filter, { max: 1 });

        dmCollector.on('collect', async (r) => {
            await this.gatherForm(user, isTeam, message, dmMsg);
        });
    }


    // will get the form from the user in the DM and publish it in the correct channel
    async gatherForm(user, isTeam, message, dmMsg) {
        // promt user
        var confDm = await user.send('Please send me your completed form, if you do not follow the form your post will be deleted! You have 10 seconds to send your information.');

        // await form from user for 10 seconds max
        confDm.channel.awaitMessages(m => true, { max: 1, time: 10000, errors: ['time'] }).then(async (msgs) => {
            // user msg and its content (form)
            var msg = msgs.first();
            var content = msg.content;

            var sentMessage;

            const publicEmbed = new Discord.MessageEmbed()
                .setTitle('Information about them can be found below:')
                .setDescription(content)

            if (isTeam) {
                // set color
                publicEmbed.setColor(discordServices.tfTeamEmbedColor);
                // get recruiting channel and send message
                var channel = message.guild.channels.cache.get(discordServices.recruitingChannel);
                sentMessage = await channel.send('<@' + user.id + '> and their team are looking for more team members!', {embed: publicEmbed});
            } else {
                //
                publicEmbed.setColor(discordServices.tfHackerEmbedColor);
                // get looking for team channel and send message
                var channel = message.guild.channels.cache.get(discordServices.lookingforteamChannel);
                sentMessage = await channel.send('<@' + user.id + '>  is looking for a team to join!', {embed: publicEmbed});
            }

            // we would want to remove their message, but that is not possible!


            // add remove form emoji and collector
            await dmMsg.react('⛔');

            const removeFilter = (reaction, user) => reaction.emoji.name === '⛔' && !user.bot;
            const removeCollector = await dmMsg.createReactionCollector(removeFilter, { max: 1 });

            removeCollector.on('collect', async (reac, user) => {
                // remove message sent to channel
                discordServices.deleteMessage(sentMessage);

                // confirm deletion
                user.send('This is great! You are now ready to hack! Have fun with your new team! Your message has been deleted.').then(msg => msg.delete({ timeout: 5000 }));

                // remove this message
                dmMsg.delete();
            });

            // confirm the post has been received
            if (isTeam) {
                user.send('Thanks for sending me your information, you should see it pop up in the respective channel under the team formation category.' +
                    'Once you find your members please react to my original message with ⛔ so I can remove your post. Happy hacking!!!').then(msg => msg.delete({ timeout: 5000 }));
            } else {
                user.send('Thanks for sending me your information, you should see it pop up in the respective channel under the team formation category.' +
                    'Once you find your ideal team please react to my original message with ⛔ so I can remove your post. Happy hacking!!!').then(msg => msg.delete({ timeout: 5000 }));
            }

            // remove the promt message from the bot in the DM channel
            await confDm.delete();
        }).catch((reason) => {
            console.log(reason);
        });
    }
}