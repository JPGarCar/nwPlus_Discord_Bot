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
        if ((await discordServices.checkForRole(message.member, discordServices.staffRole))) {
            // can only be called in the team formation information channel
            if (message.channel.id === discordServices.teamformationChannel) {
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

                // filter for emoji collector, make sure its not bot!
                const emojiFilter = (reaction, user) => {
                    return user.id != cardMessage.author.id && reaction.emoji.name === '🏍️' || reaction.emoji.name === '🚎';
                };

                // set collector
                var mainCollector = await cardMessage.createReactionCollector(emojiFilter);

                mainCollector.on('collect', async (reaction, user) => {

                    // boolean if team or hacker
                    var isTeam = reaction.emoji.name === '🚎';

                    const dmMessage = new Discord.MessageEmbed();

                    // branch between team and hacker
                    if (isTeam) {
                        dmMessage.setTitle('Team Formation - Team Format');
                        dmMessage.setDescription('We are very exited for you to find your perfect team members! Please copy and paste the following format in your next message. ' +
                        'Try to respond to all the sections! Once you are ready to submit, please react to this message with 🇩 and then send me your information!');
                        dmMessage.addField('Format:', 'This \n is a \n format!');
                    } else {
                        dmMessage.setTitle('Team Formation - Hacker Format');
                        dmMessage.setDescription('We are very exited for you to find your perfect team! Please copy and paste the following format in your next message. ' +
                        'Try to respond to all the sections! Once you are ready to submit, please react to this message with 🇩 and then send me your information!');
                        dmMessage.addField('Format:', 'This \n is a \n format!');
                    }

                    // send message to hacker via DM
                    var dmMsg = await user.send(dmMessage);
                    
                    // add done/ready reaction
                    await dmMsg.react('🇩');


                    // general filter for user input only, not the bot!
                    const filter = (reaction, user) => (reaction.emoji.name === '🇩') && user.bot === false;

                    // await one reaction
                    const dmCollector = await dmMsg.createReactionCollector(filter, {max: 1});
                    
                    dmCollector.on('collect' , async r => {

                        var confDm = await user.send('Please send me your completed form, if you do not follow the form your post will be deleted! You have 10 seconds to send your information.');

                        // no need for filter
                        const trueFilter = m => true;

                        // await type of channel
                        confDm.channel.awaitMessages(trueFilter, {max: 1, time: 10000, errors: ['time']}).then(async (msgs) => {
                            // given list
                            var msg = msgs.first();

                            var content = msg.content;

                            // message sent to either channel
                            var sentMessage;

                            // add post to corresponding channel
                            if (isTeam) {
                                // channel to send post to 
                                var channel = message.guild.channels.cache.get(discordServices.recruitingChannel);

                                // send message
                                sentMessage = await channel.send('<@' + user.id +'> and their team is looking for more team members! Information about them can be found below:\n' + content);
                            } else {
                                // channel to send post to 
                                var channel = message.guild.channels.cache.get(discordServices.lookingforteamChannel);

                                // send message
                                sentMessage = await channel.send('<@' + user.id +'>  is looking for a team to join! Information about them can be found below:\n' + content);
                            }

                            // we would want to remove their message, but that is not possible!

                            // add remove reaction
                            await dmMsg.react('⛔');

                            // filter for remove reaction
                            const removeFilter = (reaction, user) => reaction.emoji.name === '⛔' && user.bot === false;

                            // add reaction collector for remove emoji
                            const removeCollector = await dmMsg.createReactionCollector(removeFilter, {max: 1});

                            removeCollector.on('collect', async (reac, user) => {
                                // remove message sent to channel
                                sentdiscordServices.deleteMessage(message);

                                // confirm deletion
                                user.send('This is great! You are now ready to hack! Have fun with your new team! Your message has been deleted.').then(msg => msg.delete({timeout: 5000}));
                                
                                // remove this message
                                dmMsg.delete();
                            });

                            // confirm the post has been received
                            if (isTeam) {
                                user.send('Thanks for sending me your information, you should see it pop up in the respective channel under the team formation category.' +
                                'Once you find your members please react to my original message with ⛔ so I can remove your post. Happy hacking!!!').then(msg => msg.delete({timeout: 5000}));
                            } else {
                                user.send('Thanks for sending me your information, you should see it pop up in the respective channel under the team formation category.' +
                                'Once you find your ideal team please react to my original message with ⛔ so I can remove your post. Happy hacking!!!').then(msg => msg.delete({timeout: 5000}));
                            }

                            // remove the messages
                            await confDm.delete();
                        }).catch((reason) => {
                            console.log(reason);
                        });
                    });
                });
            } else {
                discordServices.replyAndDelete(message, 'Hey there, the !starttf command is only available in the create-channel channel.');
            }
        } else {
            discordServices.replyAndDelete(message, 'Hey there, the !starttf command is only for staff!');
        }
        
    }

}