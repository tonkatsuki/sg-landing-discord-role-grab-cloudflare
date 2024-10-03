import { fetchRolesAndMembers } from './data.js';

const CACHE_KEY = 'discord_roles_data';
const CACHE_EXPIRATION = 1800; // 30 minutes in seconds

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

const cachePut = async (cache, request, response) => {
  const clonedResponse = response.clone();
  const expirationDate = new Date().getTime() + CACHE_EXPIRATION * 1000;
  clonedResponse.headers.set('Cache-Expiration', expirationDate);
  await cache.put(request, clonedResponse);
};

const cacheGet = async (cache, request) => {
  const cachedResponse = await cache.match(request);
  if (!cachedResponse) return null;

  const expirationDate = cachedResponse.headers.get('Cache-Expiration');
  if (new Date().getTime() > expirationDate) {
    await cache.delete(request);
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
