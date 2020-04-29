const AllianceManager = require('../src/allianceManager');

module.exports = {
    name: 'clear',
    description: 'Clear all channel empty!',
    execute(message, args) {
        const allianceManager = AllianceManager.getInstance(message.guild);

        let promises = [];

        allianceManager.alliances.each(alliance => {
            promises.push(allianceManager.deleteAllianceByCategoryID(alliance.categoryChannelID));
        });

        Promise.all(promises).then(data => {
            message.guild.channels.cache.filter(c => {
                return c.type === 'category' && c.name.startsWith(`Alliance`)
            }).each(channel => {
                this.deleteCategoryChannel(message.guild.channels, channel);
            });
        }).catch(err => {
            console.log(err);
        });
    },
    async deleteCategoryChannel(channels, channel) {
        console.log('Delete channel "' + channel.name + '" (' + channel.id + ')');

        const subChannels = channels.cache.filter(c => c.parentID === channel.id);

        for (const [subChannelID, subChannel] of subChannels) {
            console.log('Delete channel "' + subChannel.name + '" (' + subChannel.id + ')');
            await subChannel.delete();
        }

        channel.delete();
    }
};