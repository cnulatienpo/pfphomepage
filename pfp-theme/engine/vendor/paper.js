class Point {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
}

class Size {
  constructor(width = 0, height = 0) {
    this.width = width;
    this.height = height;
  }
}

class Matrix {
  constructor() {}
  apply() {}
}

class Path {
  constructor(data = null) {
    this.data = data;
    this.commands = [];
    this.children = [];
    this.position = new Point(0, 0);
    this.bounds = { width: 100, height: 100 };
  }

  moveTo(x, y) {
    this.commands.push({ type: 'M', x, y });
  }

  lineTo(x, y) {
    this.commands.push({ type: 'L', x, y });
  }

  cubicCurveTo(x1, y1, x2, y2, x, y) {
    this.commands.push({ type: 'C', x1, y1, x2, y2, x, y });
  }

  closePath() {
    this.commands.push({ type: 'Z' });
  }

  clone() {
    const p = new Path(this.data);
    p.commands = JSON.parse(JSON.stringify(this.commands));
    p.position = new Point(this.position.x, this.position.y);
    p.bounds = { ...this.bounds };
    return p;
  }

  scale(x = 1, y = 1) {
    this.bounds.width *= x;
    this.bounds.height *= typeof y === 'number' ? y : x;
  }

  translate(pt) {
    if (pt instanceof Point) {
      this.position = new Point(this.position.x + pt.x, this.position.y + pt.y);
    }
  }

  rotate() {}

  strokeToPath() {
    return this.clone();
  }

  remove() {}

  exportJSON() {
    return JSON.stringify({
      data: this.data,
      commands: this.commands,
      position: this.position,
      bounds: this.bounds,
    });
  }
}

class CompoundPath extends Path {
  addChild(child) {
    this.children.push(child);
  }

  reduce() {}
}

class Project {
  constructor() {
    this.view = { viewSize: new Size(0, 0), draw() {} };
  }

  importJSON(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    const p = new Path(data.data);
    p.commands = data.commands || [];
    p.position = new Point(data.position?.x || 0, data.position?.y || 0);
    p.bounds = data.bounds || { width: 100, height: 100 };
    return p;
  }

  clear() {}
}

const paper = {
  Point,
  Size,
  Matrix,
  Path,
  CompoundPath,
  project: new Project(),
  view: { viewSize: new Size(0, 0), draw() {} },
  setup(canvas) {
    this.view.viewSize = new Size(canvas?.width || 0, canvas?.height || 0);
    return this;
  },
};

export default paper;
