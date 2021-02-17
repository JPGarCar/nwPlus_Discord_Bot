const { TextChannel, Role, Collection, GuildEmoji, ReactionEmoji, Message, Emoji, GuildMember } = require("discord.js");
const discordServices = require('../discord-services');

/**
 * The Prompt class has useful static functions to prompt the user for information.
 */
class Prompt {

    /**
     * Common data for all prompts.
     * @typedef PromptInfo
     * @property {String} prompt - the text prompt to send to user
     * @property {TextChannel} channel - the channel to send the prompt to
     * @property {String} userId - the ID of the user to prompt
     */

    /**
     * Prompt the user for some text.
     * @param {PromptInfo} promptInfo - the common data, prompt, channel, userId
     * @param {String} responseType - the type of response, one of string, number, boolean, mention
     * @param {Number} [time] - the time in seconds to wait for the response, if 0 then wait forever
     * @returns {Promise<Message>} - the message response to the prompt or false if it timed out!
     * @throws Will throw an error if the user cancels the Prompt or it times out. Name: Cancel or Timeout
     * @async
     */
    static async messagePrompt({prompt, channel, userId}, responseType, time = 0) {

        let finalPrompt = '<@' + userId + '> ' + prompt + (responseType == 'number' ? ' Respond with a number only!' : responseType == 'boolean' ? ' (yes/no)' : responseType == 'mention' ? ' To make a mention use the @ or # for a user or channel respectively!' : '' + 
                        (time === 0 ? '' : '\n* Respond within ' + time + ' seconds.') + '\n* Respond with cancel to cancel.');

        // send prompt
        let promptMsg = await channel.send(finalPrompt);

        try {
            var msgs = await channel.awaitMessages(message => message.author.id === userId, {max: 1, time: time == 0 ? null : time * 1000, errors: ['time']});
        } catch (error) {
            channel.send('<@' + userId + '> Time is up, please try again once you are ready, we recommend you write the text, then react, then send!').then(msg => msg.delete({timeout: 10000}));
            discordServices.deleteMessage(promptMsg);
            let timeoutError = new Error('Prompt timed out.');
            timeoutError.name = 'Timeout'
            throw timeoutError;
        }

        let msg = msgs.first();

        discordServices.deleteMessage(promptMsg);
        if (msg.channel.type != 'dm') discordServices.deleteMessage(msg);

        // check if they responded with cancel
        if (msg.content.toLowerCase() === 'cancel') {
            let cancelError = new Error("The prompt has been canceled.");
            cancelError.name = 'Cancel'
            throw cancelError;
        }

        return msg;
    }


    /**
     * Prompt a user for a number, will ask again if not given a number.
     * @param {PromptInfo} promptInfo - the common data, prompt, channel, userId
     * @async
     * @returns {Promise<Array<Number>>} - an array of numbers
     * @throws Will throw an error if the user cancels the Prompt or it times out.
     */
    static async numberPrompt({prompt, channel, userId}) {
        let promptMsg = await Prompt.messagePrompt({prompt, channel, userId}, 'number');
        var invalid = false;
        let numbers = promptMsg.content.split(' ');
        numbers.forEach(num => {
            //let number = parseInt(num);
            if (isNaN(num)) invalid = true;
        });
        if (invalid) {
            discordServices.sendMsgToChannel(channel, userId, 'One of the numbers is invalid, please try again, numbers only!', 10);
            return Prompt.numberPrompt({prompt, channel, userId});
        } else {
            return numbers;
        }
    }
 
    /**
     * Prompts the user to respond to a message with an emoji.
     * @param {PromptInfo} promptInfo - the common data, prompt, channel, userId
     * @param {Collection<String, Emoji>} [unavailableEmojis] - <emoji name, emoji>, the emojis the user can't select, re-prompt if necessary
     * @async
     * @returns {Promise<GuildEmoji | ReactionEmoji>} - the message reaction
     */
    static async reactionPrompt({prompt, channel, userId}, unavailableEmojis = new Map()) {
        let reactionMsg = await channel.send('<@' + userId + '> ' + prompt + ' React to this message with the emoji.');
        let reactions = await reactionMsg.awaitReactions((reaction, user) => !user.bot && user.id === userId, {max: 1});
        discordServices.deleteMessage(reactionMsg);

        if (unavailableEmojis.has(reactions.first().emoji.name)) {
            channel.send('<@' + userId + '> The emoji you choose is already in use, please try again!').then(msg => msg.delete({timeout: 5000}));
            return this.reactionPrompt({prompt, channel, userId}, unavailableEmojis);
        }

        return reactions.first().emoji;
    }
  
      
    /**
     * Prompt the user for a yes/no answer and return true/false.
     * @param {PromptInfo} promptInfo - the common data, prompt, channel, userId
     * @async
     * @returns {Promise<Boolean>} - yes == true, no == false
     * @throws Will throw an error if the user cancels the Prompt or it times out.
     */
    static async yesNoPrompt({prompt, channel, userId}) {
        let promptMsg = await Prompt.messagePrompt({prompt, channel, userId}, 'boolean');
        if (promptMsg.content.toLowerCase() === 'no') return false;
        else if (promptMsg.content.toLowerCase() === 'yes') return true;
        else return Prompt.yesNoPrompt({prompt, channel, userId});
    }


    /**
     * Prompt the user for a channel mention.
     * @param {PromptInfo} promptInfo - the common data, prompt, channel, userId
     * @async
     * @returns {Promise<Collection<String, TextChannel>>} - the text channels prompted <ChannelId, TextChannel>
     * @throws Will throw an error if the user cancels the Prompt or it times out.
     */
    static async channelPrompt({prompt, channel, userId}) {
        let promptMsg = await Prompt.messagePrompt({prompt, channel, userId}, 'mention');
        let channels = promptMsg.mentions.channels;
        if (!channels.first()) {
            channel.send('<@' + userId + '> No channel was mentioned, try again!').then(msg => msg.delete({timeout: 8000}));
            return Prompt.channelPrompt({prompt, channel, userId});
        }
        else return channels;
    }


    /**
     * Prompt the user for a role mention.
     * @param {PromptInfo} promptInfo - the common data, prompt, channel, userId
     * @async
     * @returns {Promise<Collection<String, Role>>} - the roles prompted <RoleId, Role>
     * @throws Will throw an error if the user cancels the Prompt or it times out.
     */
    static async rolePrompt({prompt, channel, userId}) {
        let promptMsg = await Prompt.messagePrompt({prompt, channel, userId}, 'mention');
        let roles = promptMsg.mentions.roles;
        if (!roles.first()) {
            channel.send('<@' + userId + '> You did not mention a role, try again!').then(msg => msg.delete({timeout: 8000}));
            return Prompt.rolePrompt({prompt, channel, userId});
        }
        else return roles;
    }

    /**
     * Prompt the user for a member mention.
     * @param {PromptInfo} promptInfo - the common data, prompt, channel, userId
     * @async
     * @returns {Promise<Collection<String, GuildMember>>} - the members prompted <MemberId, GuildMember>
     * @throws Will throw an error if the user cancels the Prompt or it times out.
     */
    static async memberPrompt({prompt, channel, userId}) {
        let promptMsg = await Prompt.messagePrompt({prompt, channel, userId}, 'mention');
        let members = promptMsg.mentions.members;
        if (!members.first()) {
            channel.send('<@' + userId + '> You did not mention a member, try again!').then(msg => msg.delete({timeout: 8000}));
            return Prompt.rolePrompt({prompt, channel, userId});
        }
        else return members;
    }
}

module.exports = Prompt;