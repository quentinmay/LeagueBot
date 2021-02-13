class Member {
    constructor(leagueAccounts, discordID, mainRole, subRole, favoriteChamps, inhouseStats, discordName, highestRankEnum) {
        if (!discordName) discordName = null; 
        if (!leagueAccounts) leagueAccounts = []; 
        if (!discordID) discordID = null; 
        if (!mainRole) mainRole = null; 
        if (!subRole) subRole = null; 
        if (!favoriteChamps) favoriteChamps = null; 
        if (!inhouseStats) inhouseStats = null; 
        if (!highestRankEnum) highestRankEnum = 0; 
        this.discordName = discordName;
        this.leagueAccounts = leagueAccounts;
        this.discordID = discordID;
        this.mainRole = mainRole;
        this.subRole = subRole;
        this.favoriteChamps = favoriteChamps;
        this.inhouseStats = inhouseStats;
        this.highestRankEnum = highestRankEnum;
    }


    async getHighestRankLeagueAccount() {
        if (this.leagueAccounts.length == 0) return undefined;
        var highest = 0;
        var accountArray = [];

        for (var leagueAccount of this.leagueAccounts) {
            var totalRank = await leagueAccount.getRankEnum();
            accountArray.push({leagueAccount: leagueAccount, rankEnum:totalRank});
            if (totalRank > highest) {
                highest = totalRank;
            }
        }
        
        return (accountArray.find(acc => acc.rankEnum === highest)).leagueAccount;
    
    }


    async getHighestRankEnum() {
        var highestLeagueAccount = await this.getHighestRankLeagueAccount();
        if (!highestLeagueAccount) return 0;
        return await highestLeagueAccount.getRankEnum();
    
    }
    

    
    static createMember(memberJSON) {
        return new Promise(function(resolve, reject) {
        resolve(new Member(memberJSON.leagueAccounts, memberJSON.discordID, memberJSON.mainRole, memberJSON.subRole, memberJSON.favoriteChamps, memberJSON.inhouseStats, memberJSON.discordName));
        });
    }
    
}

module.exports = Member;



