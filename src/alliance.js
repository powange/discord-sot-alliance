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
    participants = {};
    amount = null;
    boatType = null;

    async addParticipant(user) {
        if (!this.participants.hasOwnProperty(user.id)) {
            this.participants[user.id] = {
                ready: false,
                ip: ''
            };
            return this.participants[user.id];
        }
        throw new Error('Le participant existe déjà');
    }

    async removeParticipant(user) {
        if (this.participants.hasOwnProperty(user.id)) {
            let participant = this.participants[user.id];
            delete this.participants[user.id];
            return participant;
        }
        throw new Error('Le participant n\'existe pas');
    }

    async setReady(user) {
        if (this.participants.hasOwnProperty(user.id)) {
            this.participants[user.id].ready = true;
            return this.participants[user.id];
        }
        throw new Error('Le participant n\'existe pas');
    }

    async unsetReady(user) {
        if (this.participants.hasOwnProperty(user.id)) {
            this.participants[user.id].ready = false;
            return this.participants[user.id];
        }
        throw new Error('Le participant n\'existe pas');
    }

    async setIp(user, ip) {
        if (this.participants.hasOwnProperty(user.id)) {
            this.participants[user.id].ip = ip;
            return this.participants[user.id];
        }
        throw new Error('Le participant n\'existe pas');
    }

    async unsetIp(user) {
        if (this.participants.hasOwnProperty(user.id)) {
            this.participants[user.id].ip = '';
            return this.participants[user.id];
        }
        throw new Error('Le participant n\'existe pas');
    }

    allParticipantsReady() {
        for (const userID in this.participants){
            if(this.participants[userID].ready === false){
                return false;
            }
        }
        return true;
    }

    getMatchServer(){
        let matchs = {};
        for(const participantID in this.participants){
            let participant = this.participants[participantID];
            if(participant.ip !== ''){
                if (!matchs.hasOwnProperty(participant.ip)) {
                    matchs[participant.ip] = [];
                }

                matchs[participant.ip].push(participantID);
            }
        }


        for(const ip in matchs){
            if(matchs[ip].length < 2){
                delete matchs[ip];
            }
        }

        return matchs;
    }

    getMaxBoatsMatchServer(){
        const matchServer = this.getMatchServer();
        let max = 0;
        for (let ip in matchServer) {
            max = Math.max(max, matchServer[ip].length);
        }
        return max;
    }
};