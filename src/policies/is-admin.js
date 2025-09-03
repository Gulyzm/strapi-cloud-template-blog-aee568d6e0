'use strict';

module.exports = async (ctx, next) => {
  const user = ctx.state?.user;
  if (!user) return ctx.unauthorized('Auth required');

  // Vérifier si l'utilisateur a le rôle Admin
  const roleName = user.role?.name || user.role?.type;
  if (roleName !== 'Admin' && roleName !== 'admin') {
    return ctx.forbidden('Seuls les administrateurs peuvent importer des CSV');
  }

  await next();
};
