module.exports = {
  fishboneSideBar: {
    Fishbone: [
      {
        type: 'category',
        label: 'Guides',
        items: ['installFirstUse', 'genericSettings'],
      },
      {
        type: 'category',
        label: 'Features',
        items: ['interactive', 'badges', 'nestedFishbones', 'sequences'],
        collapsed: false,
      },
      {
        type: 'link',
        label: 'Changelog',
        href: 'https://github.com/mbehr1/fishbone/blob/master/CHANGELOG.md',
      },
    ],
  },
}
