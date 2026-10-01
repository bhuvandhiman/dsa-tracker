const themeStyle = document.createElement('style');
themeStyle.textContent = globalThis.DsaTheme.styles;
document.head.append(themeStyle);
globalThis.DsaTheme.init(document.documentElement,document.querySelector('#theme-toggle'));
