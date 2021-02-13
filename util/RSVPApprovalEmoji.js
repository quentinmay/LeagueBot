/*
Basically the same as ListeningMessageEmoji. Just made specifically for the quickInhouse command and extends the ListeningMessageEmoji so that it may be stored in the 
same array or map as any other ListeningMessageEmoji, even if that ListeningMessageEmoji is of a different type (For ex. QuickInhouseListeningMessageEmoji)
*/
var ListeningMessageEmoji = require('./ListeningMessageEmoji.js');
class RSVPApprovalEmoji extends ListeningMessageEmoji {
    constructor(listenerType, messageID, textChannelID, date, discordID, expirationTime) {
        super(listenerType, messageID, textChannelID, date, discordID, expirationTime);
    }
}

module.exports = RSVPApprovalEmoji;