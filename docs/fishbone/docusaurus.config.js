module.exports = {
  title: 'Fishbone Visual Studio Code Extension',
  tagline: 'Create interactive fishbone analysis documents',
  url: 'https://mbehr1.github.io',
  baseUrl: '/fishbone/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/fishbone-icon2.png',
  organizationName: 'mbehr1',
  projectName: 'fishbone',
  themeConfig: {
    gtag: {
      trackingID: 'UA-180286216-1',
      anonymizeIP: true
    },
    navbar: {
      title: 'Fishbone',
      logo: {
        alt: 'Fishbone Logo',
        src: 'img/fishbone-icon2.png',
      },
      items: [
        {
          to: 'docs/',
          activeBasePath: 'docs',
          label: 'Docs',
          position: 'left',
        },
        { to: 'blog', label: 'Blog', position: 'left' },
        {
          href: 'https://github.com/mbehr1/fishbone',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Install Guide',
              to: 'docs/',
            },
            {
              label: 'Feature Guide',
              to: 'docs/interactive',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/fishbone',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/freeddoo',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: 'blog',
            },
            {
              label: 'dlt-logs',
              href: 'https://github.com/mbehr1/dlt-logs',
            },
            {
              label: 'vsc-webshark',
              href: 'https://github.com/mbehr1/vsc-webshark',
            },
            {
              label: 'smart-log',
              href: 'https://github.com/mbehr1/smart-log',
            },

          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear() > 2020 ? `2020 - ${new Date().getFullYear()}` : new Date().getFullYear()} Matthias Behr. Docs built with Docusaurus.`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl:
            'https://github.com/mbehr1/fishbone/edit/master/docs/fishbone/',
        },
        blog: {
          showReadingTime: true,
          editUrl:
            'https://github.com/mbehr1/fishbone/edit/master/fishbone/blog/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
