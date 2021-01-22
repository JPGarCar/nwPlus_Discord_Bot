// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Prompt = require('../../classes/prompt.js');
const Team = require('../../classes/team');

// Command export
module.exports = class StartTeamRoulette extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'starttr',
            group: 'a_start_commands',
            memberName: 'start team roulette',
            description: 'Send a message with emoji collector, solos, duos or triplets can join to get assigned a random team.',
            guildOnly: true,
        },
        {
            roleID: discordServices.staffRole,
            roleMessage: 'Hey there, the !starttf command is only for staff!',
            channelID: discordServices.teamRouletteChannel,
            channelMessage: 'Hey there, the !starttf command is only available in the team formation channel.',
        });
    }

    /**
     * 
     * @param {Discord.Message} message - the message in which the command was run
     */
    async runCommand(message) {

        /**
         * The solo join emoji.
         * @type {String} - an emoji string
         */
        this.soloEmoji = '🏃🏽';

        /**
         * The non solo join emoji.
         * @type {String} - an emoji string
         */
        this.teamEmoji = '👯';

        /**
         * The team list from which to create teams.
         * @type {Discord.Collection<Number, Array<Team>} - <Team Size, List of Teams>
         */
        this.teamList = new Discord.Collection();

        /**
         * The current team number.
         * @type {Number}
         */
        this.teamNumber = 0;

        /**
         * All the users that have participated in the activity.
         * @type {Discord.Collection<Discord.Snowflake, User>}
         */
        this.participants = new Discord.Collection();

        this.initList();

        // grab current channel
        var channel = message.channel;
                
        // create and send embed message to channel with emoji collector
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Team Roulette Information')
            .setDescription('Welcome to the team rulette section! If you are looking to join a random team, you are in the right place!')
            .addField('How does this work?', 'Reacting to this message will get you or your team on a list. I will try to assing you a team of 4 as fast as possible. When I do I will notify you on a private text channel with your new team!')
            .addField('Disclaimer!!', 'By participating in this activity, you will be assigned a random team with random hackers! You can only use this activity once!')
            .addField('If you are solo', 'React with ' + this.soloEmoji + ' and I will send you instructions.')
            .addField('If you are in a team of two or three', 'React with ' + this.teamEmoji + ' and I will send you instructions.');
        
        var cardMessage = await channel.send(msgEmbed);
        cardMessage.react(this.soloEmoji);
        cardMessage.react(this.teamEmoji);

        // collect form reaction collector and its filter
        const emojiFilter = (reaction, user) => !user.bot && (reaction.emoji.name === this.soloEmoji || reaction.emoji.name === this.teamEmoji);
        var mainCollector = cardMessage.createReactionCollector(emojiFilter);

        mainCollector.on('collect', async (reaction, user) => {
            // creator check
            if (this.participants.has(user.id)) {
                discordServices.sendEmbedToMember(user, {
                    title: 'Team Roulette',
                    description: 'You are already signed up on the team roulette activity!',
                }, true);
                return;
            }

            // add team or solo to their team
            let newTeam = new Team(this.teamNumber);
            this.teamNumber ++;

            // add team leader
            newTeam.addTeamMember(user);

            if (reaction.emoji.name === this.teamEmoji) {
                let groupMsg = await Prompt.messagePrompt('Please mention all your current team members in one message. You mention by typing @friendName .', 'string', message.channel, user.id, 30);

                if (groupMsg === null) {
                    reaction.users.remove(user.id);
                    return;
                }

                let groupMembers = groupMsg.mentions.users;

                // remove any self mentions
                groupMembers.delete(user.id);

                // check if they have more than 4 team members
                if (groupMembers.array().length > 2) {
                    discordServices.sendEmbedToMember(user, {
                        title: 'Team Roulette',
                        description: 'You just tried to use the team roulette, but you mentioned more than 2 members. That should mean you have a team of 4 already! If you mentioned yourself by accident, try again!',
                    }, true);
                    return;
                }

                // delete any mentions of users already in the activity.
                groupMembers.forEach((sr, index) => {
                    if (this.participants.has(sr.id)) {
                        discordServices.sendEmbedToMember(user, {
                            title: 'Team Roulette',
                            description: 'We had to remove ' + sr.username + ' from your team roulette team because he already participated in the roulette.',
                        }, true);
                    } else {
                        // push member to the team list and activity list
                        newTeam.addTeamMember(sr);
                        this.participants.set(sr.id, sr);

                        discordServices.sendEmbedToMember(sr, {
                            title: 'Team Roulette',
                            description: 'You have been added to ' + user.username + ' team roulette team! I will ping you as soon as I find a team for all of you!',
                            color: '#57f542',
                        });
                    }
                });
            }

            this.teamList.get(newTeam.size()).push(newTeam);

            // add team leader or solo to activity list and notify of success
            this.participants.set(user.id, user);
            discordServices.sendEmbedToMember(user, {
                title: 'Team Roulette',
                description: 'You' + (reaction.emoji.name === this.teamEmoji ? ' and your team' : '') + ' have been added to the roulette. I will get back to you as soon as I have a team for you!',
                color: '#57f542',
            });

            this.runTeamCreator(message.guild.channels);
        });
        
    }

    /**
     * Will try to create a team and set them up for success!
     * @param {Discord.GuildChannelManager} channelManager
     * @async
     */
    async runTeamCreator(channelManager) {
        // call the team creator
        let team = await this.findTeam();

        // if no team then just return
        if (!team) return;

        // if team does NOT have a text channel
        if (!team?.textChannel) {
            let privateChannelCategory = channelManager.resolve(discordServices.channelcreationChannel).parent;

            await team.createTextChannel(channelManager, privateChannelCategory);

            let leaveEmoji = '👋';

            const infoEmbed = new Discord.MessageEmbed()
                .setColor(discordServices.embedColor)
                .setTitle('WELCOME TO YOUR NEW TEAM!!!')
                .setDescription('This is your new team, please get to know each other by creating a voice channel in a new Discord server or via this text channel. Best of luck!')
                .addField('Leav the Team', 'If you would like to leave this team react to this message with ' + leaveEmoji);

            let teamCard = await team.textChannel.send(infoEmbed);

            let teamCardCollection = teamCard.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === leaveEmoji);

            teamCardCollection.on('collect', (reaction, exitUser) => {
                // remove user from channel
                team.removeTeamMember(exitUser);

                // remove user from activity list
                this.participants.delete(exitUser.id);

                // search for more members depending on new team size
                if (team.size()) {
                    this.teamList.get(team.size()).push(team);
                    this.runTeamCreator(channelManager);
                }
            });
        }
    }


    /**
     * Will try to create teams with the current groups signed up!
     * @param {Number} teamSize - the size of the new team
     * @private
     * @returns {Promise<Team | null>}
     * @async
     */
    async findTeam(teamSize) {
        let newTeam;

        if (teamSize === 3) newTeam = await this.assignGroupOf3();
        else if (teamSize === 2) newTeam = await this.assignGroupOf2();
        else {
            if (this.teamList.get(3).length >=1) newTeam = await this.assignGroupOf3();
            else if (this.teamList.get(2).length >= 1) newTeam = await this.assignGroupOf2();
            else newTeam = await this.assignGroupsOf1();
        }
        return newTeam;
    }


    /**
     * Will assign a team of 3 with a team of 1.
     * @returns {Promise<Team | null>}
     * @requires this.groupList to have a team of 3.
     * @async
     */
    async assignGroupOf3() {
        let listOf1 = this.teamList.get(1);
        if (listOf1.length === 0) return null;
        let teamOf3 = this.teamList.get(3).shift();
        return await teamOf3.mergeTeam(listOf1.shift());
    }

    /**
     * Will assign a team of 2 with a team of 2 or two of 1
     * @returns {Promise<Team | null>}
     * @requires this.groupList to have a team of 2
     * @async
     */
    async assignGroupOf2() {
        let listOf2 = this.teamList.get(2);
        if (listOf2.length >= 2) {
            return listOf2.shift().mergeTeam(listOf2.shift());
        } else {
            let listOf1 = this.teamList.get(1);
            if (listOf1.length <= 1) return null;
            return await (await listOf2.shift().mergeTeam(listOf1.shift())).mergeTeam(listOf1.shift());
        }
    }

    /**
     * Assigns 4 groups of 1 together.
     * @returns {Promise<Team | null>}
     * @async
     */
    async assignGroupsOf1() {
        let groupOf1 = this.teamList.get(1);
        if (groupOf1.length < 4) return null;
        else return await (await (await groupOf1.shift().mergeTeam(groupOf1.shift())).mergeTeam(groupOf1.shift())).mergeTeam(groupOf1.shift());
    }


    /**
     * Initializes the team list by creating three key value pairs.
     * 1 -> empy array
     * 2 -> empy array
     * 3 -> empy array
     * @private
     */
    initList() {
        this.teamList.set(1, []);
        this.teamList.set(2, []);
        this.teamList.set(3, []);
    }
}