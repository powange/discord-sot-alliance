const AllianceManager = require('../src/allianceManager');

module.exports = {
    name: 'alliances',
    aliases: ['al'],
    description: 'Voir les etats des alliances!',
    execute(message, args) {
        allianceManager = AllianceManager.getInstance(message.guild);
        console.log();
        message.channel.send(JSON.stringify(allianceManager.alliances, null, 4), {split: true});
        message.delete();
    },
};