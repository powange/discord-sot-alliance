'use strict';

const Discord = require('discord.js');
const {Guild, Collection} = require('discord.js');
const Configstore = require('configstore');
const Alliance = require('./alliance');

let instance = {};

class AllianceManager {

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
            let alliance = new Alliance(alliances[key].guildChannelID);
            alliance.categoryChannelID = alliances[key].categoryChannelID;
            alliance.textChannelID = alliances[key].textChannelID;
            alliance.voiceChannelID = alliances[key].voiceChannelID;
            alliance.messageID = alliances[key].messageID;
            alliance.amount = alliances[key].amount;
            alliance.boatType = alliances[key].boatType;
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
     *
     * @param boatType {string}
     * @param amount {int}
     */
    create(boatType, amount) {
        let alliance = new Alliance(this.guild.id);
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
                    this.updateMessageEmbed(alliance);
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
                'participants': a.participants,
                'amount': a.amount,
                'boatType': a.boatType,
            }
        });
        this.config.set('alliances', alliances);
    }

    /**
     *
     * @param categoryChannelID
     * @returns {null|Alliance}
     */
    getAlliance(categoryChannelID) {
        if (this.alliances.has(categoryChannelID)) {
            let allianceDatas = this.alliances.get(categoryChannelID);
            let alliance = new Alliance(Guild, GuildChannel);
            alliance.categoryChannelID = allianceDatas.categoryChannelID;
            alliance.textChannelID = allianceDatas.textChannelID;
            alliance.voiceChannelID = allianceDatas.voiceChannelID;
            alliance.messageID = allianceDatas.messageID;
            alliance.participants = allianceDatas.participants;
            alliance.amount = allianceDatas.amount;
            alliance.boatType = allianceDatas.boatType;
            return alliance;
        }
        return null;
    }

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

        await channel.delete();
        console.log('Delete channel ' + channel.type + ' "' + channel.name + '" (' + channel.id + ')');
        return channel;
    }

    /**
     *
     * @param alliance {Alliance}
     */
    updateMessageEmbed(alliance) {
        let textChannel = this.guild.channels.cache.get(alliance.textChannelID);

        let participantsDisplay = [];
        let readyDisplay = [];
        let IPDisplay = [];

        for (var userID in alliance.participants) {
            let participant = alliance.participants[userID];
            let GuildMember = this.guild.member(userID);
            let username = GuildMember.nickname !== null ? GuildMember.nickname : GuildMember.user.username;

            // membersVoiceChannel.fetch();
            if (GuildMember.voice.channelID === alliance.voiceChannelID) {
                participantsDisplay.push('🔉 ' + username);
            } else {
                participantsDisplay.push(username);
            }

            if (participant.ready === true) {
                readyDisplay.push('⚓');
            } else {
                readyDisplay.push('-');
            }

            if (participant.ip !== '') {
                IPDisplay.push(participant.ip);
            } else {
                IPDisplay.push('-');
            }
        }

        if (participantsDisplay.length === 0) {
            participantsDisplay.push('-');
        }
        if (readyDisplay.length === 0) {
            readyDisplay.push('-');
        }
        if (IPDisplay.length === 0) {
            IPDisplay.push('-');
        }

        // console.log('participantsDisplay ==> ', participantsDisplay);
        // console.log('readyDisplay ==> ', readyDisplay);
        // console.log('IPDisplay ==> ', IPDisplay);

        const exampleEmbed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Création d\'alliance')
            .setDescription(`Cette alliance cherche à rassembler ${alliance.amount} ${alliance.boatType}s.\n\n` +
                `🤚 Signaler que l'on participe à la création.\n` +
                `⚓ Indique que vous êtes prêt à lever l'ancre.\n` +
                `🗑️ Supprime l'ip:port que vous avez rentré.\n\n` +
                `Comment ça marche ?\n\n` +
                `1 - Signalez d'abord que vous participez à la création de l'alliance en cliquant sur 🤚.\n` +
                `2 - Préparez une partie en mode Aventure avec un ${alliance.boatType} en équipage fermé, puis cliquez sur ⚓.\n` +
                `3 - Un décompte audio dans le vocal Discord aura lieu. À la fin du décompte, cliquez dans votre jeu, sur "Lever l'ancre".\n` +
                `4 - Une fois votre ip:port du server récupéré, copier la simplement dans ce channel.`)
            .addField('\u200b', '\u200b')
            .addField('Participants', participantsDisplay.join("\n"), true)
            .addField('Prêt à lever l\'ancre', readyDisplay.join("\n"), true)
            .addField('IP', IPDisplay.join("\n"), true)
            .addField('\u200b', '\u200b');


        if(Object.keys(alliance.participants).length < alliance.amount){
            exampleEmbed.addField('⚠ Attention ⚠', `Il n'y a actuellement pas assez de participants pour créer une alliance de ${alliance.amount} bateaux.`, false);
        }

        let matchServer = alliance.getMatchServer();
        for (let ip in matchServer){
            let usernames = matchServer[ip].map(userID => {
                let GuildMember = this.guild.member(userID);
                return GuildMember.nickname !== null ? GuildMember.nickname : GuildMember.user.username;
            });
            exampleEmbed.addField(matchServer[ip].length +' bateaux sur le server ' + ip, usernames.join(", "), false);
        }

        if (alliance.messageID === null) {
            textChannel.send(exampleEmbed).then(sentMessage => {
                alliance.messageID = sentMessage.id;
                this.saveAlliance(alliance);
                sentMessage.react('🤚');
                sentMessage.react('⚓');
                sentMessage.react('🗑️');
            });

        } else {
            textChannel.messages.fetch(alliance.messageID)
                .then(message => {
                    message.edit(exampleEmbed);
                })
                .catch(console.error);
        }
    }

    addReaction(reaction, user, alliance) {
        // console.log(reaction);
        // console.log(user);
        // console.log(reaction.message.channel.guild.member(user));
        // console.log(alliance);

        if (reaction.emoji.name === '🤚') {
            alliance.addParticipant(user).then(participant => {
                this.saveAlliance(alliance);
                this.updateMessageEmbed(alliance);
            }).catch(err => console.log(err));
        } else if (reaction.emoji.name === '⚓') {
            alliance.setReady(user).then(participant => {
                this.saveAlliance(alliance);
                this.updateMessageEmbed(alliance);

                if (Object.keys(alliance.participants).length >= alliance.amount && alliance.allParticipantsReady()) {
                    this.launchCountdown(alliance);
                }
            }).catch(err => {
                reaction.users.remove(user);
            });
        } else if (reaction.emoji.name === '🗑️') {
            alliance.unsetIp(user).then(participant => {
                this.saveAlliance(alliance);
                this.updateMessageEmbed(alliance);
                reaction.users.remove(user);
            }).catch(err => {
                reaction.users.remove(user);
            });
        } else {
            console.log(reaction);
            reaction.users.remove(user);
        }

    }

    removeReaction(reaction, user, alliance) {
        // console.log(reaction);
        // console.log(user);
        // console.log(alliance);

        if (reaction.emoji.name === '🤚') {
            alliance.removeParticipant(user).then(participant => {
                this.saveAlliance(alliance);
                this.updateMessageEmbed(alliance);
                reaction.message.reactions.cache.each(MessageReaction => {
                    MessageReaction.users.remove(user);
                })
            }).catch(err => console.log(err));
        } else if (reaction.emoji.name === '⚓') {
            alliance.unsetReady(user).then(participant => {
                this.saveAlliance(alliance);
                this.updateMessageEmbed(alliance);
            }).catch(err => {
                reaction.users.remove(user);
            });
        } else {
            reaction.users.remove(user);
        }
    }

    async setIp(ip, user, alliance) {
        alliance.setIp(user, ip).then(participant => {
            this.saveAlliance(alliance);
            this.updateMessageEmbed(alliance);
        }).catch(err => console.log(err));
        return ip;
    }

    launchCountdown(alliance) {
        let voiceChannel = this.guild.channels.cache.get(alliance.voiceChannelID);
        voiceChannel
            .join()
            .then(function (connection) {
                connection.play('./Ressources/countdown.webm', {volume: 2})
                    .on('finish', () => {
                        console.log('countdown.webm has finished playing!');
                        voiceChannel.leave();
                    });
            })
    }
};


module.exports = AllianceManager;