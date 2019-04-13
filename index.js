const { promisify } = require('util');
const redis = require('redis');

module.exports = function({ port, hostname, options } = {}) {
  const client = redis.createClient(port, hostname, options);
  for (let key in client) {
    if (typeof client[key] === 'function') {
      client[`${key}Async`] = promisify(client[key]).bind(client);
    }
  }
  
  const store = (type) => ({
    get: async function(id, cb = () => {}) {
      const key = id.startsWith(`slack:${type}:`) ? id : `slack:${type}:${id}`;
      const result = await client.hgetallAsync(key);
      cb(result);
      return result;
    },
    save: async function(data, cb = () => {}) {
      for (let key in data) {
        await client.hsetAsync(`slack:${type}:${data.id}`, key, data[key]);
      }
      cb();
      return data;
    },
    delete: async function(id, cb = () => {}) {
      await client.hdelAsync(`slack:${type}:${id}`);
      cb();
      return id;
    },
    all: async function(cb = () => {}) {
      const keys = await client.keysAsync(`slack:${type}:*`);
      const result = await Promise.all(keys.map(k => this.get(k)));
      cb(result);
      return result;
    }
  });

  var storage = {
    teams: store('teams'),
    users: store('users'),
    channels: store('channels')
  };

  return storage;
};
