'use strict';

module.exports = async (ctx, next) => {
  const user = ctx.state?.user;
  if (!user) return ctx.unauthorized('Auth required');

  // Autoriser tous les utilisateurs authentifiés pour l'import CSV
  // En production, vous pourriez vouloir une logique plus spécifique
  const roleName = user.role?.name || user.role?.type;
  if (roleName !== 'authenticated') return ctx.forbidden('Authentication required');

  await next();
};


