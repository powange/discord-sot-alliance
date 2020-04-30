const Discord = require('discord.js');

module.exports = class Alliance {

    constructor(guildID) {
        this.guildChannelID = guildID;
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
            if (participant.skip === false && participant.ready === false) {
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
            if (participant.skip === false) {
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
};