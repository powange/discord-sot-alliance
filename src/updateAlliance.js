'use strict';
const AllianceManager = require('./allianceManager');
const https = require('https');

let instance = null;

module.exports = class updateAlliance {

    /**
     * @returns {updateAlliance}
     */
    static getInstance() {
        if (instance === null) {
            instance = new updateAlliance()
        }

        return instance;
    }

    constructor() {
    }

    updateAllIP() {
        if (!this.hasParticipants()) {
            return;
        }

        const url = 'https://fleetcreator.com/fleetcreatorapi/api/v1/whoIsOnline/fr';

        console.log('REQUEST GET https://fleetcreator.com/fleetcreatorapi/api/v1 whoIsOnline');
        https.get(url, (resp) => {
            let datasRaw = '';

            // A chunk of data has been recieved.
            resp.on('data', (chunk) => {
                datasRaw += chunk;
            });

            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                console.log('RESPONSE GET https://fleetcreator.com/fleetcreatorapi/api/v1 whoIsOnline');
                const datas = JSON.parse(datasRaw);

                const correspondanceUserIdTOIp = {};

                for (const ServerId in datas.UsersOnline) {
                    const server = datas.UsersOnline[ServerId];

                    for (const k in server.Users) {
                        const user = server.Users[k];
                        if (user.DiscordId) {
                            let ip = '';
                            if (server.ServerIp !== '0.0.0.0') {
                                ip = server.ServerIp + ':' + server.ServerPort
                            }
                            correspondanceUserIdTOIp[user.DiscordId] = ip;
                        }
                    }
                }


                const alliancesManager = AllianceManager.getAllInstance();
                for (const k1 in alliancesManager) {
                    const allianceManager = alliancesManager[k1];

                    allianceManager.alliances.each(a => {
                        for (const userID in a.participants) {
                            if (correspondanceUserIdTOIp.hasOwnProperty(userID)) {
                                a.participants[userID].ip = correspondanceUserIdTOIp[userID];
                            }
                        }

                        allianceManager.saveAlliance(a);
                        a.updateMessageEmbed();
                    });
                }

                console.log('END RESPONSE GET https://fleetcreator.com/fleetcreatorapi/api/v1 whoIsOnline');
            });

        }).on("error", (err) => {
            console.log("Error: " + err.message);
        });
    }

    hasParticipants() {
        const alliancesManager = AllianceManager.getAllInstance();

        for (const k1 in alliancesManager) {
            const allianceManager = alliancesManager[k1];

            let alliances = allianceManager.alliances.entries();
            for (var [clé, valeur] of alliances) {
                if (Object.keys(valeur.participants).length > 0) {
                    return true;
                }
            }
        }
        return false;
    }

    getAllparticipantIDsDiscord() {
        const alliancesManager = AllianceManager.getAllInstance();
        let IDsDiscord = [];
        for (const k1 in alliancesManager) {
            const allianceManager = alliancesManager[k1];
            allianceManager.alliances.each(a => {
                IDsDiscord.push(a.participants.keys());
            });
        }
        return IDsDiscord;
    }
}