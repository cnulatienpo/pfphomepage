const PRESETS = [
  { id: 'none', label: 'No Movement', tooltip: 'Thing stays still.' },
  { id: 'slow-float', label: 'Slow Float', tooltip: 'Thing gets a tiny bit bigger and smaller over time.' },
  { id: 'soft-bounce', label: 'Soft Bounce', tooltip: 'Thing moves up and down a little like it’s on a spring.' },
  { id: 'quick-pop', label: 'Quick Pop', tooltip: 'Thing jumps quickly and then rests.' },
  { id: 'slide-in', label: 'Slide In From Side', tooltip: 'Thing starts off-screen and slides into place.' }
];

const DEFAULT_STATE = {
  presetId: 'none',
  amount: 40,
  speed: 50,
  delay: 0,
  loop: false
};

function createHeader(container) {
  const header = document.createElement('div');
  header.className = 'motion-panel__header';

  const title = document.createElement('div');
  title.className = 'motion-panel__title';
  title.textContent = 'How Things Move';

  const subtitle = document.createElement('div');
  subtitle.className = 'motion-panel__subtitle';
  subtitle.textContent = 'Make this thing move by itself.';

  header.append(title, subtitle);
  container.appendChild(header);
}

function createLabeledRow(labelText, tooltipText, control) {
  const row = document.createElement('div');
  row.className = 'motion-panel__row';

  const label = document.createElement('label');
  label.className = 'motion-panel__label';
  label.textContent = labelText;
  if (tooltipText) label.title = tooltipText;

  if (control.id) label.htmlFor = control.id;

  const content = document.createElement('div');
  content.className = 'motion-panel__control';
  content.appendChild(control);

  row.append(label, content);
  return row;
}

function createPresetDropdown(onPresetChange) {
  const select = document.createElement('select');
  select.id = 'motion-preset';
  select.className = 'motion-panel__select';
  select.title = PRESETS.find((p) => p.id === DEFAULT_STATE.presetId)?.tooltip;

  PRESETS.forEach((preset) => {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.label;
    option.title = preset.tooltip;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    const selected = PRESETS.find((p) => p.id === select.value);
    if (selected) select.title = selected.tooltip;
    onPresetChange?.(select.value);
  });

  return select;
}

function createSlider(id, defaultValue, tooltip, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'motion-panel__slider-group';

  const range = document.createElement('input');
  range.type = 'range';
  range.min = '0';
  range.max = '100';
  range.value = String(defaultValue);
  range.id = id;
  range.className = 'motion-panel__slider';
  range.title = tooltip;

  const value = document.createElement('span');
  value.className = 'motion-panel__value';
  value.textContent = `${defaultValue}%`;

  range.addEventListener('input', () => {
    value.textContent = `${range.value}%`;
    onChange?.(Number(range.value));
  });

  wrapper.append(range, value);
  return { wrapper, range, value };
}

function createToggle(id, defaultValue, tooltip, onToggle) {
  const toggle = document.createElement('label');
  toggle.className = 'motion-panel__toggle';
  toggle.title = tooltip;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = id;
  checkbox.checked = defaultValue;

  const knob = document.createElement('span');
  knob.className = 'motion-panel__toggle-knob';

  const text = document.createElement('span');
  text.className = 'motion-panel__toggle-text';
  text.textContent = 'Keep Doing It On Loop';

  checkbox.addEventListener('change', () => onToggle?.(checkbox.checked));

  toggle.append(checkbox, knob, text);
  return { toggle, checkbox };
}

function createTestButton(onTest) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'motion-panel__test';
  button.textContent = 'Test Move';
  button.title = 'Play the motion once so you can see it.';
  button.addEventListener('click', () => onTest?.());
  return button;
}

function initMotionPanel(containerElement, callbacks = {}) {
  const container = containerElement;
  container.classList.add('motion-panel');
  container.innerHTML = '';

  let selectedObject = null;

  createHeader(container);

  const presetDropdown = createPresetDropdown(callbacks.onPresetChange);
  container.appendChild(
    createLabeledRow('Motion Preset', 'Pick how the thing should move.', presetDropdown)
  );

  const amountSlider = createSlider(
    'motion-amount',
    DEFAULT_STATE.amount,
    'Slide to make the movement small or big.',
    callbacks.onAmountChange
  );
  container.appendChild(
    createLabeledRow('How Much', 'Slide to make the movement small or big.', amountSlider.wrapper)
  );

  const speedSlider = createSlider(
    'motion-speed',
    DEFAULT_STATE.speed,
    'Slide to make the movement slow or fast.',
    callbacks.onSpeedChange
  );
  container.appendChild(
    createLabeledRow('How Fast', 'Slide to make the movement slow or fast.', speedSlider.wrapper)
  );

  const delaySlider = createSlider(
    'motion-delay',
    DEFAULT_STATE.delay,
    'Make the thing sit still a little bit before it starts moving.',
    callbacks.onDelayChange
  );
  container.appendChild(
    createLabeledRow(
      'Wait Before Moving',
      'Make the thing sit still a little bit before it starts moving.',
      delaySlider.wrapper
    )
  );

  const loopToggle = createToggle(
    'motion-loop',
    DEFAULT_STATE.loop,
    'Let this move happen again and again.',
    callbacks.onLoopToggle
  );
  container.appendChild(createLabeledRow('', '', loopToggle.toggle));

  const testButton = createTestButton(callbacks.onTest);
  const buttonRow = document.createElement('div');
  buttonRow.className = 'motion-panel__row motion-panel__actions';
  buttonRow.appendChild(testButton);
  container.appendChild(buttonRow);

  function applyState(state = DEFAULT_STATE) {
    presetDropdown.value = state.presetId;
    const presetMeta = PRESETS.find((preset) => preset.id === state.presetId);
    presetDropdown.title = presetMeta?.tooltip ?? presetDropdown.title;

    amountSlider.range.value = String(state.amount);
    amountSlider.value.textContent = `${state.amount}%`;

    speedSlider.range.value = String(state.speed);
    speedSlider.value.textContent = `${state.speed}%`;

    delaySlider.range.value = String(state.delay);
    delaySlider.value.textContent = `${state.delay}%`;

    loopToggle.checkbox.checked = Boolean(state.loop);
  }

  function setSelectedObject(obj) {
    selectedObject = obj ?? null;
    const nextState = {
      ...DEFAULT_STATE,
      ...(selectedObject?.motionSettings || {}),
      ...(selectedObject || {})
    };
    applyState(nextState);
  }

  presetDropdown.addEventListener('change', () => {
    if (selectedObject) selectedObject.presetId = presetDropdown.value;
  });
  amountSlider.range.addEventListener('input', () => {
    if (selectedObject) selectedObject.amount = Number(amountSlider.range.value);
  });
  speedSlider.range.addEventListener('input', () => {
    if (selectedObject) selectedObject.speed = Number(speedSlider.range.value);
  });
  delaySlider.range.addEventListener('input', () => {
    if (selectedObject) selectedObject.delay = Number(delaySlider.range.value);
  });
  loopToggle.checkbox.addEventListener('change', () => {
    if (selectedObject) selectedObject.loop = loopToggle.checkbox.checked;
  });

  applyState();

  return { setSelectedObject };
}

export { initMotionPanel };
