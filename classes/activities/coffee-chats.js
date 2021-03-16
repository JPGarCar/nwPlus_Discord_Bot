const Activity = require('./activity');
const { MessageEmbed, TextChannel, User, GuildMember, Collection, VoiceChannel } = require('discord.js');
const { memberPrompt, chooseChannel } = require('../prompt');
const winston = require('winston');
const { sendMsgToChannel } = require('../../discord-services');

/**
 * A CoffeeChat is a special activity where users join as a team. The teams are then 
 * scattered around in voice channels to talk with mentors or other teams.
 * @class
 * @extends Activity
 */
class CoffeeChats extends Activity {

    /**
     * Basic constructor for a coffee chats.
     * @param {Activity.ActivityInfo} activityInfo 
     * @param {Number} numOfTeams
     */
    constructor(activityInfo, numOfTeams) {
        super(activityInfo);

        /**
         * A collection of the groups that will attend this coffee chat.
         * @type {Collection<Number, GuildMember[]>} - <group number, group members as array>
         */
        this.teams = new Collection();

        /**
         * The number of groups available in this coffee chat
         * @type {Number}
         */
        this.numOfTeams = numOfTeams || 0;

        /**
         * The channel where users join the activity.
         * @type {TextChannel}
         */
        this.joinActivityChannel;

        /**
         * The main voice channel where everyone starts.
         * @type {VoiceChannel}
         */
        this.mainVoiceChannel;

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} was created as a coffee chats.`, {event: 'Activity'});
    }

    /**
     * Initializes the activity by creating the necessary channels.
     * @returns {Promise<CoffeeChats>}
     * @param {TextChannel} channel
     * @param {String} userId
     * @override
     */
    async init(channel, userId) {
        await super.init();

        this.mainVoiceChannel = await chooseChannel('What channel will the teams join first before being shuffled?', this.room.channels.voiceChannels.array(), channel, userId);
        this.room.channels.safeChannels.set(this.mainVoiceChannel.id, this.mainVoiceChannel);

        for (var i = 0; i < this.numOfTeams; i++) {
            this.room.addRoomChannel({name: `voice-${i}`, info: {type: 'voice'}});
        }

        this.joinActivityChannel = await this.room.addRoomChannel({
            name: '☕' + 'join-activity', 
            info: {
                type: 'text',
                topic: 'This channel is only intended to add your team to the activity list! Please do not use it for anything else!',
            }, 
            isSafe: true
        });

        this.joinActivityConsole();

        return this;
    }


    /**
     * @override
     */
    addDefaultFeatures() {
        /** @type {Activity.ActivityFeature[]} */
        let localFeatures = [
            {
                name: 'Team Shuffle',
                description: 'Shuffle all the teams from the main voice channel to the other channels.',
                emoji: '👨‍👩‍👧‍👦',
                callback: () => this.groupShuffle(),
            },
            {
                name: 'Reset Teams',
                description: 'Remove all the signed up teams.',
                emoji: '🗜️',
                callback: () => this.resetTeams(),
            },
            {
                name: 'Add Team Slot',
                description: 'Adds a team slot and a voice channel for them.',
                emoji: '☝️',
                callback: () => this.addTeamSlot(),
            }
        ];

        localFeatures.forEach(feature => this.features.set(feature.name, feature));

        super.addDefaultFeatures();
    }


    /**
     * Will send the console for users to join the activity as a group.
     * @private
     * @async
     */
    async joinActivityConsole() {
        // reaction to use
        var emoji = '⛷️';

        // send embed and react with emoji
        const msgEmbed = new MessageEmbed()
            .setColor(this.botGuild.colors.embedColor)
            .setTitle('Join the activity!')
            .setDescription('If you want to join this activity, please react to this message with ' + emoji +' and follow my instructions!\n If the emojis are not working' +
            ' it means the activity is full. Check the activity text channel for other activity times!');
        var joinMsg = await this.joinActivityChannel.send(msgEmbed);
        await joinMsg.react(emoji);

        // reactor collector and its filter
        const emojiFilter = (reaction, user) => !user.bot && reaction.emoji.name === emoji;
        const emojiCollector = joinMsg.createReactionCollector(emojiFilter);

        emojiCollector.on('collect', async (reaction, user) => {

            // check to make sure there are spots left
            if (this.teams.size > this.numOfTeams) {
                sendMsgToChannel(this.joinActivityChannel, user.id, 'Sorry, but the activity is full!', 10);
                return;
            }

            let members = await memberPrompt({prompt: 'Who are you team members? Let me know in ONE message!', channel: this.joinActivityChannel, userId: user.id});

            // add team captain to members list
            members.set(user.id, this.guild.member(user));

            // add the team to the team list
            this.teams.set(this.teams.size, members.array());

            this.joinActivityChannel.send('<@' + user.id + '> Your team has been added to the activity! Make sure you follow the instructions in the main channel.').then(msg => {
                msg.delete({ timeout: 5000 });
            });
        });
    }

    /**
     * FEATURES FROM THIS POINT DOWN.
     */


    /**
     * Shuffle users in general voice as groups in firebase
     */
    groupShuffle() {
        let channels = this.room.channels.voiceChannels;
        let voiceChannels = channels.filter(voiceChannel => voiceChannel.id != this.mainVoiceChannel.id).array();

        // loop over the groups and channels at the same time using an index, add users for each group in a single voice channel
        for (var index = 0; index < this.teams.size; index++) {
            this.teams.get(index).forEach(member => {
                try {
                    if (member.voice.channel)
                        member.voice.setChannel(voiceChannels[index % voiceChannels.length]);
                } catch (error) {
                    // do nothing, sad!
                    winston.loggers.get(this.guild.id).warning(`For activity named ${this.name} I could not pull in user ${member.id} into the voice channel ${voiceChannels[index].name}.`, { event: 'Coffee Chats' });
                }
            });
        }

        winston.loggers.get(this.guild.id).event(`Activity named ${this.name} had its groups shuffled.`, { event: 'Coffee Chats' });
    }


    /**
     * Resets the teams to have no teams.
     */
    resetTeams() {
        this.teams = new Collection();
    }
    

    /**
     * Add a team slot to the activity and adds a voice channel for them.
     */
    addTeamSlot() {
        this.numOfTeams += 1;
        this.room.addRoomChannel({name: `voice-${this.numOfTeams - 1}`, info: { type: 'voice' }}); // -1 because we start from 0
    }

}

module.exports = CoffeeChats;