export const SPECIFIC_ROLES = ['President', 'Vice President', 'Director', 'Administrative Officer', 'Technical Administrator', 'Server Administrator', 'Legend', 'Supporter', 'Nitro Booster'];

export async function fetchRolesAndMembers(DISCORD_BOT_TOKEN, GUILD_ID) {
    const rolesUrl = `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`;
    const membersUrl = `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000`;
    
    const headers = {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
    };

    const [rolesResponse, membersResponse] = await Promise.all([
        fetch(rolesUrl, { headers }),
        fetch(membersUrl, { headers })
    ]);

    if (!rolesResponse.ok || !membersResponse.ok) {
        throw new Error('Failed to fetch data from Discord API');
    }

    const roles = await rolesResponse.json();
    const members = await membersResponse.json();

    return processRolesAndMembers(roles, members);
}

function processRolesAndMembers(roles, members) {
    const roleData = {};

    roles.forEach(role => {
        if (SPECIFIC_ROLES.includes(role.name)) {
            roleData[role.name] = {
                color: `#${role.color.toString(16).padStart(6, '0')}`,
                members: []
            };

            members.forEach(member => {
                if (member.roles.includes(role.id)) {
                    const avatarUrl = member.user.avatar ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png` : null;
                    roleData[role.name].members.push({
                        name: member.nick,
                        avatar_url: avatarUrl
                    });
                }
            });
        }
    });

    return roleData;
}
