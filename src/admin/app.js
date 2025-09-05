export default {
  config: {
    locales: ['fr', 'en'],
    translations: {
      en: {
        'app.components.LeftMenu.navbrand.title': 'IRE AIFM',
        'app.components.LeftMenu.navbrand.workplace': 'Administration',
        'Auth.form.welcome.title': 'Welcome to IRE AIFM',
        'Auth.form.welcome.subtitle': 'Log in to your account',
        'HomePage.welcome': 'Welcome to IRE AIFM Dashboard',
        'HomePage.welcome.again': 'Welcome back to IRE AIFM',
      },
      fr: {
        'app.components.LeftMenu.navbrand.title': 'IRE AIFM',
        'app.components.LeftMenu.navbrand.workplace': 'Administration',
        'Auth.form.welcome.title': 'Bienvenue sur IRE AIFM',
        'Auth.form.welcome.subtitle': 'Connectez-vous à votre compte',
        'HomePage.welcome': 'Bienvenue sur le Dashboard IRE AIFM',
        'HomePage.welcome.again': 'Bon retour sur IRE AIFM',
      }
    },
    theme: {
      light: {
        colors: {
          primary100: '#f0f8ff',
          primary200: '#d1e7dd',
          primary500: '#0d6efd',
          primary600: '#0b5ed7',
          primary700: '#0a58ca',
        }
      }
    },
    head: {
      favicon: '/favicon.png',
      title: 'IRE AIFM - Administration'
    },
    menu: {
      logo: '/IREAIFMlogoSmall.png'
    },
    auth: {
      logo: '/IREAIFMlogo.png'
    }
  },
  bootstrap(app) {
    console.log('Admin IRE AIFM initialisé avec succès');
  },
};
