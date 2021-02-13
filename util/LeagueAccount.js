/*
LeagueAccount objects is a class made specifically for managing discord users different LeagueOfLegends accounts. Functionality included are functions to
retrieve the players highest ranks, retrieving their league Accounts unique ID (summonerID), retrieving a profileIconID attached to their league account,
logging that account type (main or alternate accounts) and etc. Mostly based on Riot official API. Required riot API token.
*/

const rp = require('request-promise');
var encodeUrl = require('encodeurl')

var configFile = __dirname + "/../indexConfig.json";
var riotAPIToken;
try {
    var config = require(configFile);
    riotAPIToken = config.riotAPIToken;
  } catch (err) {
      console.log(err)
    riotAPIToken = null;
  }
class LeagueAccount {
    
    constructor(summonerID, leagueName, leagueRankTier, leagueRankRank, type, lastRefreshed, profileIconId) {
        if (!summonerID) summonerID = null; 
        if (!leagueName) leagueName = null; 
        if (!leagueRankTier) leagueRankTier = null; 
        if (!leagueRankRank) leagueRankRank = null; 
        if (!type) type = null; 
        if (!lastRefreshed) lastRefreshed = Date.now(); 
        if (!profileIconId) profileIconId = null; 
        this.summonerID = summonerID; //Unique ID given to every league account since League names can change
        this.leagueName = leagueName; //Last registered leagueName
        this.leagueRankTier = leagueRankTier; //Ex. Bronze
        this.leagueRankRank = leagueRankRank; //Ex. IV
        this.type = type; //whether is main account or alternate account
        this.lastRefreshed = lastRefreshed; //Date in milliseconds when the leagueAccount was last refreshed
        this.profileIconId = profileIconId; //Just the profileIconID. Not very important but sometimes nice to have
        
    }

/*
Every so often, each league account that is linked to a discord user is refreshed to get their updated highest rank. This by default runs once a day.
*/
    async refreshAccount() {
        const rankSearch = {
            url: 'https://na1.api.riotgames.com/lol/league/v4/entries/by-summoner/' + this.summonerID,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9,ja;q=0.8",
                "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
                "Origin": "https://developer.riotgames.com",
                "X-Riot-Token": riotAPIToken
            }
        };

        var res = await riotAPIRequest(rankSearch);
            if (!res) {
                return(false);
            } else {
            var rankBody = JSON.parse(res.body);
            for(var rank of rankBody) {
                if (rank.queueType == 'RANKED_SOLO_5x5') {
                    this.leagueRankTier = `${rank.tier}`;
                    this.leagueRankRank = `${rank.rank}`
                }
                if (rank.summonerName != this.leagueName) {
                    this.leagueName = rank.summonerName;
                }
            };
            this.lastRefreshed = Date.now();
            return(true)
        }
 
    }

/*
Better async function for easy creation of a leagueAccount. Used in all populateElyonMemberList functions.
*/
    static createLeagueAccount(leagueAccountJSON) {
        return new Promise(function(resolve, reject) {
            resolve(new LeagueAccount(leagueAccountJSON.summonerID, leagueAccountJSON.leagueName, leagueAccountJSON.leagueRankTier, leagueAccountJSON.leagueRankRank, leagueAccountJSON.type, leagueAccountJSON.lastRefreshed, leagueAccountJSON.profileIconId))
        
        });
    }


    setupAccount(leagueName, leagueAccount) {
        return new Promise(function(resolve, reject) {
        });
    }

/*
By default, rank saves Tier (Bronze) and rank (IV) seperately. This is a function to put a number to their overall rank for easier handling. 
*/
    async getRankEnum() {
        
        var rankTierNum = (await LeagueAccount.parseRankTierEnum(this.leagueRankTier)) * 10;
        var rankRankNum = (await LeagueAccount.parseRankEnum(this.leagueRankRank));
        return rankTierNum + rankRankNum;
        
    }

/*
Used to parse the rank string representation (IV) into an enumerated int representation. I turns into 4 because its a larger number. Higher the number,
the higher the rank.
*/
    static parseRankEnum(rankRank) {
        return new Promise(function(resolve, reject) {
            if (!rankRank) resolve(0);
            switch(rankRank) {
                case "I":
                    resolve(4);
                    break;
                case "II":
                    resolve(3);
                    break;
                case "III":
                    resolve(2);
                    break;
                case "IV":
                    resolve(1);
                    break;
                default:
                    resolve(0)
                    break;
            }
            });
    }

/*
Used to parse the tier string representation (IRON) into an enumerated int representation. I turns CHALLENGER into 9 because its a larger number. Higher the number,
the higher the rank tier.
*/
static parseRankTierEnum(rankTier) {
    return new Promise(function(resolve, reject) {
        if (!rankTier) resolve(0);
        switch(rankTier) {
            case "IRON":
                resolve(1);
                break;
            case "BRONZE":
                resolve(2);
                break;
            case "SILVER":
                resolve(3);
                break;
            case "GOLD":
                resolve(4);
                break;
            case "PLATINUM":
                resolve(5);
                break;
            case "DIAMOND":
                resolve(6);
                break;
            case "MASTER":
                resolve(7);
                break;
            case "GRANDMASTER":
                resolve(8);
                break;
            case "CHALLENGER":
                resolve(9);
                break;
            default:
                resolve(0);
                break;

        }
    })

}
/*
Method to reverse enumerated rank back into string representation like what is saved in the data section.
*/
    static parseRankFromEnum(num) {
        return new Promise(function(resolve, reject) {
        if (isNaN(num)) resolve({tier: "UNRANKED", rank: "0"})
        var rank = {tier: "", rank: ""}
        var tierEnum = `${Math.round(num / 10) * 10}`;
        var rankEnum = `${num % 10}`;
        
        switch(tierEnum) {
            case "10":
                rank.tier = ("IRON");
                break;
            case "20":
                rank.tier = ("BRONZE");
                break;
            case "30":
                rank.tier = ("SILVER");
                break;
            case "40":
                rank.tier = ("GOLD");
                break;
            case "50":
                rank.tier = ("PLATINUM");
                break;
            case "60":
                rank.tier = ("DIAMOND");
                break;
            case "70":
                rank.tier = ("MASTER");
                break;
            case "80":
                rank.tier = ("GRANDMASTER");
                break;
            case "90":
                rank.tier = ("CHALLENGER");
                break;
            default:
                rank.tier = ("UNRANKED");
                break;
        }
        switch(rankEnum) {
            case "4":
                rank.rank = ("I");
                break;
            case "3":
                rank.rank = ("II");
                break;
            case "2":
                rank.rank = ("III");
                break;
            case "1":
                rank.rank = ("IV");
                break;
            default:
                rank.rank = ("0");
                break;
        }
            resolve(rank);
        });
    }
/*
When people search for their leagueAccount, they generally only can go by name and dont have summonerID handy. This just lets us make an APIRequest to riotAPI
and search for the summoner who owns the LeagueAccount. Then we also do a second API request to find their league account
*/
    static async findLeagueAccountByName(leagueName) {
            leagueName = encodeUrl(leagueName);
            var leagueAccount = new LeagueAccount();
            const summonerSearch = {
                url: 'https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/' + leagueName,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
                    "Accept-Language": "en-US,en;q=0.9,ja;q=0.8",
                    "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Origin": "https://developer.riotgames.com",
                    "X-Riot-Token": riotAPIToken
                }
            };
            
            var summonerSearchRes = await riotAPIRequest(summonerSearch);


                if (!summonerSearchRes) {
                    return(undefined);
                } else {
                var summonerBody = summonerSearchRes.body;
                summonerBody = JSON.parse(summonerBody);
                leagueAccount.summonerID = summonerBody.id;
                leagueAccount.leagueName = summonerBody.name;
                leagueAccount.profileIconId = summonerBody.profileIconId;
                const rankSearch = {
                    url: 'https://na1.api.riotgames.com/lol/league/v4/entries/by-summoner/' + leagueAccount.summonerID,
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
                        "Accept-Language": "en-US,en;q=0.9,ja;q=0.8",
                        "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
                        "Origin": "https://developer.riotgames.com",
                        "X-Riot-Token": riotAPIToken
                    }
                };
                var rankSearchRes = await riotAPIRequest(rankSearch);

                if (!rankSearchRes) {
                    return(undefined);
                } else {
                    var rankBody = rankSearchRes.body;
                    rankBody = JSON.parse(rankBody);
                    leagueAccount.leagueRankTier = 'UNRANKED';
                    leagueAccount.leagueRankRank = '0';
                    for(var rank of rankBody) { 
                        if (rank.queueType == 'RANKED_SOLO_5x5') {
                            leagueAccount.leagueRankTier = `${rank.tier}`;
                            leagueAccount.leagueRankRank = `${rank.rank}`
                        }
                    };
                    return(leagueAccount);
                    
                    }
            }
            
    }
}
/*
Standard API request format for riotAPIRequests. Put here for simplicity for all the functions above. Specifically uses request promises so that we may
stay promise based and have no errors.
*/
function riotAPIRequest(options) {
    return new Promise(function(resolve, reject) {
    options["resolveWithFullResponse"] = true;
    rp(options)
    
    .then(function (res) {
        if (res.statusCode == 200) {
        resolve(res);
        } else {
            resolve(undefined)
        }
    }).catch(function(err) {
        resolve(undefined)
    })
});

}

module.exports = LeagueAccount;
