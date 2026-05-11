const { getDefaultConfig } = require('expo/metro-config');
const https = require('https');

const config = getDefaultConfig(__dirname);

config.server = {
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (!req.url.startsWith('/football-api')) {
        return middleware(req, res, next);
      }

      const apiPath = '/v4' + req.url.slice('/football-api'.length);
      const options = {
        hostname: 'api.football-data.org',
        path: apiPath,
        method: req.method,
        headers: { ...req.headers, host: 'api.football-data.org' },
      };

      const proxyReq = https.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, {
          ...proxyRes.headers,
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
        });
        proxyRes.pipe(res, { end: true });
      });

      proxyReq.on('error', (err) => {
        console.error('[proxy] football-data.org error:', err.message);
        res.writeHead(502);
        res.end('Proxy error');
      });

      req.pipe(proxyReq, { end: true });
    };
  },
};

module.exports = config;
