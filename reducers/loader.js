import { AsyncStorage } from 'react-native';
import _ from 'lodash';
import set from 'lodash/fp/set';
import { loaderActionType } from '../actions/loaderAction';

export const dataEntry = {
  hasPassword: { label: 'HAS_PASSWORD', stateName: 'hasPassword', initValue: false },
  wrongPincodeCount: { label: 'WRONG_PINCODE_COUNT', stateName: 'wrongPincodeCount', initValue: 0 },
  loginToken: { label: 'LOGIN_TOKEN', stateName: 'loginToken', initValue: null },
};

const INIT_STATE = _.mapValues(dataEntry, v => v.initValue);

export const loaderReducer = (state = INIT_STATE, action) => {
  switch (action.type) {
    case loaderActionType.READ_APP_DATA: {
      const { resultList } = action;
      return _.reduce(
        resultList,
        (resultState, singleResult) => {
          const resultValue = singleResult[1];
          const resultKey = singleResult[0];
          const stateDataEntry = _.find(dataEntry, { label: resultKey });
          const stateName = stateDataEntry.stateName;
          if (resultValue != null) {
            return set(stateName, resultValue, resultState);
          }
          return set(stateName, stateDataEntry.initValue, resultState);
        },
        state
      );
    }

    //TODO change into async function
    case loaderActionType.SAVE_APP_DATA: {
      if (Object.keys(action.data).length > 1) {
        const dataSet = _.reduce(
          action.data,
          (result, value, key) => _.concat(result, [key, value]),
          []
        );
        AsyncStorage.mulitSet(dataSet);
      } else {
        const key = Object.keys(action.data)[0];
        const value = Object.values(action.data)[0];
        AsyncStorage.setItem(key, value);
      }
      return { ...state, ...action.data };
    }
    case loaderActionType.ADD_ERROR_COUNT: {
      const currentCount = state.wrongPincodeCount + 1;
      AsyncStorage.setItem(dataEntry.wrongPincodeCount.label, currentCount);
      return {
        ...state,
        wrongPincodeCount: currentCount,
      };
    }
    default:
      return state;
  }
};