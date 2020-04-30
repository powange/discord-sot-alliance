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
            let alliance = new Alliance(alliances[key].guildChannelID);
            alliance.categoryChannelID = alliances[key].categoryChannelID;
            alliance.textChannelID = alliances[key].textChannelID;
            alliance.voiceChannelID = alliances[key].voiceChannelID;
            alliance.messageID = alliances[key].messageID;
            alliance.amount = alliances[key].amount;
            alliance.boatType = alliances[key].boatType;
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
        let alliance = new Alliance(this.guild.id);
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
                'proprietaireID': a.proprietaireID,
                'participants': a.participants,
                'amount': a.amount,
                'boatType': a.boatType,
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

        await channel.delete();
        console.log('Delete channel ' + channel.type + ' "' + channel.name + '" (' + channel.id + ')');
        return channel;
    }

    getColorEmbed(amount, maxBoats) {
        const colors = [
            'rgba(255,0,0,0)',
            '#0099ff',
            '#ffaa00',
            '#f7ff00',
            '#bbff00',
            '#00ff88',
            '#00ff00'
        ];
        return colors[Math.floor((6 * maxBoats) / amount)];
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

            let participantDisplay = [];
            if (GuildMember.id === alliance.proprietaireID) { participantDisplay.push('👑'); }
            if (GuildMember.voice.channelID === alliance.voiceChannelID) { participantDisplay.push('🔉'); }
            participantDisplay.push(username);

            participantsDisplay.push(participantDisplay.join(' '));

            if (participant.skip === true) {
                readyDisplay.push('⏳');
            } else if (participant.ready === true) {
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

        let timestampNow = Math.floor(Date.now() / 1000);
        let durationMin = Math.floor((timestampNow - alliance.timestampStart) / 60);


        // console.log('participantsDisplay ==> ', participantsDisplay);
        // console.log('readyDisplay ==> ', readyDisplay);
        // console.log('IPDisplay ==> ', IPDisplay);

        const exampleEmbed = new Discord.MessageEmbed()
            .setColor(this.getColorEmbed(alliance.amount, alliance.getMaxBoatsMatchServer()))
            .setTitle('Création d\'alliance')
            .setDescription(`Cette alliance cherche à rassembler ${alliance.amount} ${alliance.boatType}s depuis ${durationMin} minutes.\n\n` +
                `Comment ça marche ?\n\n` +
                `1 - Signalez d'abord que vous participez à la création de l'alliance en cliquant sur 🤚.\n` +
                `2 - Préparez une partie en mode Aventure avec un ${alliance.boatType} en équipage fermé, puis cliquez sur ⚓.\n` +
                `3 - Un décompte audio dans le vocal Discord aura lieu. À la fin du décompte, cliquez dans votre jeu, sur "Lever l'ancre".\n` +
                `4 - Une fois votre ip:port du server récupéré, copier la simplement dans ce channel.\n\n` +
                `Les réactions :\n` +
                `🤚 Signaler que l'on participe à la création.\n` +
                `⚓ Indique que vous êtes prêt à lever l'ancre.\n` +
                `🗑️ Supprime l'ip:port que vous avez rentré.\n` +
                `⏳ Signaler que vous passez votre tour pour le prochain lancement.\n\n` +
                `Les réactions réservées au participant créateur (👑) :\n` +
                `🔄 Reset les adresses ip:port, ainsi que l'état sur la levé de l'ancre.\n` +
                `❌ Supprime la création d'alliance définitivement.\n\n` +
                `Le créateur peut transférer son statut en taguant un participant dans un message ci-dessous.\n\n`
            )
            .addField('\u200b', '\u200b')
            .addField('Participants', participantsDisplay.join("\n"), true)
            .addField('Prêt à lever l\'ancre', readyDisplay.join("\n"), true)
            .addField('IP', IPDisplay.join("\n"), true)
            .addField('\u200b', '\u200b');


        if (Object.keys(alliance.participants).length < alliance.amount) {
            exampleEmbed.addField('⚠ Attention ⚠', `Il n'y a actuellement pas assez de participants pour créer une alliance de ${alliance.amount} bateaux.`, false);
        }

        let matchServer = alliance.getMatchServer();
        for (let ip in matchServer) {
            let usernames = matchServer[ip].map(userID => {
                let GuildMember = this.guild.member(userID);
                return GuildMember.nickname !== null ? GuildMember.nickname : GuildMember.user.username;
            });
            exampleEmbed.addField(matchServer[ip].length + ' bateaux sur le server ' + ip, usernames.join(", "), false);
        }

        if (alliance.messageID === null) {
            textChannel.send(exampleEmbed).then(sentMessage => {
                alliance.messageID = sentMessage.id;
                this.saveAlliance(alliance);
                sentMessage.react('🤚');
                sentMessage.react('⚓');
                sentMessage.react('🗑️');
                sentMessage.react('⏳');
                sentMessage.react('🔄');
                sentMessage.react('❌');
            });

        } else {
            textChannel.messages.fetch(alliance.messageID)
                .then(message => {
                    message.edit(exampleEmbed);
                })
                .catch(console.error);
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
        } else if (reaction.emoji.name === '⏳') {
            alliance.setSkip(user).then(participant => {
                this.saveAlliance(alliance);
                this.updateMessageEmbed(alliance);

                if (alliance.countParticipants() >= alliance.amount && alliance.allParticipantsReady()) {
                    this.launchCountdown(alliance);
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
                        if(emojiToDelte.includes(emoji)){
                            MessageReaction.users.fetch().then(users => {
                                users;
                            });
                            MessageReaction.users.cache.filter(u => u.bot === false).each(u => {
                                MessageReaction.users.remove(u);
                            });
                        }
                    })

                    this.saveAlliance(alliance);
                    this.updateMessageEmbed(alliance);
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
        } else if (reaction.emoji.name === '⏳') {
            alliance.unsetSkip(user).then(participant => {
                this.saveAlliance(alliance);
                this.updateMessageEmbed(alliance);
            }).catch(err => {
                console.log(err);
                reaction.users.remove(user);
            });
        } else {
            reaction.users.remove(user);
        }
    }

    /**
     * @param ip
     * @param user
     * @param alliance {Alliance}
     * @returns {Promise<*>}
     */
    async setIp(ip, user, alliance) {
        alliance.setIp(user, ip).then(participant => {
            this.saveAlliance(alliance);
            this.updateMessageEmbed(alliance);
        }).catch(err => console.log(err));
        return ip;
    }

    /**
     * @param user {GuildMember}
     * @param alliance {Alliance}
     * @returns {Promise<GuildMember>}
     */
    async setProprietaireID(user, alliance) {
        await alliance.setProprietaireID(user).then(u => {
            this.saveAlliance(alliance);
            this.updateMessageEmbed(alliance);
        }).catch(err => console.log(err));
        return user;
    }

    /**
     * @param alliance {Alliance}
     */
    launchCountdown(alliance) {
        let voiceChannel = this.guild.channels.cache.get(alliance.voiceChannelID);
        voiceChannel
            .join()
            .then(function (connection) {
                connection.play('./Ressources/countdown.webm', {volume: 1})
                    .on('finish', () => {
                        console.log('countdown.webm has finished playing!');
                        voiceChannel.leave();
                    });
            })
    }
}