/*
Basically the same as ListeningMessageEmoji. Just made specifically for the quickInhouse command and extends the ListeningMessageEmoji so that it may be stored in the 
same array or map as any other ListeningMessageEmoji, even if that ListeningMessageEmoji is of a different type (For ex. RSVPApprovalEmoji).
Difference is this one has a queue, members, and lastUpdated data put into it.
*/
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