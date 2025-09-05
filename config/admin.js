module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  flags: {
    nps: env.bool('FLAG_NPS', false),           // Désactiver NPS
    promoteEE: env.bool('FLAG_PROMOTE_EE', false), // Désactiver promotion EE
  },
  rateLimit: {
    enabled: false,
  },
  url: env('ADMIN_URL', '/admin'),
  serveAdminPanel: true,
});
