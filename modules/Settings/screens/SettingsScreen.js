import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import connect from 'react-redux/es/connect/connect';
import _ from 'lodash';
import { bindActionCreators } from 'redux';
import AppStyle from '../../../commons/AppStyle';
import { screensList } from '../../../navigation/screensList';
import NavigationHeader from '../../../components/NavigationHeader';
import SingleLineDisplay from '../../../components/SingleLineDisplay';
import packageJson from '../../../package';
import TinodeAPI from '../../Chat/TinodeAPI';
import Container from "../../../components/Container";

class SettingsScreen extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    headerTitle: <NavigationHeader title={screensList.Settings.title} />,
    headerBackTitle: '',
  });

  static propTypes = {
    navigation: PropTypes.object,
  };

  render() {
    const { navigation } = this.props;
    return (
      <Container style={styles.container}>
        <SingleLineDisplay
          title={t.SECURITY_TITLE}
          value={''}
          style={styles.singleDisplay}
          onClick={() => navigation.navigate(screensList.AccountSetting.label)}
        />
        <SingleLineDisplay
          title={t.ABOUT_TITLE}
          style={styles.singleDisplay}
          value={packageJson.version}
          onClick={() => navigation.navigate(screensList.About.label)}
        />
        <SingleLineDisplay
          title={t.LOG_OUT_TITLE}
          style={styles.singleDisplay}
          value={''}
          onClick={() => TinodeAPI.logout(navigation)}
        />
      </Container>
    );
  }
}

const mapStateToProps = state => ({
  walletAddress: state.appState.walletAddress,
});

const mapDispatchToProps = _.curry(bindActionCreators)({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SettingsScreen);

const styles = StyleSheet.create({
  singleDisplay: {
    marginTop: 20,
  },
  container: {
    flex: 1,
    backgroundColor: AppStyle.chatBackGroundColor,
  },
});

const t = {
  SECURITY_TITLE: 'Account Security',
  ABOUT_TITLE: 'About',
  LOG_OUT_TITLE: 'Log out',
};
