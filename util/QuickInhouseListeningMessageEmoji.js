var ListeningMessageEmoji = require('./ListeningMessageEmoji.js');
class QuickInhouseListeningMessageEmoji extends ListeningMessageEmoji {
    constructor(listenerType, messageID, textChannelID, date, discordID, expirationTime, lastUpdated, queue, members) {
        if (!lastUpdated) lastUpdated = Date.now(); 
        if (!queue) queue = 0; 
        if (!members) members = []; 
        super(listenerType, messageID, textChannelID, date, discordID, expirationTime);
        this.lastUpdated = lastUpdated;
        this.queue = queue;
        this.members = members;
    }
}

module.exports = QuickInhouseListeningMessageEmoji;