const ERROR_COLOR = '#ff7676';
const LINE_TEXT_LIMIT = 250;

const ellipsis = (text, limit) => {
  if (text.length > limit) {
    return `${text.substring(0, limit)}...`;
  }
  return text;
};

const getActionType = (action, definitions) => {
  const { type } = action;
  if (typeof type === 'string') {
    return type;
  }
  if (definitions) {
    for (const key in definitions) {
      if (definitions[key] === type) {
        return key;
      }
    }
  }
  return '(anonymous)';
};

const getStyle = action => {
  if (action.payload && action.payload.error) {
    return `color: ${ERROR_COLOR}`;
  }
  return '';
};

const logStructure = target => {
  if (target === undefined) {
    return;
  }
  if (typeof target === 'string') {
    console.log(ellipsis(target, LINE_TEXT_LIMIT));
  } else if (target !== null && typeof target === 'object') {
    Object.entries(target)
      .filter(([key, value]) => value !== undefined)
      .forEach(([key, value]) => {
        const output = typeof value === 'string'
          ? ellipsis(value, LINE_TEXT_LIMIT)
          : value;
        console.log(`${key}:`, output);
      });
  } else {
    console.log(target);
  }
};

export default definitions =>
  store =>
    next =>
      action => {
        next(action);
        if (process.env.NODE_ENV === 'production') {
          return;
        }
        console.groupCollapsed(
          `%c ACTION: ${getActionType(action, definitions)}`,
          getStyle(action),
        );
        if (action.payload !== undefined) {
          console.groupCollapsed('payload');
          logStructure(action.payload);
          console.groupEnd();
        }
        if (action.error !== undefined) {
          console.groupCollapsed('error');
          console.log(action.error);
          console.groupEnd();
        }
        console.groupCollapsed('state');
        logStructure(store.getState());
        console.groupEnd();
        console.groupEnd();
      };