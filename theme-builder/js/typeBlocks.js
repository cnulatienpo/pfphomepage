const typeTokens = [
  { name: 'Chunky Display', slug: 'fp-display', sample: 'BUILD IT BIG', size: '32px/1.1' },
  { name: 'Friendly Body', slug: 'fp-body', sample: 'Friendly helper copy', size: '16px/1.4' },
  { name: 'Mini Label', slug: 'fp-label', sample: 'Label all the pegs', size: '12px/1.2' },
];

export function renderTypeBlocks(container) {
  container.innerHTML = '';
  typeTokens.forEach((token) => {
    const card = document.createElement('div');
    card.className = 'type-card';
    const sample = document.createElement('div');
    sample.className = 'sample';
    sample.textContent = token.sample;
    sample.style.fontSize = token.size.split('/')[0];
    const slug = document.createElement('div');
    slug.className = 'slug';
    slug.textContent = `${token.name} • ${token.slug}`;
    card.append(sample, slug);
    container.appendChild(card);
  });
}
