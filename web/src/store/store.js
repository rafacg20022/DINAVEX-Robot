// En Redux 5 createStore se importa como legacy_createStore, pero funciona igual
import { combineReducers, legacy_createStore as createStore, compose } from "redux";
import robotReducer from "./reducers/robot";

const rootReducer = combineReducers({
  robot: robotReducer,
});

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const store = createStore(rootReducer, composeEnhancers());

export default store;
