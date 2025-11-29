// UI panel for controlling live WebGL background effects.
// Exports initLiveBackgroundPanel(containerElement, { setStyle, setIntensity, setBlur, setUseDepth }).

export function initLiveBackgroundPanel(containerElement, callbacks = {}) {
  const {
    setStyle = () => {},
    setIntensity = () => {},
    setBlur = () => {},
    setUseDepth = () => {},
  } = callbacks;

  const defaults = {
    style: 'still-picture',
    intensity: 0.45,
    blur: 0.35,
    useDepth: false,
  };

  const panel = document.createElement('div');
  panel.className = 'live-background-panel';

  const header = document.createElement('div');
  header.className = 'live-background-header';

  const title = document.createElement('h2');
  title.textContent = 'Live Background';

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Make the picture behind everything move.';

  header.appendChild(title);
  header.appendChild(subtitle);
  panel.appendChild(header);

  const controls = document.createElement('div');
  controls.className = 'live-background-controls';

  const styleField = createSelectField({
    label: 'Background Style',
    tooltip: 'Pick the kind of background behind everything.',
    options: [
      { value: 'still-picture', text: 'Still Picture', tooltip: 'A background that does not move.' },
      { value: 'soft-fog', text: 'Soft Moving Fog', tooltip: 'A slow drifting fog behind everything.' },
      { value: 'moving-lines', text: 'Moving Lines', tooltip: 'Lines that slide and shift in the back.' },
      { value: 'sparks-dark', text: 'Sparks In The Dark', tooltip: 'Little lights that pop in the dark.' },
    ],
    onChange: (value) => setStyle(value),
    defaultValue: defaults.style,
  });

  const intensityField = createSliderField({
    label: 'How Much Movement',
    tooltip: 'Slide to make the background calmer or wilder.',
    min: 0,
    max: 100,
    step: 1,
    defaultValue: defaults.intensity * 100,
    onChange: (value) => setIntensity(value / 100),
  });

  const blurField = createSliderField({
    label: 'How Sharp Or Soft',
    tooltip: 'Slide to blur the moving background or keep it sharp.',
    min: 0,
    max: 100,
    step: 1,
    defaultValue: defaults.blur * 100,
    onChange: (value) => setBlur(value / 100),
  });

  const depthField = createToggleField({
    label: 'Use Depth If There Is Any',
    tooltip: 'If a 3D photo is loaded, let the background feel deeper.',
    defaultChecked: defaults.useDepth,
    onChange: (checked) => setUseDepth(checked),
  });

  controls.appendChild(styleField);
  controls.appendChild(intensityField);
  controls.appendChild(blurField);
  controls.appendChild(depthField);

  panel.appendChild(controls);

  if (containerElement) {
    containerElement.innerHTML = '';
    containerElement.appendChild(panel);
  }

  // Send initial values to the callbacks.
  setStyle(defaults.style);
  setIntensity(defaults.intensity);
  setBlur(defaults.blur);
  setUseDepth(defaults.useDepth);
}

function createSelectField({ label, tooltip, options, onChange, defaultValue }) {
  const wrapper = document.createElement('label');
  wrapper.className = 'live-background-field select-field';
  wrapper.title = tooltip;

  const text = document.createElement('span');
  text.className = 'field-label';
  text.textContent = label;

  const select = document.createElement('select');
  select.className = 'field-control';
  select.setAttribute('aria-label', label);

  options.forEach(({ value, text: optionText, tooltip: optionTooltip }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = optionText;
    option.title = optionTooltip;
    select.appendChild(option);
  });

  select.value = defaultValue;
  select.addEventListener('change', () => onChange(select.value));

  wrapper.appendChild(text);
  wrapper.appendChild(select);

  return wrapper;
}

function createSliderField({ label, tooltip, min, max, step, defaultValue, onChange }) {
  const wrapper = document.createElement('label');
  wrapper.className = 'live-background-field slider-field';
  wrapper.title = tooltip;

  const header = document.createElement('div');
  header.className = 'field-header';

  const text = document.createElement('span');
  text.className = 'field-label';
  text.textContent = label;

  const value = document.createElement('span');
  value.className = 'field-value';
  value.textContent = `${Math.round(defaultValue)}`;

  header.appendChild(text);
  header.appendChild(value);

  const input = document.createElement('input');
  input.type = 'range';
  input.className = 'field-control';
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = defaultValue;
  input.setAttribute('aria-label', label);

  input.addEventListener('input', () => {
    value.textContent = `${Math.round(input.value)}`;
    onChange(Number(input.value));
  });

  wrapper.appendChild(header);
  wrapper.appendChild(input);

  return wrapper;
}

function createToggleField({ label, tooltip, defaultChecked, onChange }) {
  const wrapper = document.createElement('label');
  wrapper.className = 'live-background-field toggle-field';
  wrapper.title = tooltip;

  const text = document.createElement('span');
  text.className = 'field-label';
  text.textContent = label;

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'field-control';
  input.checked = defaultChecked;
  input.setAttribute('aria-label', label);

  input.addEventListener('change', () => onChange(input.checked));

  wrapper.appendChild(text);
  wrapper.appendChild(input);

  return wrapper;
}
