const AllianceManager = require('../src/allianceManager');

module.exports = {
    name: 'alliances',
    aliases: ['al'],
    description: 'Voir les etats des alliances!',
    execute(message, args) {
        allianceManager = AllianceManager.getInstance(message.guild);
        console.log();
        allianceManager.alliances.each(alliance => {
            message.channel.send(JSON.stringify(alliance, null, 4), {split: true});
            message.channel.send(JSON.stringify(alliance.participants, null, 4), {split: true});
        });
        message.delete();
    },
};