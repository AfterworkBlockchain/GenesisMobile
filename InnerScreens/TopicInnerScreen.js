import React from 'react';
import { StyleSheet, Text, View, Alert, ScrollView } from 'react-native';
import PropTypes from 'prop-types';
import connect from 'react-redux/es/connect/connect';
import _ from 'lodash';
import { bindActionCreators } from 'redux';
import { Entypo, AntDesign } from '@expo/vector-icons';
import { withNavigation } from 'react-navigation';
import AppStyle from '../commons/AppStyle';
import { screensList } from '../navigation/screensList';
import SingleLineDisplay from '../components/SingleLineDisplay';
import SingleSectionDisplay from '../components/SingleSectionDisplay';
import GenesisButton, { VariantList as variantList } from '../components/GenesisButton';
import { voteAction } from '../modules/Vote/voteAction';
import { makeImageUrl } from '../modules/Chat/lib/blob-helpers';
import TinodeAPI from '../modules/Chat/TinodeAPI';
import { MemberListContainer, IntroContainer } from './components';
import { popupAction } from '../actions/popupAction';

const mock = {
  meta: {
    countryName: '',
    description: '',
    economicRule: 'Standard plan',
    value: '1000',
    requiredApproved: 50,
    requiredHour: 168,
    groupWebsitePrefix: 'Https://www.bacaoke.com/',
    voteCost: 1000,
    memberRules: {
      default: [150, 150, 10, 1, 1],
    },
  },
  topic: {
    public: {
      fn: 'new topic',
      photo: null,
    },
    private: {
      comment: 'new country description',
    },
  },
};

class TopicInnerScreen extends React.Component {
  static propTypes = {
    navigation: PropTypes.object,
    initVote: PropTypes.func.isRequired,
    resetVote: PropTypes.func.isRequired,
    edited: PropTypes.bool.isRequired,
    voteCached: PropTypes.object.isRequired,
    userId: PropTypes.string.isRequired,
    showPopup: PropTypes.func.isRequired,

    topic: PropTypes.object.isRequired,
    description: PropTypes.string.isRequired,
    iconName: PropTypes.string.isRequired,
    allowEdit: PropTypes.bool.isRequired,
    isJoined: PropTypes.bool.isRequired,
  };

  componentDidMount() {
    const { initVote, topic } = this.props;
    const metaData = _.merge(mock.meta, {
      countryName: _.get(topic, 'public.fn', ''),
      description: _.get(topic, 'private.comment', ''),
    });
    initVote(metaData);
  }

  onPayment() {
    Alert.alert(
      'Payment',
      `${mock.meta.voteCost} NES`,
      [{ text: 'Pay now', onPress: () => console.log('OK Pressed') }],
      { cancelable: false }
    );
  }

  showVoteNeededAlert() {
    Alert.alert(
      'Vote needed',
      'To make changes please start a vote from chat window',
      [{ text: 'OK', onPress: () => console.log('OK Pressed') }],
      { cancelable: false }
    );
  }

  get isCreatingNewTopic() {
    const { isJoined, allowEdit } = this.props;
    return !isJoined && allowEdit;
  }

  get isBlockedUser() {
    const { isJoined, allowEdit } = this.props;
    return !isJoined && !allowEdit;
  }

  renderButton() {
    const { isJoined, edited, resetVote } = this.props;
    if (edited)
      return (
        <React.Fragment>
          <GenesisButton
            action={() => resetVote()}
            text={t.BUTTON_RESET_EDIT}
            variant={variantList.PRIMARY}
          />
          <GenesisButton
            action={this.onPayment}
            text={t.BUTTON_CONFIRM_EDIT}
            variant={variantList.CONFIRM}
          />
        </React.Fragment>
      );
    if (isJoined)
      return (
        <GenesisButton action={this.onPayment} text={t.BUTTON_LEAVE} variant={variantList.CANCEL} />
      );
    if (this.isBlockedUser)
      return (
        <GenesisButton action={this.onPayment} text={t.BUTTON_JOIN} variant={variantList.CONFIRM} />
      );
    if (this.isCreatingNewTopic)
      return (
        <GenesisButton
          action={() => this.createNewTopic()}
          text={t.BUTTON_CREATE}
          variant={variantList.CONFIRM}
        />
      );
  }

  validateTopicParams() {
    const { voteCached } = this.props;
    if(_.isEmpty(voteCached.countryName))
      return {error: t.CREATE_NAME_ERROR}
    if(_.isEmpty(voteCached.description))
      return {error: t.CREATE_DESCRIPTION_ERROR}
    if(_.isEmpty(voteCached.photo))
      return {error: t.CREATE_PHOTO_ERROR}
    return {error: null}
  }

  createNewTopic() {
    const { voteCached, navigation, userId, showPopup } = this.props;
    const paramError = _.get(this.validateTopicParams(), 'error', null);
    if (paramError)
      return showPopup(paramError)
    TinodeAPI.createAndSubscribeNewTopic(
      voteCached.countryName,
      voteCached.description,
      userId
    ).then(ctrl => {
      showPopup('Please login again to see the topic');
      console.log('in topicInnerScreen log out success', ctrl);
      //TODO to be validate here and add upload profile function
      // navigation.navigate(screensList.Topic.label, {
      //   topicId: ctrl.topic,
      //   title: ctrl.public.fn,
      // })
    });
  }

  renderIntroOrMemberList() {
    const { isJoined, description, iconName, edited, topic } = this.props;
    if (edited) return <IntroContainer iconName={iconName} description={t.VOTE_INTRO} />;
    if (isJoined) return <MemberListContainer topic={topic} navigation={navigation} />;
    if (this.isCreatingNewTopic)
      return <IntroContainer iconName={iconName} description={description} />;
    return <MemberListContainer topic={topic} navigation={navigation}/>;
  }

  render() {
    const { topic, navigation, edited, allowEdit, isJoined } = this.props;

    const topicTitle = topic.public.fn;
    const topicAvatart = makeImageUrl(topic.public.photo);
    const topicDescription = topic.private.comment;

    return (
      <ScrollView style={styles.container}>
        {this.renderIntroOrMemberList()}
        <Text style={styles.rulesTitle}>{t.VOTE_RULES_TITLE}</Text>

        <View style={styles.infoContainer}>
          <SingleLineDisplay
            title={t.GROUP_TOPIC_TITLE}
            value={topicTitle}
            onClick={() =>
              allowEdit
                ? navigation.navigate(screensList.AmendCountryName.label)
                : this.showVoteNeededAlert()
            }
          />
          <SingleSectionDisplay
            title={t.TOPIC_DESCRIPTION_TITLE}
            value={topicDescription}
            onClick={() =>
              allowEdit
                ? navigation.navigate(screensList.AmendDescription.label)
                : this.showVoteNeededAlert()
            }
          />
          {isJoined && (
            <SingleLineDisplay
              title={t.TOPIC_META_TITLE}
              value={mock.meta.value}
              onClick={() => navigation.navigate(screensList.Transactions.label)}
            />
          )}
        </View>

        <View style={styles.rulesContainer}>
          <SingleLineDisplay
            title={t.TOPIC_RULES}
            value={''}
            Icon={props => (
              <Entypo
                name="users"
                size={AppStyle.fontMiddle}
                color={AppStyle.blueIcon}
                style={props.style}
              />
            )}
            onClick={() =>
              navigation.navigate(screensList.TopicRules.label, {
                topic,
                voteEnabled: true,
              })
            }
            style={styles.rules}
          />
        </View>
        {this.renderButton()}
      </ScrollView>
    );
  }
}

const mapStateToProps = state => ({
  edited: !_.isEqual(state.vote.origin, state.vote.cached),
  voteCached: state.vote.cached,
  userId: state.appState.userId,
});

const mapDispatchToProps = _.curry(bindActionCreators)({
  initVote: voteAction.initVote,
  resetVote: voteAction.resetVote,
  showPopup: popupAction.showPopup,
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withNavigation(TopicInnerScreen));

const t = {
  VOTE_INTRO:
    'To star a vote, simply provide new values. All changes must go through voting to take effect.' +
    ' These changes affect everyone in the country. Amend with caution! ',
  VOTE_RULES_TITLE: 'Information',
  GROUP_TOPIC_TITLE: 'Country Name',
  TOPIC_DESCRIPTION_TITLE: 'Description',
  TOPIC_RULES: 'Rules',
  TOPIC_META_TITLE: 'National Treasure',
  VIEW_MORE_MEMBERS: 'View more members',

  BUTTON_CONFIRM_EDIT: 'Confirm and starting Voting',
  BUTTON_RESET_EDIT: 'Reset the rules',
  BUTTON_LEAVE: 'Delete and leave',
  BUTTON_JOIN: 'Join',
  BUTTON_CREATE: 'Confirm and create',

  CREATE_NAME_ERROR: 'Please fill a valid country name',
  CREATE_DESCRIPTION_ERROR: 'Please fill a description for your country',
  CREATE_PHOTO_ERROR: 'Please upload a profile photo for the country',
  CREATE_UPLOAD_PROFILE: 'Upload a country profile',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppStyle.chatBackGroundColor,
  },
  rulesTitle: {
    paddingTop: 30,
    paddingBottom: 10,
    paddingHorizontal: 20,
    color: AppStyle.lightGrey,
    fontFamily: AppStyle.mainFont,
    fontSize: AppStyle.fontMiddleSmall,
  },
  infoContainer: {
    marginTop: 20,
    backgroundColor: 'white',
  },
  rulesContainer: {
    marginTop: 20,
    backgroundColor: 'white',
  },
});
