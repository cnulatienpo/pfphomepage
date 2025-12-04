class Path {
  constructor(commands = []) {
    this.commands = commands;
  }
}

class Glyph {
  constructor({ name, unicode, advanceWidth, path }) {
    this.name = name;
    this.unicode = unicode;
    this.advanceWidth = advanceWidth || 0;
    this.path = path || new Path();
  }
}

class Font {
  constructor({ familyName, styleName, unitsPerEm, ascender, descender, glyphs }) {
    this.familyName = familyName;
    this.styleName = styleName;
    this.unitsPerEm = unitsPerEm;
    this.ascender = ascender;
    this.descender = descender;
    this.glyphs = { glyphs: glyphs || [] };
  }

  toArrayBuffer() {
    const encoder = new TextEncoder();
    const data = JSON.stringify({
      familyName: this.familyName,
      styleName: this.styleName,
      unitsPerEm: this.unitsPerEm,
      ascender: this.ascender,
      descender: this.descender,
      glyphs: this.glyphs.glyphs.map((g) => ({
        name: g.name,
        unicode: g.unicode,
        advanceWidth: g.advanceWidth,
        path: g.path.commands,
      })),
    });
    return encoder.encode(data).buffer;
  }
}

export default {
  Path,
  Glyph,
  Font,
};
