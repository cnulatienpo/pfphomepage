const DEFAULT_DEPTH_OPTIONS = {
  frontBoost: 60,
  backBlur: 35,
  parallax: 45,
};

function dispatchAction(element, name, detail = {}) {
  const event = new CustomEvent(name, { bubbles: true, detail });
  element.dispatchEvent(event);
}

function createSection(title) {
  const section = document.createElement('section');
  section.className = 'depth-panel__section';

  if (title) {
    const heading = document.createElement('h3');
    heading.textContent = title;
    section.appendChild(heading);
  }

  return section;
}

function createButton(label, tooltip, onClick, extraClass = '') {
  const button = document.createElement('button');
  button.className = `depth-panel__button ${extraClass}`.trim();
  button.type = 'button';
  button.title = tooltip;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function createToggle(label, tooltip, layerId, state, onToggle) {
  const button = createButton(label, tooltip, () => onToggle(layerId), 'depth-panel__toggle');
  button.setAttribute('data-layer', layerId);
  button.setAttribute('aria-pressed', state ? 'true' : 'false');
  if (state) {
    button.classList.add('is-active');
  }
  return button;
}

function createSlider(label, tooltip, initial, onChange) {
  const wrapper = document.createElement('label');
  wrapper.className = 'depth-panel__slider';
  wrapper.title = tooltip;

  const text = document.createElement('div');
  text.className = 'depth-panel__slider-label';
  text.textContent = label;

  const value = document.createElement('span');
  value.className = 'depth-panel__slider-value';

  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.value = String(initial);
  input.addEventListener('input', () => {
    value.textContent = `${input.value}%`;
    onChange(Number(input.value));
  });

  value.textContent = `${input.value}%`;

  wrapper.appendChild(text);
  wrapper.appendChild(value);
  wrapper.appendChild(input);

  return wrapper;
}

function applyLayerVisibility(state, selectedLayer) {
  const visibility = { front: true, middle: true, back: true };
  let activeLayer = null;

  if (selectedLayer && state.activeLayer !== selectedLayer) {
    activeLayer = selectedLayer;
    Object.keys(visibility).forEach((key) => {
      visibility[key] = key === selectedLayer;
    });
  } else if (selectedLayer && state.activeLayer === selectedLayer) {
    activeLayer = null;
  } else {
    activeLayer = state.activeLayer;
  }

  return { visibility, activeLayer };
}

export function initDepthPanel(containerElement, callbacks = {}) {
  if (!containerElement) {
    throw new Error('initDepthPanel requires a container element');
  }

  containerElement.classList.add('depth-panel');

  const header = document.createElement('header');
  header.className = 'depth-panel__header';

  const title = document.createElement('h2');
  title.textContent = 'Front And Back';
  const subtitle = document.createElement('p');
  subtitle.textContent = 'What is close, what is far.';

  header.appendChild(title);
  header.appendChild(subtitle);

  const pickSection = createSection('Depth Shot');
  const pickButton = createButton(
    'Pick A Depth Picture',
    'Choose a photo that knows what is close and what is far.',
    () => {
      dispatchAction(containerElement, 'ui:pickDepthShot');
      callbacks.onPickDepthShot?.();
    },
  );
  pickSection.appendChild(pickButton);

  const layerSection = createSection('Layers');
  const makeLayersButton = createButton(
    'Make Layers',
    'Split the picture into things close, middle, and far.',
    () => {
      dispatchAction(containerElement, 'ui:depthMakeLayers');
      callbacks.onMakeLayers?.();
    },
    'depth-panel__button--primary',
  );
  layerSection.appendChild(makeLayersButton);

  const toggleGroup = document.createElement('div');
  toggleGroup.className = 'depth-panel__toggles';

  const layerState = { activeLayer: null };
  const toggleButtons = ['front', 'middle', 'back'].map((layerId) => {
    const labels = {
      front: 'Show Only Front Stuff',
      middle: 'Show Only Middle Stuff',
      back: 'Show Only Far Stuff',
    };
    const tooltips = {
      front: 'Only show things that are close to you.',
      middle: 'Only show things in the middle distance.',
      back: 'Only show things far away.',
    };

    const button = createToggle(labels[layerId], tooltips[layerId], layerId, false, (selectedLayer) => {
      const { visibility, activeLayer } = applyLayerVisibility(layerState, selectedLayer);
      layerState.activeLayer = activeLayer;
      toggleButtons.forEach((btn) => {
        const isActive = btn.getAttribute('data-layer') === activeLayer;
        btn.classList.toggle('is-active', Boolean(isActive));
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      Object.entries(visibility).forEach(([id, isVisible]) => {
        dispatchAction(containerElement, 'ui:setLayerVisibility', { layerId: id, visible: isVisible });
        callbacks.onSetLayerVisibility?.(id, isVisible);
      });
    });

    toggleGroup.appendChild(button);
    return button;
  });

  layerSection.appendChild(toggleGroup);

  const sliderSection = createSection('Depth Touch');
  const depthOptions = { ...DEFAULT_DEPTH_OPTIONS };
  const sliderHandlers = {
    frontBoost: (value) => {
      depthOptions.frontBoost = value;
    },
    backBlur: (value) => {
      depthOptions.backBlur = value;
    },
    parallax: (value) => {
      depthOptions.parallax = value;
    },
  };

  const notifyDepthChange = () => {
    dispatchAction(containerElement, 'ui:depthEnhancementChanged', { ...depthOptions });
    callbacks.onSetDepthEnhancement?.({ ...depthOptions });
  };

  const frontSlider = createSlider(
    'Make Front Pop',
    'Make close things sharper and brighter.',
    depthOptions.frontBoost,
    (value) => {
      sliderHandlers.frontBoost(value);
      notifyDepthChange();
    },
  );

  const backSlider = createSlider(
    'Blur The Back',
    'Make far stuff fuzzy so the front stands out.',
    depthOptions.backBlur,
    (value) => {
      sliderHandlers.backBlur(value);
      notifyDepthChange();
    },
  );

  const parallaxSlider = createSlider(
    'How Much Fake 3D',
    'Tiny wiggle or big tilt when you move around.',
    depthOptions.parallax,
    (value) => {
      sliderHandlers.parallax(value);
      notifyDepthChange();
    },
  );

  sliderSection.appendChild(frontSlider);
  sliderSection.appendChild(backSlider);
  sliderSection.appendChild(parallaxSlider);

  containerElement.innerHTML = '';
  containerElement.appendChild(header);
  containerElement.appendChild(pickSection);
  containerElement.appendChild(layerSection);
  containerElement.appendChild(sliderSection);

  return {
    setDepthOptions(options = {}) {
      Object.assign(depthOptions, options);
      [
        { element: frontSlider.querySelector('input'), key: 'frontBoost' },
        { element: backSlider.querySelector('input'), key: 'backBlur' },
        { element: parallaxSlider.querySelector('input'), key: 'parallax' },
      ].forEach(({ element, key }) => {
        if (typeof depthOptions[key] === 'number') {
          element.value = String(depthOptions[key]);
          element.dispatchEvent(new Event('input'));
        }
      });
    },
    getActiveLayer() {
      return layerState.activeLayer;
    },
  };
}
