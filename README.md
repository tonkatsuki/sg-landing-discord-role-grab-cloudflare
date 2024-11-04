# sg-landing-discord-role-grab-cloudflare

Cloudflare worker to pull in Discord roles via API.
CF Pages integration auto pulls the Github main branch updates. Make sure to link your git repo in the Workers & Pages settings then set the build configuration to something like this:
```
Build command:None
Deploy command:npx wrangler deploy worker.js --name sg-landing-discord-role-grab --compatibility-date 2024-10-03
Root directory:/
```

Under Workers & Pages --> Your App go to Settings as well and set two secrets:
DISCORD_BOT_TOKEN = your Discord bot token
GUILD_ID = your server's ID, retrieved inside Discord by right clicking the server and doing 'Copy Server ID'

The discord bot just needs 'Server Members Intent' under the Bot tab, then make sure it's a Guild Install method under Installation. I believe you just need the scope 'Bot', though it might also need 'applications.commands' scope.
