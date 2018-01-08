import { createElement } from 'react';
import { applyMiddleware, combineReducers, compose, createStore } from 'redux';
import { render } from 'react-dom';
import { connect, Provider } from 'react-redux';

let masterStore = null;

export function createApp(component, reducer = {}, middleware = [], run) {
  const finalReducer = reducer.__isBoundReducer ? reducer : combineReducers(reducer);
  const finalMiddleware = middleware.length ? applyMiddleware(...middleware) : undefined;
  masterStore = createStore(finalReducer, finalMiddleware);
  const element = document.createElement('div');
  render(createElement(Provider, { store: masterStore }, component ), element);
  document.body.appendChild(element.children[0]);
  if (run) {
    setTimeout(run);
  }
}

export function createReducer(defaultState = {}, config = []) {
  const reducer = (state = defaultState, action) => {
    const handlers = config
      .filter(([type]) => type === action.type)
      .map(([type, handler]) => handler);
    return handlers.reduce((prevState, handler) => {
      const changes = handler(state, action.payload);
      return {
        ...prevState,
        ...(typeof changes === 'object' ? changes : {}),
      };
    }, { ...state });
  };
  reducer.__isBoundReducer = true;
  return reducer;
}

export function createContainer(component, mapToProps, wrappers = []) {
  const toProps = typeof mapToProps === 'function' ? mapToProps : () => mapToProps;
  const mapStateToProps = (state, ownProps) => {
    const result = toProps(ownProps, masterStore)
    const copy = { ...result };
    for (const i in copy) {
      if (typeof copy[i] === 'function' && copy[i].__isBoundSelector) {
        copy[i] = copy[i]();
      }
    }
    return copy;
  };
  const mapDispatchToProps = () => ({});
  if (!wrappers.length) {
    return connect(mapStateToProps, mapDispatchToProps)(component);
  }
  return compose(
    ...wrappers, 
    connect(mapStateToProps, mapDispatchToProps),
  )(component);
}

export function createAction(payloadCreator, metaCreator) {
  const wrapper = (...args) => {
    const payload = (() => {
      if (payloadCreator) {
        try {
          return payloadCreator(...args);
        } catch (e) {
          return e;
        }
      }
      if (!args.length) {
        return undefined;
      }
      if (args.length === 1) {
        return args[0];
      }
      return args;
    })();
    const meta = (() => {
      if (metaCreator) {
        try {
          return metaCreator(...args);
        } catch (e) {
          return e;
        }
      }
      if (!args.length) {
        return undefined;
      }
      if (args.length === 1) {
        return args[0];
      }
      return args;
    })();
    masterStore.dispatch({
      error: payload instanceof Error,
      meta,
      payload,
      type: wrapper,
    });
  };
  wrapper.__isBoundAction = true;
  return wrapper;
}

export function createSelector(method) {
  const wrapper = (...args) => method(masterStore.getState(), ...args);
  wrapper.__isBoundSelector = true;
  return wrapper;
}

export const createSaga = config => store => next => (action) => {
  next(action);
  const handlers = config
    .filter(([type]) => type === action.type)
    .map(([type, handler]) => handler);
  if (handlers.length) {
    handlers.forEach(handler => handler(action.payload));
  }
};
