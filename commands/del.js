const AllianceManager = require('../src/allianceManager');

module.exports = {
    name: 'del',
    description: 'delete specifique alliance!',
    execute(message, args) {
        const allianceManager = AllianceManager.getInstance(message.guild);
        allianceManager.deleteAllianceByCategoryID(args[0]);
    },
};