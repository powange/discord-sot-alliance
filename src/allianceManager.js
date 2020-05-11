'use strict';
const Discord = require('discord.js');
const {Guild, Collection} = require('discord.js');
const Configstore = require('configstore');
const Alliance = require('./alliance');

let instance = {};

module.exports = class AllianceManager {

    /**
     * @param guild {Guild}
     * @returns {AllianceManager}
     */
    static getInstance(guild) {
        if (!instance.hasOwnProperty(guild.id)) {
            instance[guild.id] = new AllianceManager(guild)
        }

        return instance[guild.id];
    }

    /**
     * @param guild {Guild}
     */
    constructor(guild) {
        /**
         * The guild this Manager belongs to
         * @type {Guild}
         * @readonly
         */
        this.guild = guild;

        /**
         * @type {Configstore}
         */
        this.config = new Configstore(guild.id, {alliances: {}});
        let alliances = this.config.get('alliances');

        this.alliances = new Collection();
        for (var key in alliances) {
            let alliance = new Alliance(this.guild);
            alliance.categoryChannelID = alliances[key].categoryChannelID;
            alliance.textChannelID = alliances[key].textChannelID;
            alliance.voiceChannelID = alliances[key].voiceChannelID;
            alliance.messageID = alliances[key].messageID;
            alliance.amount = alliances[key].amount;
            alliance.boatType = alliances[key].boatType;
            alliance.countdownFile = alliances[key].countdownFile;
            alliance.muteMembers = alliances[key].muteMembers;
            alliance.proprietaireID = alliances[key].proprietaireID;
            alliance.participants = alliances[key].participants;
            this.alliances.set(alliance.categoryChannelID, alliance);
        }
    }

    /**
     * @type {Collection}
     */
    alliances = null;

    /**
     * @type {{sloop: number, brigantin: number, galion: number}}
     */
    maxByBoat = {
        'sloop': 2,
        'brigantin': 3,
        'galion': 4
    };

    /**
     * @param guildMember {GuildMember}
     * @param boatType {string}
     * @param amount {int}
     */
    create(guildMember, boatType, amount) {
        let alliance = new Alliance(this.guild);
        alliance.proprietaireID = guildMember.id;
        alliance.boatType = boatType;
        alliance.amount = amount;

        return this.guild.channels.create(`Alliance ${amount} ${boatType}s`, {
            type: 'category',
            reason: 'Need a new temporary category for the creation of an alliance.'
        })
            .then(GuildChannel => {
                alliance.categoryChannelID = GuildChannel.id;

                const createText = this.guild.channels.create(`creation`, {
                    type: 'text',
                    reason: 'Need a new temporary text channel for the creation of an alliance.',
                    parent: GuildChannel
                }).then((TextChannel) => {
                    console.log('Promise createText Finished');
                    alliance.textChannelID = TextChannel.id;
                });

                const createVoice = this.guild.channels.create(`Vocal`, {
                    type: 'voice',
                    reason: 'Need a new temporary voice channel for the creation of an alliance.',
                    parent: GuildChannel,
                    userLimit: this.maxByBoat[boatType] * amount
                }).then((VoiceChannel) => {
                    console.log('Promise createVoice Finished');
                    alliance.voiceChannelID = VoiceChannel.id;
                });

                return Promise.all([createText, createVoice]).then(($arr) => {
                    console.log('Promises Finished', $arr);
                    this.saveAlliance(alliance);
                    alliance.updateMessageEmbed();
                    return alliance;
                });


            })
            .catch(GuildChannel => console.error(GuildChannel));
    };


    /**
     * @param alliance {Alliance}
     */
    saveAlliance(alliance) {
        this.alliances.set(alliance.categoryChannelID, alliance);
        this.saveAlliances();
    }

    saveAlliances() {
        let alliances = {};
        this.alliances.each(a => {
            alliances[a.categoryChannelID] = {
                'guildChannelID': a.guildChannelID,
                'categoryChannelID': a.categoryChannelID,
                'textChannelID': a.textChannelID,
                'voiceChannelID': a.voiceChannelID,
                'messageID': a.messageID,
                'proprietaireID': a.proprietaireID,
                'participants': a.participants,
                'amount': a.amount,
                'boatType': a.boatType,
                'countdownFile': a.countdownFile,
                'muteMembers': a.muteMembers
            }
        });
        this.config.set('alliances', alliances);
    }

    /**
     * @param categoryChannelID {string}
     * @returns {null|Alliance}
     */
    getAlliance(categoryChannelID) {
        if (this.alliances.has(categoryChannelID)) {
            let allianceDatas = this.alliances.get(categoryChannelID);
            let alliance = new Alliance(Guild);
            alliance.categoryChannelID = allianceDatas.categoryChannelID;
            alliance.textChannelID = allianceDatas.textChannelID;
            alliance.voiceChannelID = allianceDatas.voiceChannelID;
            alliance.messageID = allianceDatas.messageID;
            alliance.participants = allianceDatas.participants;
            alliance.amount = allianceDatas.amount;
            alliance.boatType = allianceDatas.boatType;
            alliance.countdownFile = allianceDatas.countdownFile;
            return alliance;
        }
        return null;
    }

    /**
     * @param categoryChannelID {string}
     * @returns {Promise<Holds>}
     */
    async deleteAllianceByCategoryID(categoryChannelID) {
        console.log('Delete alliance by caetgoryID ' + categoryChannelID);
        this.alliances.delete(categoryChannelID);
        this.saveAlliances();

        let channel = this.guild.channels.cache.get(categoryChannelID);
        const subChannels = this.guild.channels.cache.filter(c => c.parentID === categoryChannelID);

        for (const [subChannelID, subChannel] of subChannels) {
            await subChannel.delete();
            console.log('Delete channel ' + subChannel.type + ' "' + subChannel.name + '" (' + subChannel.id + ')');
        }

        if (channel) {
            await channel.delete();
            console.log('Delete channel ' + channel.type + ' "' + channel.name + '" (' + channel.id + ')');
            return channel;
        }
    }

    /**
     *
     * @param reaction {MessageReaction}
     * @param user {GuildMember}
     * @param alliance {Alliance}
     */
    addReaction(reaction, user, alliance) {

        if (reaction.emoji.name === '🤚') {
            alliance.addParticipant(user).then(participant => {
                this.saveAlliance(alliance);
                alliance.updateMessageEmbed();
            }).catch(err => console.log(err));
            return;
        }

        if (alliance.isAFK(user)) {
            alliance.unsetAFK(user);
            alliance.updateMessageEmbed();
        }

        if (reaction.emoji.name === '⚓') {
            alliance.setReady(user).then(participant => {
                this.saveAlliance(alliance);
                alliance.updateMessageEmbed();

                if (Object.keys(alliance.participants).length >= alliance.amount && alliance.allParticipantsReady()) {
                    alliance.launchCountdown();
                }
            }).catch(err => {
                reaction.users.remove(user);
            });
        } else if (reaction.emoji.name === '🗑️') {
            alliance.unsetIp(user).then(participant => {
                this.saveAlliance(alliance);
                alliance.updateMessageEmbed();
                reaction.users.remove(user);
            }).catch(err => {
                reaction.users.remove(user);
            });
        } else if (reaction.emoji.name === '⏳') {
            alliance.setSkip(user).then(participant => {
                this.saveAlliance(alliance);
                alliance.updateMessageEmbed();

                if (alliance.countParticipants() >= alliance.amount && alliance.allParticipantsReady()) {
                    alliance.launchCountdown();
                }
            }).catch(err => {
                console.log(err);
                reaction.users.remove(user);
            });
        } else if (alliance.proprietaireID === user.id) {
            if (reaction.emoji.name === '🔄') {
                alliance.resetLaunch().then(participant => {
                    reaction.message.reactions.cache.each(MessageReaction => {
                        let emoji = MessageReaction.emoji.name;
                        let emojiToDelte = ['⚓', '🗑️', '⏳', '🔄'];
                        if (emojiToDelte.includes(emoji)) {
                            MessageReaction.users.fetch().then(users => {
                                users;
                            });
                            MessageReaction.users.cache.filter(u => u.bot === false).each(u => {
                                MessageReaction.users.remove(u);
                            });
                        }
                    })

                    this.saveAlliance(alliance);
                    alliance.updateMessageEmbed();
                }).catch(err => {
                    console.log(err);
                    reaction.users.remove(user);
                });
            } else if (reaction.emoji.name === '❌') {
                reaction.message.channel.send(`Êtes-vous sûr de vouloir supprimer définitivement la création d'alliance ?\n\🚫 Non\n\✅ Oui\n\nDonnez votre réponse en utilisant la réaction de votre choix ci-dessous.`).then((messageConfirmation) => {

                    messageConfirmation.react('🚫');
                    messageConfirmation.react('✅');

                    const filter = (r, u) => {
                        return ['✅', '🚫'].includes(r.emoji.name) && user.id === u.id;
                    };
                    messageConfirmation.awaitReactions(filter, {time: 60000, max: 1, errors: ['time']})
                        .then(collected => {
                            const r = collected.first();

                            if (r.emoji.name === '✅') {
                                this.deleteAllianceByCategoryID(alliance.categoryChannelID);
                            } else {
                                messageConfirmation.delete();
                                reaction.users.remove(user);
                            }

                        })
                        .catch(() => {
                            message.reply('you reacted with neither a check, nor a stop.');
                        });
                });

            }
        } else {
            reaction.users.remove(user);
        }

    }

    /**
     * @param reaction
     * @param user
     * @param alliance {Alliance}
     */
    removeReaction(reaction, user, alliance) {
        if (alliance.isAFK(user)) {
            alliance.unsetAFK(user);
            alliance.updateMessageEmbed();
        }

        if (reaction.emoji.name === '🤚') {
            alliance.removeParticipant(user).then(participant => {
                this.saveAlliance(alliance);
                alliance.updateMessageEmbed();
                reaction.message.reactions.cache.each(MessageReaction => {
                    MessageReaction.users.remove(user);
                })
            }).catch(err => console.log(err));
        } else if (reaction.emoji.name === '⚓') {
            alliance.unsetReady(user).then(participant => {
                this.saveAlliance(alliance);
                alliance.updateMessageEmbed();
            }).catch(err => {
                reaction.users.remove(user);
            });
        } else if (reaction.emoji.name === '⏳') {
            alliance.unsetSkip(user).then(participant => {
                this.saveAlliance(alliance);
                alliance.updateMessageEmbed();
            }).catch(err => {
                console.log(err);
                reaction.users.remove(user);
            });
        } else {
            reaction.users.remove(user);
        }
    }

    /**
     * @param user {GuildMember}
     * @param alliance {Alliance}
     * @returns {Promise<GuildMember>}
     */
    async setProprietaireID(user, alliance) {
        await alliance.setProprietaireID(user).then(u => {
            this.saveAlliance(alliance);
            alliance.updateMessageEmbed();
        }).catch(err => console.log(err));
        return user;
    }
}