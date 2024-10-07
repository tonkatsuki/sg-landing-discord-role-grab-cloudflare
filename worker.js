const SPECIFIC_ROLES = ['President', 'Vice President', 'Director', 'Administrative Officer', 'Technical Administrator', 'Server Administrator', 'Legend', 'Supporter', 'Nitro Booster'];

async function fetchRolesAndMembers(DISCORD_BOT_TOKEN, GUILD_ID) {
  const rolesUrl = `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`;
  const membersUrl = `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000`;

  const headers = {
    'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
    'Content-Type': 'application/json'
  };

  const roles = await fetch(rolesUrl, { headers }).then(response => response.json());

  let members = [];
  let after = null;

  do {
    const response = await fetch(`${membersUrl}${after ? `&after=${after}` : ''}`, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch data from Discord API');
    }
    const data = await response.json();
    members = members.concat(data);
    after = data.length > 0 ? data[data.length - 1].user.id : null;
  } while (after !== null);

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
            name: member.displayName || member.user.username,
            avatar_url: avatarUrl
          });
        }
      });
    }
  });

  return roleData;
}

const addCorsHeaders = (response) => {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("Access-Control-Allow-Origin", "*");
  newHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  newHeaders.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(response.body, {
    ...response,
    headers: newHeaders,
  });
};

const handleOptions = () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};

const CACHE_KEY = 'discord_roles_data';
const CACHE_EXPIRATION = 3600; // 1 hour in seconds

const cachePut = async (cache, request, response) => {
  const expirationDate = new Date().getTime() + CACHE_EXPIRATION * 1000;
  const clonedResponse = new Response(await response.clone().text(), { // Clone the response's text
    headers: response.headers,
    status: response.status,
  });

  await cache.put(request, clonedResponse); // Cache the cloned response
  // Store expiration as separate metadata
  await cache.put(`${request.url}_expiration`, new Response(expirationDate.toString()));
};

const cacheGet = async (cache, request) => {
  const cachedResponse = await cache.match(request);
  if (!cachedResponse) return null;

  // Retrieve the expiration metadata
  const expirationDateResponse = await cache.match(`${request.url}_expiration`);
  if (!expirationDateResponse) return null;

  const expirationDate = parseInt(await expirationDateResponse.text());
  if (new Date().getTime() > expirationDate) {
    await cache.delete(request);
    await cache.delete(`${request.url}_expiration`);
    return null;
  }

  return cachedResponse;
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    const cache = caches.default;

    if (url.pathname === "/") {
      const cachedResponse = await cacheGet(cache, request);
      if (cachedResponse) {
        return addCorsHeaders(cachedResponse);
      }

      try {
        const data = await fetchRolesAndMembers(env.DISCORD_BOT_TOKEN, env.GUILD_ID);
        const response = new Response(JSON.stringify(data, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
        await cachePut(cache, request, response);
        return addCorsHeaders(response);
      } catch (error) {
        const response = new Response(error.message, { status: 500 });
        return addCorsHeaders(response);
      }
    }

    const response = new Response("Welcome to the Cloudflare Worker", {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return addCorsHeaders(response);
  },
};
