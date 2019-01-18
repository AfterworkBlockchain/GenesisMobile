import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import connect from 'react-redux/es/connect/connect';
import _ from 'lodash';
import { bindActionCreators } from 'redux';
import AppStyle from '../../../commons/AppStyle';
import { screensList } from '../../../navigation/screensList';
import AmendInput from '../components/AmendInput';
import { groupMetaRules } from '../../../config';

class AmendSupportScreen extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    headerTitle: screensList.AmendSupport.title,
    headerRight: <Button onPress={() => navigation.goBack()} title="Done" color="white" />,
    headerTintColor: 'white',
    headerStyle: {
      backgroundColor: AppStyle.voteHeaderBackgroundColor,
    },
  });

  render() {
    return (
      <View style={styles.container}>
        <AmendInput
          propertyPath={groupMetaRules.REQUIRED_APPROVED}
          unit={t.UNIT_TEXT}
          intro={t.INTRO_TEXT}
          description={t.DESCRIPTION_TEXT}
          isNumber
        />
      </View>
    );
  }
}

const t = {
  UNIT_TEXT: '%',
  INTRO_TEXT: 'How many votes needed to pass?',
  DESCRIPTION_TEXT: '',
};

const mapStateToProps = state => ({});

const mapDispatchToProps = _.curry(bindActionCreators)({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AmendSupportScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
