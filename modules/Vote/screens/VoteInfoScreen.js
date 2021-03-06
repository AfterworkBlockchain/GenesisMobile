import React from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import PropTypes from 'prop-types';
import connect from 'react-redux/es/connect/connect';
import _ from 'lodash';
import { bindActionCreators } from 'redux';
import { AntDesign } from '@expo/vector-icons';
import AppStyle from '../../../commons/AppStyle';
import { screensList } from '../../../navigation/screensList';
import NavigationHeader from '../../../components/NavigationHeader';
import MultiLineButton from '../../../components/MultiLineButton';
import MemberList from '../../../components/MemberList';
import LightButton from '../../../components/LightButton';
import GenesisButton, { VariantList } from '../../../components/GenesisButton';
import { lockScreen } from '../../Unlock/lockScreenUtils';
import { aboutInfo } from '../../../config';
import { INIT_VALUE } from '../reducer/voteReducer';
import { popupAction } from '../../../actions/popupAction';
import { getPrivateKeyAsync } from '../../../utils/secureStoreUtils';
import { createVote, submitVote } from '../../../utils/contractUtils';

class VoteInfoScreen extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    headerTitle: <NavigationHeader title={screensList.VoteInfo.title} />,
    headerBackTitle: ' ',
    ...AppStyle.commonHeader,
  });

  static propTypes = {
    navigation: PropTypes.object,
    userName: PropTypes.string,
    topicsMap: PropTypes.object.isRequired,
    subscribedChatId: PropTypes.string,
    userId: PropTypes.string.isRequired,

    walletAddress: PropTypes.string,
    showPopup: PropTypes.func.isRequired,
  };

  get topicData() {
    const { subscribedChatId, topicsMap } = this.props;
    return _.get(topicsMap, subscribedChatId, {});
  }

  buildSupportTitle = (supportList, allMemberList) =>
    `${supportList.length} (${Number((supportList.length / allMemberList.length) * 100).toFixed(
      2
    )}%)`;

  onPayment(isSupport) {
    const { navigation, showPopup, walletAddress, userId } = this.props;
    const that = this;
    Alert.alert(
      'Payment',
      `${INIT_VALUE.origin.voteCost} ETH/NES  (Alpha version no cost)`,
      [
        {
          text: 'Pay now',
          onPress: () => {
            if (_.isEmpty(walletAddress)) {
              showPopup(t.NO_WALLET);
            } else {
              lockScreen(navigation)
                .then(() => new Promise(getPrivateKeyAsync))
                .then(privateKey => {
                  submitVote(
                    walletAddress,
                    userId,
                    privateKey,
                    that.topicData,
                    navigation,
                    isSupport
                  );
                });
            }
          },
        },
      ],
      { cancelable: false }
    );
  }

  getSupportList(list, subs) {
    return _.reduce(
      list,
      (acc, value) => {
        const findResult = _.find(subs, { user: value });
        if (!findResult) return acc;
        return _.concat(acc, findResult);
      },
      []
    );
  }

  render() {
    const { navigation } = this.props;
    const topic = this.topicData
    if(!topic)
      return;
    const voteData = topic.vote;
    const voteUser = _.find(topic.subs, {user: voteData.user})
    const voteUserName = voteUser ? voteUser.public.fn : voteData.user;
    
    console.log('user list is', topic.subs);
    const renderList = [
      { title: t.VOTE_ID_TITLE, value: voteData.id },
      { title: t.OWNER_TITLE, value: voteUserName},
      { title: t.EXPIRES_TITLE, value: voteData.end },
      { title: t.VOTE_FUNCTION, value: voteData.Fn},
      { title: t.VOTE_PARAMS, value: voteData.Inputs.join()}
    ];

    //TODO only in test that yes + no = 1
    const yesList = this.getSupportList(voteData.forlist, topic.subs);
    const noList = this.getSupportList(voteData.againstlist, topic.subs);

    const SupportList = props => (
      <View style={styles.supportListContainer}>
        <View style={styles.listTitleContainer}>
          <Text style={styles.listTitleText}>{props.titleText}</Text>
          <Text style={styles.listSubtitleText}>{props.supportRateText}</Text>
        </View>
        <View style={styles.supportList}>
          <MemberList list={props.list} limit={12} withFutureMember={false} />
          {props.list.length > 12 && (
            <LightButton
              onPress={() =>
                navigation.navigate(screensList.Members.label, {
                  list: props.list,
                })
              }
              text={t.VIEW_MORE_MEMBERS}
            />
          )}
        </View>
      </View>
    );

    return (
      <ScrollView style={styles.container}>
        <View style={styles.voteContainer}>
          <MultiLineButton renderList={renderList} />
        </View>
        <SupportList
          titleText={t.YES}
          supportRateText={this.buildSupportTitle(yesList, topic.subs)}
          list={yesList}
        />
        <SupportList
          titleText={t.NO}
          supportRateText={this.buildSupportTitle(noList, topic.subs)}
          list={noList}
        />
        <GenesisButton
          action={() => this.onPayment(true)}
          text={t.YES_BUTTON}
          variant={VariantList.CONFIRM}
        />
        <GenesisButton
          action={() => this.onPayment(false)}
          text={t.NO_BUTTON}
          variant={VariantList.CANCEL}
        />
      </ScrollView>
    );
  }
}

const mapStateToProps = state => ({
  topicsMap: state.topics.topicsMap,
  userInfo: state.chat.userInfo,
  userName: state.chat.userInfo.name,
  userId: state.chat.userId,
  subscribedChatId: state.chat.subscribedChatId,
  walletAddress: state.appState.walletAddress,
});

const mapDispatchToProps = _.curry(bindActionCreators)({
  showPopup: popupAction.showPopup,
});

const t = {
  VOTE_ID_TITLE: 'Vote # ',
  OWNER_TITLE: 'By: ',
  EXPIRES_TITLE: 'Expires: ',
  VOTE_FUNCTION: 'Content: ',
  VOTE_PARAMS: 'Params: ',
  YES: 'Yes',
  NO: 'No',
  VIEW_MORE_MEMBERS: 'View more voters',
  YES_BUTTON: 'Vote support',
  NO_BUTTON: 'Vote against',
  NO_WALLET: 'Please make sure you have enough fund in your wallet',
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VoteInfoScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppStyle.mainBackgroundColor,
  },
  voteContainer: {
    backgroundColor: 'white',
    marginVertical: 20,
    height: 170,
  },
  supportListContainer: {
    backgroundColor: 'white',
    padding: 10,
  },
  listTitleContainer: {
    borderBottomColor: AppStyle.lightGrey,
    borderBottomWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  listTitleText: {
    color: 'red',
    fontFamily: AppStyle.mainFont,
    fontSize: AppStyle.fontMiddle,
  },
  listSubtitleText: {
    color: 'black',
    fontSize: AppStyle.fontMiddleSmall,
    fontFamily: AppStyle.mainFont,
    paddingLeft: 20,
  },
  supportList: {
    flexDirection: 'column',
  },
});
