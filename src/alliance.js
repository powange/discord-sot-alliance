const Discord = require('discord.js');
const {Guild} = require('discord.js');

module.exports = class Alliance {

    /**
     * @param guild {Guild}
     */
    constructor(guild) {
        /**
         * @type {Guild}
         */
        this.guild = guild;
        this.guildChannelID = guild.id;
        this.timestampStart = Math.floor(Date.now() / 1000);
    };

    guildChannelID = null;
    categoryChannelID = null;
    textChannelID = null;
    voiceChannelID = null;
    messageID = null;
    proprietaireID = null;
    participants = {};
    amount = null;
    boatType = null;

    /**
     * @type {string}
     */
    countdownFile = 'countdown.webm';

    /**
     * @type {boolean}
     */
    muteMembers = false;

    /**
     * @param user {GuildMember}
     * @returns {Promise<GuildMember>}
     */
    async setProprietaireID(user) {
        if (this.participants.hasOwnProperty(user.id)) {
            this.proprietaireID = user.id;
            return user;
        }
        throw new Error('Le participant n\'existe pas');
    }

    /**
     * @param user {GuildMember}
     * @returns {Promise<*>}
     */
    async addParticipant(user) {
        if (!this.participants.hasOwnProperty(user.id)) {
            this.participants[user.id] = {
                ready: false,
                skip: false,
                afk: false,
                ip: ''
            };
            return this.participants[user.id];
        }
        throw new Error('Le participant existe déjà');
    }

    /**
     * @param user {GuildMember}
     * @returns {Promise<void>}
     */
    async removeParticipant(user) {
        if (this.participants.hasOwnProperty(user.id)) {
            let participant = this.participants[user.id];
            delete this.participants[user.id];
            return participant;
        }
        throw new Error('Le participant n\'existe pas');
    }

    /**
     * @param user {GuildMember}
     * @returns {Promise<*>}
     */
    async setReady(user) {
        if (this.participants.hasOwnProperty(user.id)) {
            this.participants[user.id].ready = true;
            return this.participants[user.id];
        }
        throw new Error('Le participant n\'existe pas');
    }

    /**
     * @param user {GuildMember}
     * @returns {Promise<*>}
     */
    async unsetReady(user) {
        if (this.participants.hasOwnProperty(user.id)) {
            this.participants[user.id].ready = false;
            return this.participants[user.id];
        }
        throw new Error('Le participant n\'existe pas');
    }

    /**
     * @param user {GuildMember}
     * @returns {Promise<*>}
     */
    async setSkip(user) {
        if (this.participants.hasOwnProperty(user.id)) {
            this.participants[user.id].skip = true;
            return this.participants[user.id];
        }
        throw new Error('Le participant n\'existe pas');
    }

    /**
     * @param user {GuildMember}
     * @returns {Promise<*>}
     */
    async unsetSkip(user) {
        if (this.participants.hasOwnProperty(user.id)) {
            this.participants[user.id].skip = false;
            return this.participants[user.id];
        }
        throw new Error('Le participant n\'existe pas');
    }

    /**
     * @param user {GuildMember}
     * @returns {Promise<*>}
     */
    async setAFK(user) {
        if (this.participants.hasOwnProperty(user.id)) {
            this.participants[user.id].afk = true;
            return this.participants[user.id];
        }
        throw new Error('Le participant n\'existe pas');
    }

    /**
     * @param user
     * @returns {Promise<boolean>}
     */
    isAFK(user) {
        if (this.participants.hasOwnProperty(user.id)) {
            return this.participants[user.id].afk;
        }
        // throw new Error('Le participant n\'existe pas');
    }

    /**
     * @param user {GuildMember}
     * @returns {Promise<*>}
     */
    async unsetAFK(user) {
        if (this.participants.hasOwnProperty(user.id)) {
            this.participants[user.id].afk = false;
            return this.participants[user.id];
        }
        throw new Error('Le participant n\'existe pas');
    }

    /**
     * @returns {Promise<void>}
     */
    async resetLaunch() {
        for (const userID in this.participants) {
            this.participants[userID].ip = '';
            this.participants[userID].skip = false;
            this.participants[userID].ready = false;
        }
    }

    /**
     * @param user {GuildMember}
     * @param ip
     * @returns {Promise<*>}
     */
    async setIp(user, ip) {
        if (this.participants.hasOwnProperty(user.id)) {
            if (this.participants[user.id].skip === false) {
                this.participants[user.id].ip = ip;
            }
            return this.participants[user.id];
        }
        throw new Error('Le participant n\'existe pas');
    }

    /**
     * @param user {GuildMember}
     * @returns {Promise<*>}
     */
    async unsetIp(user) {
        if (this.participants.hasOwnProperty(user.id)) {
            this.participants[user.id].ip = '';
            return this.participants[user.id];
        }
        throw new Error('Le participant n\'existe pas');
    }

    /**
     * @returns {boolean}
     */
    allParticipantsReady() {
        for (const userID in this.participants) {
            let participant = this.participants[userID];
            if (participant.skip === false && participant.afk === false && participant.ready === false) {
                return false;
            }
        }
        return true;
    }

    /**
     * @returns {number}
     */
    countParticipants() {
        let nbParticipants = 0;
        for (const userID in this.participants) {
            let participant = this.participants[userID];
            if (participant.skip === false && participant.afk === false) {
                nbParticipants++;
            }
        }
        return nbParticipants;
    }

    /**
     * @returns {{}}
     */
    getMatchServer() {
        let matchs = {};
        for (const participantID in this.participants) {
            let participant = this.participants[participantID];
            if (participant.ip !== '') {
                if (!matchs.hasOwnProperty(participant.ip)) {
                    matchs[participant.ip] = [];
                }

                matchs[participant.ip].push(participantID);
            }
        }


        for (const ip in matchs) {
            if (matchs[ip].length < 2) {
                delete matchs[ip];
            }
        }

        return matchs;
    }

    /**
     * @returns {number}
     */
    getMaxBoatsMatchServer() {
        const matchServer = this.getMatchServer();
        let max = 0;
        for (let ip in matchServer) {
            max = Math.max(max, matchServer[ip].length);
        }
        return max;
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
     */
    updateMessageEmbed() {
        let textChannel = this.guild.channels.cache.get(this.textChannelID);

        let participantsDisplay = [];
        let readyDisplay = [];
        let IPDisplay = [];

        for (var userID in this.participants) {
            let participant = this.participants[userID];
            let GuildMember = this.guild.member(userID);
            let username = GuildMember.nickname !== null ? GuildMember.nickname : GuildMember.user.username;

            let participantDisplay = [];
            if (GuildMember.id === this.proprietaireID) {
                participantDisplay.push('👑');
            }
            if (GuildMember.voice.channelID === this.voiceChannelID) {
                participantDisplay.push('🔉');
            }
            participantDisplay.push(username.substr(0, 16));

            participantsDisplay.push(participantDisplay.join(' '));

            if (participant.afk === true) {
                readyDisplay.push('AFK');
            } else if (participant.skip === true) {
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
        let durationMin = Math.floor((timestampNow - this.timestampStart) / 60);


        // console.log('participantsDisplay ==> ', participantsDisplay);
        // console.log('readyDisplay ==> ', readyDisplay);
        // console.log('IPDisplay ==> ', IPDisplay);

        const exampleEmbed = new Discord.MessageEmbed()
            .setColor(this.getColorEmbed(this.amount, this.getMaxBoatsMatchServer()))
            .setTitle('Création d\'alliance')
            .setDescription(`Cette alliance cherche à rassembler **${this.amount} ${this.boatType}s** depuis ${durationMin} minutes.\n\n` +
                `**Comment ça marche ?**\n\n` +
                `1 - Signalez d'abord que vous participez à la création de l'alliance en cliquant sur 🤚.\n` +
                `2 - Préparez une partie en mode Aventure avec un ${this.boatType} en équipage fermé, puis cliquez sur ⚓.\n` +
                `3 - Un décompte audio dans le vocal Discord aura lieu. À la fin du décompte, cliquez dans votre jeu, sur "Lever l'ancre".\n` +
                `4 - Une fois votre ip:port du server récupéré, copier la simplement dans ce channel.\n\n` +
                `**Les réactions :**\n` +
                `🤚 Signaler que l'on participe à la création.\n` +
                `⚓ Indique que vous êtes prêt à lever l'ancre.\n` +
                `🗑️ Supprime l'ip:port que vous avez rentré.\n` +
                `⏳ Signaler que vous passez votre tour pour le prochain lancement.\n\n` +
                `**Commandes :**\n` +
                `**afk** : se met en mode afk.\n` +
                `**software** : recevoir le software qui permet de récupérer l'ip:port.\n\n` +
                `**Les réactions réservées au participant créateur (👑) :**\n` +
                `🔄 Reset les adresses ip:port, ainsi que l'état sur la levé de l'ancre.\n` +
                `❌ Supprime la création d'alliance définitivement.\n\n` +
                `**Commandes réservées au participant créateur (👑) :**\n` +
                `**creator @username** : Défini username comme nouveau créateur de l'alliance.\n` +
                `**afk @username** : Défini username comme étant afk.\n` +
                `**countdownSpeed** : Active ou désactive le décompte rapide.\n` +
                `**muteMembers** : Active ou désactive le mute des membres du Vocal pendant le décompte.\n\n`
            )
            .addField('\u200b', '\u200b')
            .addField('Participants', participantsDisplay.join("\n"), true)
            .addField('Prêt à lever l\'ancre', readyDisplay.join("\n"), true)
            .addField('IP', IPDisplay.join("\n"), true)
            .addField('\u200b', '\u200b')
            .setFooter(`Discord SOT Launch Alliance créé par powange#6460`);


        if (Object.keys(this.participants).length < this.amount) {
            exampleEmbed.addField('⚠ Attention ⚠', `Il n'y a actuellement pas assez de participants pour créer une alliance de ${this.amount} bateaux.`, false);
        }

        let matchServer = this.getMatchServer();
        for (let ip in matchServer) {
            let usernames = matchServer[ip].map(userID => {
                let GuildMember = this.guild.member(userID);
                return GuildMember.nickname !== null ? GuildMember.nickname : GuildMember.user.username;
            });
            exampleEmbed.addField(matchServer[ip].length + ' bateaux sur le server ' + ip, usernames.join(", "), false);
        }

        if (this.messageID === null) {
            textChannel.send(exampleEmbed).then(sentMessage => {
                this.messageID = sentMessage.id;
                this.save();
                sentMessage.react('🤚');
                sentMessage.react('⚓');
                sentMessage.react('🗑️');
                sentMessage.react('⏳');
                sentMessage.react('🔄');
                sentMessage.react('❌');
            });

        } else {
            textChannel.messages.fetch(this.messageID)
                .then(message => {
                    message.edit(exampleEmbed);
                })
                .catch(console.error);
        }
    }

    switchCountdownSpeed() {
        if (this.countdownFile === 'countdown.webm') {
            this.countdownFile = 'countdown-speed.webm'
            return true;
        }

        this.countdownFile = 'countdown.webm'
        return false;
    }

    switchMuteMembers() {
        this.muteMembers = !this.muteMembers;
        return this.muteMembers;
    }

    launchCountdown() {
        try {
            let voiceChannel = this.guild.channels.cache.get(this.voiceChannelID);
            let countdownFile = this.countdownFile;
            let muteMembers = this.muteMembers;
            let membersToMute = voiceChannel.members.filter(m => {
                return m.user.bot === false && m.voice.serverMute === false;
            });
            voiceChannel
                .join()
                .then(function (connection) {

                    if (muteMembers) {
                        membersToMute.each(m => m.voice.setMute(true));
                    }

                    connection.play('./Ressources/' + countdownFile, {volume: 1})
                        .on('finish', () => {
                            console.log('countdown.webm has finished playing!');
                            if (muteMembers) {
                                membersToMute.each(m => m.voice.setMute(false));
                            }
                            voiceChannel.leave();
                        });
                })

        } catch (e) {
            console.log(e)
        }
    }

    save() {
        const AllianceManager = require('./allianceManager');
        const allianceManager = AllianceManager.getInstance(this.guild);
        allianceManager.saveAlliance(this);
    }
};