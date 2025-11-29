const THEME_SOURCES = [
  {
    id: 'construction',
    label: 'Construction Theme',
    cssPaths: ['../assets/construction-theme/theme.css'],
    sample: 'Construction Display',
  },
  {
    id: 'constuction',
    label: 'Constuction Theme',
    cssPaths: ['../assets/constuction%20theme/containers.css'],
    sample: 'Workshop Sans',
  },
];

let typographyTokens = [];
let loadingPromise = null;

export async function renderTypeBlocks(container) {
  container.innerHTML = '<div class="slug">Loading typography…</div>';
  const tokens = await loadTokens();
  container.innerHTML = '';

  if (!tokens.length) {
    container.innerHTML = '<div class="slug">No typography rules found.</div>';
    return;
  }

  tokens.forEach((token) => {
    const card = document.createElement('div');
    card.className = 'type-card';
    card.draggable = true;
    card.dataset.token = token.id;
    card.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', token.id));

    const sample = document.createElement('div');
    sample.className = 'sample';
    sample.textContent = token.sample || 'Typographic preview';
    applyPreviewStyles(sample, token);

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = token.name;

    const slug = document.createElement('div');
    slug.className = 'slug';
    slug.textContent = formatDetails(token);

    card.append(sample, name, slug);
    container.appendChild(card);
  });
}

export async function applyTypeToken(layer, tokenName) {
  const tokens = await loadTokens();
  const token = tokens.find((item) => item.id === tokenName || item.name === tokenName);
  if (!token) return layer;

  layer.typography = {
    token: token.id,
    fontFamily: token.fontFamily,
    fontSize: token.fontSize,
    fontWeight: token.fontWeight,
    lineHeight: token.lineHeight,
    letterSpacing: token.letterSpacing,
    source: token.source,
  };
  layer.placeholderText = token.sample;
  return layer;
}

async function loadTokens() {
  if (!loadingPromise) {
    loadingPromise = (async () => {
      const allTokens = await Promise.all(
        THEME_SOURCES.map(async (source) => {
          const cssText = await fetchStyles(source.cssPaths);
          if (!cssText) return [];
          const fromRules = extractRuleTokens(cssText, source);
          const fromCustomProps = extractVariableTokens(cssText, source);
          return [...fromCustomProps, ...fromRules];
        }),
      );
      typographyTokens = dedupeTokens(allTokens.flat());
      return typographyTokens;
    })();
  }
  return loadingPromise;
}

async function fetchStyles(paths) {
  const cssTexts = await Promise.all(
    paths.map(async (path) => {
      try {
        const response = await fetch(path);
        if (!response.ok) return '';
        return response.text();
      } catch (error) {
        console.warn('Unable to load typography CSS', path, error);
        return '';
      }
    }),
  );
  return cssTexts.filter(Boolean).join('\n');
}

function extractVariableTokens(cssText, source) {
  const tokens = [];
  const rootBlocks = [...cssText.matchAll(/:root\s*{([^}]*)}/g)];
  rootBlocks.forEach((match) => {
    const declarations = parseDeclarations(match[1]);
    Object.entries(declarations).forEach(([prop, value]) => {
      const cleanValue = stripComments(value);
      if (prop.startsWith('--font-')) {
        tokens.push(makeToken(`${source.label} ${prop.slice(2)}`, source, {
          fontFamily: cleanValue,
        }));
      }
      if (prop.startsWith('--weight-')) {
        tokens.push(makeToken(`${source.label} ${prop.slice(2)}`, source, {
          fontWeight: cleanValue,
        }));
      }
      if (prop.startsWith('--step-')) {
        tokens.push(makeToken(`${source.label} ${prop.slice(2)}`, source, {
          fontSize: cleanValue,
        }));
      }
      if (prop.startsWith('--lh-')) {
        tokens.push(makeToken(`${source.label} ${prop.slice(2)}`, source, {
          lineHeight: cleanValue,
        }));
      }
      if (prop.startsWith('--track-')) {
        tokens.push(makeToken(`${source.label} ${prop.slice(2)}`, source, {
          letterSpacing: cleanValue,
          sample: 'TRACKING TYPE',
        }));
      }
    });
  });
  return tokens;
}

function extractRuleTokens(cssText, source) {
  const tokens = [];
  const ruleRegex = /([^{}@]+)\{([^{}]+)\}/g;
  let match;
  while ((match = ruleRegex.exec(cssText))) {
    const selector = match[1].trim();
    if (!selector || selector.startsWith('@')) continue;
    const declarations = parseDeclarations(match[2]);
    if (!hasTypography(declarations)) continue;

    const shorthand = declarations.font ? parseFontShorthand(declarations.font) : {};
    const fontFamily = declarations['font-family'] || shorthand.fontFamily;
    const fontSize = declarations['font-size'] || shorthand.fontSize;
    const fontWeight = declarations['font-weight'] || shorthand.fontWeight;
    const lineHeight = declarations['line-height'] || shorthand.lineHeight;
    const letterSpacing = declarations['letter-spacing'] || shorthand.letterSpacing;

    tokens.push(
      makeToken(`${source.label} ${selector.split(',')[0].trim()}`, source, {
        fontFamily,
        fontSize,
        fontWeight,
        lineHeight,
        letterSpacing,
      }),
    );
  }
  return tokens;
}

function parseDeclarations(block) {
  return block
    .split(';')
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((acc, line) => {
      const [prop, ...rest] = line.split(':');
      if (prop && rest.length) {
        acc[prop.trim()] = rest.join(':').trim();
      }
      return acc;
    }, {});
}

function stripComments(value) {
  return value.replace(/\/\*.*?\*\//g, '').trim();
}

function parseFontShorthand(value) {
  const shorthand = value.replace(/font:/i, '').trim();
  const fontMatch = shorthand.match(/^(?:(\d{3}|bold|normal|lighter|bolder)\s+)?([\d.]+[a-z%]*)?(?:\/([\d.]+[a-z%]*|[\d.]+))?\s*(.+)?$/i);
  if (!fontMatch) return {};
  const [, weight, size, lineHeight, family] = fontMatch;
  return {
    fontWeight: weight,
    fontSize: size,
    lineHeight,
    fontFamily: family?.trim(),
  };
}

function hasTypography(declarations) {
  return (
    'font' in declarations ||
    'font-family' in declarations ||
    'font-size' in declarations ||
    'font-weight' in declarations ||
    'line-height' in declarations ||
    'letter-spacing' in declarations
  );
}

function makeToken(name, source, styles) {
  const cleanStyles = Object.fromEntries(Object.entries(styles).filter(([, value]) => Boolean(value)));
  if (!Object.keys(cleanStyles).length) return null;
  return {
    id: slugify(source.id, name),
    name,
    sample: styles.sample || source.sample || 'Hamburgefonstiv 01234',
    source: source.label,
    ...cleanStyles,
  };
}

function dedupeTokens(tokens) {
  const seen = new Set();
  return tokens
    .filter(Boolean)
    .filter((token) => {
      if (seen.has(token.id)) return false;
      seen.add(token.id);
      return true;
    });
}

function applyPreviewStyles(element, token) {
  const { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } = token;
  if (fontFamily) element.style.fontFamily = fontFamily;
  if (fontSize) element.style.fontSize = fontSize;
  if (fontWeight) element.style.fontWeight = fontWeight;
  if (lineHeight) element.style.lineHeight = lineHeight;
  if (letterSpacing) element.style.letterSpacing = letterSpacing;
}

function formatDetails(token) {
  const parts = [
    token.source,
    token.fontFamily && `Family: ${token.fontFamily}`,
    token.fontSize && `Size: ${token.fontSize}`,
    token.lineHeight && `Line: ${token.lineHeight}`,
    token.fontWeight && `Weight: ${token.fontWeight}`,
    token.letterSpacing && `Track: ${token.letterSpacing}`,
  ].filter(Boolean);
  return parts.join(' • ');
}

function slugify(...parts) {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}
