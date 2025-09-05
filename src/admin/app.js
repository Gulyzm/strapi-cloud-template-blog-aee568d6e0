const config = {
  locales: ['fr'],
  translations: {
    fr: {
      'app.components.LeftMenu.navbrand.title': 'IREAIFM Dashboard',
      'app.components.LeftMenu.navbrand.workplace': 'Administration',
    },
  },
  theme: {
    light: {},
    dark: {},
  },
  head: {
    favicon: '/favicon.png',
  },
};

const bootstrap = (app) => {
  console.log('Admin IREAIFM initialisé');
};

export default {
  config,
  bootstrap,
};
