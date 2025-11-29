const DEFAULT_CONFIG = {
  gridSize: 8,
  tolerance: 6,
  maxSnapDistance: 14,
  spacingInterval: 12,
  artboard: { width: 1440, height: 900 },
  magneticZones: [],
  useCenterLines: true,
  useEdgeSnap: true,
  useGridSnap: true,
  useSpacingSnap: true,
};

const PRIORITY = {
  magnetic: 1,
  edge: 2,
  center: 3,
  spacing: 4,
  grid: 5,
  free: 6,
};

function roundToGrid(value, size) {
  return Math.round(value / size) * size;
}

function createGuideDefinition(type, orientation, position, meta = {}) {
  return { type, orientation, position, ...meta };
}

class SnapEngine {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.layers = config.layers || [];
    this.guidesRoot = null;
    this.activeGuideElements = [];
    this.injectedStyles = false;
  }

  setLayers(layers) {
    this.layers = layers || [];
  }

  setMagneticZones(zones) {
    this.config.magneticZones = zones || [];
  }

  computeSnapPosition(layer, proposedPosition) {
    const layerBox = {
      ...layer,
      width: layer.width || 0,
      height: layer.height || 0,
    };

    const proposed = {
      x: proposedPosition.x,
      y: proposedPosition.y,
    };

    const otherLayers = this.layers.filter((entry) => entry.id !== layerBox.id);
    const candidates = [];
    const registerCandidate = (type, position, guides, priority = PRIORITY[type] || PRIORITY.free) => {
      const distance = Math.hypot(position.x - proposed.x, position.y - proposed.y);
      if (distance > this.config.maxSnapDistance && type !== 'grid') return;
      candidates.push({ type, priority, position, guides, distance });
    };

    registerCandidate('free', proposed, [], PRIORITY.free);

    if (this.config.useGridSnap && this.config.gridSize > 0) {
      const gridX = roundToGrid(proposed.x, this.config.gridSize);
      const gridY = roundToGrid(proposed.y, this.config.gridSize);
      registerCandidate(
        'grid',
        { x: gridX, y: gridY },
        [
          createGuideDefinition('grid', 'vertical', gridX),
          createGuideDefinition('grid', 'horizontal', gridY),
        ],
      );
    }

    if (this.config.useEdgeSnap && otherLayers.length > 0) {
      otherLayers.forEach((target) => {
        const targetEdges = this.describeBox(target);
        const layerEdges = this.describeBox({ ...layerBox, ...proposed });

        const tests = [
          { orientation: 'vertical', position: targetEdges.left, x: targetEdges.left },
          { orientation: 'vertical', position: targetEdges.right, x: targetEdges.right - layerBox.width },
          {
            orientation: 'horizontal',
            position: targetEdges.top,
            y: targetEdges.top,
          },
          {
            orientation: 'horizontal',
            position: targetEdges.bottom,
            y: targetEdges.bottom - layerBox.height,
          },
        ];

        tests.forEach((test) => {
          const candidate = { x: proposed.x, y: proposed.y, ...('x' in test ? { x: test.x } : {}), ...('y' in test ? { y: test.y } : {}) };
          const distance = Math.abs((test.orientation === 'vertical' ? candidate.x - layerEdges.left : candidate.y - layerEdges.top));
          if (distance <= this.config.tolerance) {
            registerCandidate(
              'edge',
              candidate,
              [createGuideDefinition('edge', test.orientation, test.position)],
              PRIORITY.edge,
            );
          }
        });
      });
    }

    if (this.config.useCenterLines) {
      const artboardCenter = {
        x: (this.config.artboard?.width || 0) / 2,
        y: (this.config.artboard?.height || 0) / 2,
      };

      const centerCandidate = {
        x: artboardCenter.x - layerBox.width / 2,
        y: artboardCenter.y - layerBox.height / 2,
      };

      const centerDistance = Math.hypot(centerCandidate.x - proposed.x, centerCandidate.y - proposed.y);
      if (centerDistance <= this.config.maxSnapDistance) {
        registerCandidate(
          'center',
          centerCandidate,
          [
            createGuideDefinition('center', 'vertical', artboardCenter.x),
            createGuideDefinition('center', 'horizontal', artboardCenter.y),
          ],
          PRIORITY.center,
        );
      }

      otherLayers.forEach((target) => {
        const targetEdges = this.describeBox(target);
        const targetCenter = {
          x: targetEdges.left + targetEdges.width / 2,
          y: targetEdges.top + targetEdges.height / 2,
        };
        const centerAligned = {
          x: targetCenter.x - layerBox.width / 2,
          y: targetCenter.y - layerBox.height / 2,
        };
        const snapDistance = Math.hypot(centerAligned.x - proposed.x, centerAligned.y - proposed.y);
        if (snapDistance <= this.config.maxSnapDistance) {
          registerCandidate(
            'center',
            centerAligned,
            [
              createGuideDefinition('center', 'vertical', targetCenter.x, { targetId: target.id }),
              createGuideDefinition('center', 'horizontal', targetCenter.y, { targetId: target.id }),
            ],
            PRIORITY.center,
          );
        }
      });
    }

    if (this.config.useSpacingSnap && this.config.spacingInterval > 0 && otherLayers.length > 0) {
      otherLayers.forEach((target) => {
        const targetEdges = this.describeBox(target);
        const candidateSpacingX = this.computeSpacingSnap(
          proposed.x,
          layerBox.width,
          targetEdges.left,
          targetEdges.right,
          this.config.spacingInterval,
        );
        if (candidateSpacingX !== null) {
          registerCandidate('spacing', { x: candidateSpacingX, y: proposed.y }, [
            createGuideDefinition('spacing', 'vertical', candidateSpacingX + layerBox.width),
          ]);
        }

        const candidateSpacingY = this.computeSpacingSnap(
          proposed.y,
          layerBox.height,
          targetEdges.top,
          targetEdges.bottom,
          this.config.spacingInterval,
        );
        if (candidateSpacingY !== null) {
          registerCandidate('spacing', { x: proposed.x, y: candidateSpacingY }, [
            createGuideDefinition('spacing', 'horizontal', candidateSpacingY + layerBox.height),
          ]);
        }
      });
    }

    if (this.config.magneticZones.length > 0) {
      this.config.magneticZones.forEach((zone) => {
        const expanded = {
          left: zone.x - (zone.strength || this.config.tolerance),
          right: zone.x + zone.width + (zone.strength || this.config.tolerance),
          top: zone.y - (zone.strength || this.config.tolerance),
          bottom: zone.y + zone.height + (zone.strength || this.config.tolerance),
        };
        const layerCenter = {
          x: proposed.x + layerBox.width / 2,
          y: proposed.y + layerBox.height / 2,
        };
        const insideZone =
          layerCenter.x >= expanded.left &&
          layerCenter.x <= expanded.right &&
          layerCenter.y >= expanded.top &&
          layerCenter.y <= expanded.bottom;

        if (insideZone) {
          const targetPosition = {
            x: zone.x + zone.width / 2 - layerBox.width / 2,
            y: zone.y + zone.height / 2 - layerBox.height / 2,
          };
          registerCandidate(
            'magnetic',
            targetPosition,
            [
              createGuideDefinition('magnetic', 'vertical', zone.x + zone.width / 2),
              createGuideDefinition('magnetic', 'horizontal', zone.y + zone.height / 2),
            ],
            PRIORITY.magnetic,
          );
        }
      });
    }

    const best = candidates.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.distance - b.distance;
    })[0];

    this.drawGuides(best?.guides || []);

    return { position: best?.position || proposed, guides: best?.guides || [] };
  }

  describeBox(box) {
    const left = box.x || 0;
    const top = box.y || 0;
    const width = box.width || 0;
    const height = box.height || 0;
    return {
      id: box.id,
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
    };
  }

  computeSpacingSnap(origin, size, targetStart, targetEnd, interval) {
    const spacingToStart = targetStart - (origin + size);
    const spacingToEnd = origin - targetEnd;
    const candidateValues = [spacingToStart, spacingToEnd];

    for (const spacing of candidateValues) {
      const nearestInterval = Math.round(spacing / interval) * interval;
      const miss = Math.abs(spacing - nearestInterval);
      if (miss <= this.config.tolerance) {
        return spacing === spacingToStart
          ? targetStart - size - nearestInterval
          : targetEnd + nearestInterval;
      }
    }
    return null;
  }

  injectStyles() {
    if (typeof document === 'undefined' || this.injectedStyles) return;
    const style = document.createElement('style');
    style.textContent = `
      .snap-guides-layer { pointer-events: none; position: fixed; inset: 0; z-index: 2147483646; }
      .snap-guide { position: absolute; border-color: #2f80ed; opacity: 0.8; }
      .snap-guide--vertical { top: 0; bottom: 0; border-left: 1px dashed currentColor; }
      .snap-guide--horizontal { left: 0; right: 0; border-top: 1px dashed currentColor; }
      .snap-guide--magnetic { color: #f2994a; }
      .snap-guide--spacing { color: #9b51e0; }
      .snap-guide--center { color: #27ae60; }
      .snap-guide--edge { color: #2d9cdb; }
      .snap-guide--grid { color: #828282; opacity: 0.5; }
    `;
    document.head.append(style);
    this.injectedStyles = true;
  }

  ensureGuidesRoot() {
    if (typeof document === 'undefined') return null;
    if (!this.guidesRoot) {
      this.injectStyles();
      this.guidesRoot = document.createElement('div');
      this.guidesRoot.className = 'snap-guides-layer';
      document.body.append(this.guidesRoot);
    }
    return this.guidesRoot;
  }

  clearGuides() {
    this.activeGuideElements.forEach((el) => el.remove());
    this.activeGuideElements = [];
  }

  drawGuides(guides) {
    const root = this.ensureGuidesRoot();
    if (!root) return;
    this.clearGuides();

    guides.forEach((guide) => {
      const el = document.createElement('div');
      const orientationClass = guide.orientation === 'vertical' ? 'snap-guide--vertical' : 'snap-guide--horizontal';
      el.className = `snap-guide ${orientationClass} snap-guide--${guide.type}`;

      if (guide.orientation === 'vertical') {
        el.style.left = `${guide.position}px`;
      } else {
        el.style.top = `${guide.position}px`;
      }

      if (guide.type === 'spacing' && guide.distance) {
        el.title = `${guide.distance}px spacing`;
      }

      root.append(el);
      this.activeGuideElements.push(el);
    });
  }
}

function computeSnapPosition(layer, proposedPosition, options = {}) {
  const engine = new SnapEngine(options);
  return engine.computeSnapPosition(layer, proposedPosition);
}

export { SnapEngine, computeSnapPosition };
export default SnapEngine;
