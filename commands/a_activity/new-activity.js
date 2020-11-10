// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseActivity = require('../../firebase-services/firebase-services-activities');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class NewActivity extends Command {
    constructor(client) {
        super(client, {
            name: 'newactivity',
            group: 'a_activity',
            memberName: 'create a new activity',
            description: 'Will create a category, a text channel and voice channel for the given activity name.',
            guildOnly: true,
            args: [
                {
                    key: 'activityName',
                    prompt: 'the activity name',
                    type: 'string',
                    validate: (val) => {
                        return ! (val.indexOf(' ') >= 0);
                    }

                },
            ],
        });
    }

    // Run function -> command body
    async run(message, {activityName}) {
        discordServices.deleteMessage(message);
        // make sure command is only used in the admin console
        if (discordServices.isAdminConsole(message.channel) === true) {
            // only memebers with the Hacker tag can run this command!
            if ((await discordServices.checkForRole(message.member, discordServices.adminRole))) {
                // Create category
                var category = await message.guild.channels.create(activityName, {type: 'category',  permissionOverwrites: [
                    {
                        id: discordServices.hackerRole,
                        deny: ['VIEW_CHANNEL'],
                    },
                    {
                        id: discordServices.attendeeRole,
                        allow: ['VIEW_CHANNEL'],
                    },
                    {
                        id: discordServices.mentorRole,
                        allow: ['VIEW_CHANNEL'],
                    },
                    {
                        id: discordServices.sponsorRole,
                        allow: ['VIEW_CHANNEL'],
                    },
                    {
                        id: discordServices.staffRole,
                        allow: ['VIEW_CHANNEL'],
                    }
                ]});

                // create text channel
                message.guild.channels.create(activityName + '-text', {type: 'text', parent: category,});

                // create general voice
                message.guild.channels.create(activityName + '-general-voice', {type: 'voice', parent: category});

                // create workshop in db
                firebaseActivity.create(activityName);

                // report success of activity creation
                discordServices.replyAndDelete(message,'Activity session named: ' + activityName + ' created succesfully. Any other commands will require this name as paramter.');

                // send message to console with emoji commands
                // message embed
                const msgEmbed = new Discord.MessageEmbed()
                    .setColor(discordServices.embedColor)
                    .setTitle('Activity: ' + activityName + ' console.')
                    .setDescription('This activity\'s information is below. For any changes you can use the emojis or direct commands.\n' + 
                    '🧑🏽‍💼 Will make this activity a workshop.\n' + 
                    '☕ Will make this activity a coffee chat!\n' + 
                    '⏫ Will add voice channels, will be private if this is a workshop.\n' + 
                    '⏬ Will remove voice channels.\n' + 
                    '⛔ Will remove the activity and this message!\n' + 
                    '🌬️ Will shuffle all the users in the general voice channel over all possible channels.\n' +
                    '🔃 Will callback all users from all channels to the general channel.\n' + 
                    '👨‍👩‍👧‍👦 Will shuffle all the groups around the available channels.\n' + 
                    '🦜 Will shuffle all the mentors around the available channels.\n'); 

                // send message
                var msgConsole = await message.channel.send(msgEmbed);

                // emojis
                var emojis = ['🧑🏽‍💼', '☕', '⏫', '⏬', '⛔', '🌬️', '🔃', '👨‍👩‍👧‍👦', '🦜'];

                // respond to message with emojis
                emojis.forEach(emoji => msgConsole.react(emoji));

                // filter
                const emojiFilter = (reaction, user) => user.bot != true && emojis.includes(reaction.emoji.name);

                // create collector
                const emojiCollector = await msgConsole.createReactionCollector(emojiFilter);

                // on emoji reaction
                emojiCollector.on('collect', async (reaction, user) => {
                    // get commando registry
                    var commandRegistry = this.client.registry;

                    // emoji name
                    var emojiName = reaction.emoji.name;

                    // remove new reaction
                    reaction.users.remove(user.id);

                    // init workshop
                    if (emojiName === emojis[0]) {
                        // init workshop command
                        commandRegistry.findCommands('initw', true)[0].run(message, {activityName: activityName});

                        // update embed
                        msgEmbed.addField('Update', 'The activity is now a Workshop!');
                        msgConsole.edit(msgEmbed);
                    } else if (emojiName === emojis[4]) {
                        commandRegistry.findCommands('removeactivity', true)[0].run(message, {activityName: activityName});
                        msgConsole.delete({timeout: 3000});
                    } else if (emojiName === emojis[1]) {
                        // grab number of groups
                        var numOfGroups = await message.channel.send('<@' + user.id + '> How many groups do you want?').then(async msg => {
                            return await msg.channel.awaitMessages(m => m.author.id === user.id, {max: 1}).then(msgs => {
                                msg.delete({timeout: 3000});
                                msgs.forEach(msg => msg.delete({timeout: 3000}));
                                return parseInt(msgs.first().content);
                            });
                        });

                        // check that a number was given
                        if (Number.isNaN(numOfGroups)) {
                            message.channel.send('<@' + user.id + '> The number of groups is not a number, please try again!').then(msg => msg.delete({timeout: 5000}));
                            return;
                        }

                        commandRegistry.findCommands('initcc', true)[0].run(message, {activityName: activityName, numOfGroups: numOfGroups});

                        // update embed
                        msgEmbed.addField('Update', 'The activity is now a Coffee Chat!');
                        msgConsole.edit(msgEmbed);
                    } else if (emojiName === emojis[2]) {
                        commandRegistry.findCommands('addvoiceto', true)[0].run(message, {activityName: activityName, number: 1});
                    } else if (emojiName === emojis[3]) {
                        commandRegistry.findCommands('removevoiceto', true)[0].run(message, {activityName: activityName, number: 1});
                    } else if (emojiName === emojis[5]) {
                        commandRegistry.findCommands('shuffle', true)[0].run(message, {activityName: activityName});
                    } else if (emojiName === emojis[6]) {
                        commandRegistry.findCommands('callback', true)[0].run(message, {activityName: activityName});
                    } else if (emojiName === emojis[7]) {
                        commandRegistry.findCommands('gshuffle', true)[0].run(message, {activityName: activityName});
                    } else if (emojiName === emojis[8]) {
                        commandRegistry.findCommands('mshuffle', true)[0].run(message, {activityName: activityName});
                    }
                });

            } else {
                discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            }
        } else {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
        }
    }

};