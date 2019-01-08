import React from 'react';
import { StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import connect from 'react-redux/es/connect/connect';
import _ from 'lodash';
import { bindActionCreators } from 'redux';
import AppStyle from '../../../commons/AppStyle';
import { screensList } from '../../../navigation/screensList';
import NavigationHeader from '../../../components/NavigationHeader';
import SingleLineDisplay from '../../../components/SingleLineDisplay';

const mock = {
  mockId: 'davidFan01',
};

class AccountSettingScreen extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    headerTitle: <NavigationHeader title={screensList.AccountSetting.title} />,
    headerBackTitle: '',
    headerStyle: {
      backgroundColor: AppStyle.backgroundColor,
    },
  });

  static propTypes = {
    navigation: PropTypes.object,
  };

  render() {
    const { navigation } = this.props;
    return (
      <View style={styles.container}>
        <SingleLineDisplay
          title={t.ID_TITLE}
          style={styles.singleLineDisplay}
          value={mock.mockId}
        />
        <SingleLineDisplay
          title={t.PASSWORD_TITLE}
          style={styles.singleLineDisplay}
          value={t.PASSWORD_VALUE}
          onClick={() => navigation.navigate(screensList.PasswordSetting.label)}
        />
      </View>
    );
  }
}

const mapStateToProps = state => ({
  walletAddress: state.walletAddress,
});

const mapDispatchToProps = _.curry(bindActionCreators)({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AccountSettingScreen);

const styles = {
  container: {
    flex: 1,
    backgroundColor: AppStyle.chatBackGroundColor,
  },
  singleLineDisplay: {
    marginTop: 20,
  },
};

const t = {
  ID_TITLE: 'Genesis ID',
  PASSWORD_TITLE: 'Password',
  PASSWORD_VALUE: 'Set',
};