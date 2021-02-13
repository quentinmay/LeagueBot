# League Bot 💻

League Bot is a Discord Bot built using [discord.js](https://discord.js.org) to give utility to League Of Legends discord servers.

## ⚠Requirements
1. [Discord Bot Token](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)
2. [Riot Development API Key](https://developer.riotgames.com/)
3. [Node.js 14.0.0 or newer](https://nodejs.org/)

## ⚡Installation

Easily deployable using git clone:

```bash
git clone https://github.com/quentinmay/LeagueBot.git
cd LeagueBot
npm install
```
Now you must configure the bot before running using indexConfig example file:
```bash
mv indexConfig.json.example indexConfig.json
```
## Simple Configuration (Required)
Only top 4 required to change for basic functionality.

```json
{
    "discordToken": "",
    "devID": "",
    "serverID":"",
    "riotAPIToken": "",
    "commandPrefix": "!",
    "defaultBotChannelName":"general",
    "modRole":"Bot Access",
    "status":"STREAMING",
    "twitchLink":"https://www.twitch.tv/twitch",
    "mongoElyonMemberListPath": "./util/elyonMembersList.json",
    "elyonMembersListPath":"./util/elyonMembersList.json",
    "listeningMessageEmojisPath":"./util/elyonListeningMessageEmojis.json",
    "elyonMemberClass": "./util/member.js", 
    "LeagueAccountClass": "./util/LeagueAccount.js", 
    "ListeningMessageEmojiClass": "./util/ListeningMessageEmoji.js", 
    "ModApprovalEmojiClass": "./util/ModApprovalEmoji.js", 
    "RSVPApprovalEmojiClass": "./util/RSVPApprovalEmoji.js",
    "QuickInhouseListeningMessageEmojiClass": "./util/QuickInhouseListeningMessageEmoji.js",
    "checkMarkEmojiName":"✅",
    "xMarkEmojiName":"❎",
    "refreshLeagueAccountTime": "86400000",
    "readMemberDataFromFileInsteadOfSheets": true,
    "writeMemberDataToFileInsteadOfSheets": true,
    "elyonBotSheetsTokenFile":"./bot-google-sheets-token.json",
    "elyonMemberDataSheetURL":"",
    "elyonMemberDataSheetPageIndex":"0",
    "mongoURIPart1":"",
    "mongoUsername":"",
    "mongoURIPart2":"",
    "mongoPass":"",
    "mongoURIPart3":"",
    "dbName": "",
    "mongoURIPart4":""
}
```

## 🚀Initial Startup
Just startup the script now that everything has been built and you've filled your config file.
```bash
node index.js
```
Once your bot is up and running in your discord server, run the command ```!configure``` to add necessary roles/emojis/default text channel.

![Configure](https://user-images.githubusercontent.com/73214439/107845002-141a0d00-6d8d-11eb-9a53-2135e9ebcbf3.png)