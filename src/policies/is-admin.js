'use strict';

module.exports = async (ctx, next) => {
  const user = ctx.state?.user;
  if (!user) return ctx.unauthorized('Auth required');

  const roleName = user.role?.name || user.role?.type;
  if (roleName !== 'ADMIN') return ctx.forbidden('Admins only');

  await next();
};


