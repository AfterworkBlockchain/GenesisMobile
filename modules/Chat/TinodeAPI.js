import { Platform } from 'react-native';
import { NavigationActions, StackActions } from 'react-navigation';
import _ from 'lodash';
import Tinode from '../../tinode/tinode';
import {chatConfig, contractInfo, wsInfo, contractProps, countryProps, defaultUnsubscribedChatSeq} from '../../config';
import { store } from '../../reducers/store';
import { chatAction } from './actions/chatAction';
import { screensList } from '../../navigation/screensList';
import { topicsAction } from './actions/topicsAction';
import * as chatUtils from '../../utils/chatUtils';
import { popupAction } from '../../actions/popupAction';
import { loaderAction } from '../../actions/loaderAction';
import { confirmStatus, VoteParams, VoteTypes } from '../../constants/ContractParams';

const newGroupTopicParams = { desc: { public: {}, private: { comment: {} } }, tags: {} };

class TinodeAPIClass {
  constructor() {
    this.init();
  }

  init() {
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    let tinode = new Tinode(
      wsInfo.appName,
      wsInfo.serverAddress,
      wsInfo.apiKey,
      null,
      wsInfo.isHttps,
      platform
    );
    tinode.enableLogging(true, true);
    tinode.onConnect = () => {
      const params = tinode.getServerInfo();
      console.log('connected！server info: ', params);
      store.dispatch(chatAction.connected());
    };
    tinode.onDisconnect = data => {
      console.log('disconnected', data);
    };
    this.tinode = tinode;
  }

  handleError(err) {
    console.log('error is', err);
    store.dispatch(popupAction.showPopup(err.toString()));
  }

  initTransaction(topic, params) {
    return this.tinode.initTxRequest(topic, params).catch(err => console.log('err is', err));
  }

  getDescription(topic) {
    const Topic = this.tinode.getTopic(topic);
    return Topic.getMetaInactive({
        what: 'desc',
      })
      .catch(err => console.log('get description err is', err));
  }
  
  getVoteInfo = (topic, walletAddress, userId) =>
    this.tinode.vote(topic, {
      what: VoteTypes.STATUS,
      // [VoteParams.WALLET_ADDRESS]: walletAddress,
      [VoteParams.USER]: userId,
    });

  createNewVote = (topic, walletAddress, voteParams, userId) =>
    this.tinode.vote(topic, {
      what: VoteTypes.NEW,
      [VoteParams.WALLET_ADDRESS]: walletAddress,
      [VoteParams.NEW_VOTE]: voteParams,
      [VoteParams.USER]: userId,
    });

  submitVoteBallot = (topic, walletAddress, userId, ballot) =>
    this.tinode.vote(topic, {
      what: VoteTypes.VOTE,
      [VoteParams.WALLET_ADDRESS]: walletAddress,
      [VoteParams.BALLOT]: ballot,
      [VoteParams.USER]: userId,
    });

  getVoteParams = (topic, walletAddress) =>
    this.tinode.vote(topic, {
      what: VoteTypes.PARAMS,
      [VoteParams.WALLET_ADDRESS]: walletAddress,
    });

  sendTransaction(topic, params) {
    return this.tinode.sendTx(topic, params).catch(err => console.log('err is', err));
  }

  connect() {
    this.tinode.connect().catch(err => {
      if (err) {
        this.handleError(err);
      }
    });
  }

  // User is sending a message, either plain text or a drafty object, possibly
  // with attachments.
  handleSendMessage(topicId, userId, msg) {
    let topic = this.tinode.getTopic(topicId);

    //TODO need to add local cache with second params to true
    msg = topic.createMessage(msg, false);
    // The uploader is used to show progress.
    // msg._uploader = (progress)=> {
    //   console.log('progress is', progress)
    // };

    if (!topic.isSubscribed()) {
      return this.subscribe(topicId, userId);
    }

    return topic.publishDraft(msg).catch(err => {
      this.handleError(err.message);
    });
  }

  //with credential, please refer to the doLogin function in
  async login(username, password, oldUserId, token, credentialCode, navigation) {
    let cred = Tinode.credential({ meth: 'email', val: username });
    if (credentialCode) {
      cred = Tinode.credential({ meth: 'email', resp: credentialCode });
    }
    // Try to login with login/password. If they are not available, try token. If no token, ask for login/password.
    let promise = null;
    // let token = this.tinode.getAuthToken();
    console.log('authToken is', token);
    let ctrl;
    try {
      if (username && password) {
        ctrl = await this.tinode.loginBasic(username, password, cred);
      } else if (token) {
        ctrl = await this.tinode.loginToken(token, cred);
        //   token = '7k7lEbfMqdQPSj9cFAABAAEAA6pHN+0nlq3HE/xnsuvjeYMGXMPjBXSntvY/8tBMjOI='
        //   this.tinode.setAuthToken(token);
        //    ctrl = await this.tinode.loginToken(token, cred);
      }
      console.log('ctrl is', ctrl);
      this.handleLoginSuccessful(ctrl, navigation, oldUserId);
    } catch (err) {
      // Login failed, report error.
      // this.setState({ loginDisabled: false, credMethod: undefined, credCode: undefined });
      this.handleError(err.message, 'err');
      // localStorage.removeItem('auth-token');
    }
  }

  handleLoginSuccessful(ctrl, navigation, oldUserId) {
    const me = this.tinode.getMeTopic();
    // me.onData = this.onData; //Callback which receives a {data} message.
    // me.onMeta = this.onMeta; //Callback which receives a {meta} message.
    // me.onPres = console.log //	Callback which receives a {pres} message.
    // me.onInfo = console.log //Callback which receives an {info} message.
    me.onMetaDesc = this.tnMeMetaDesc.bind(this); //Callback which receives changes to topic description desc.
    me.onContactUpdate = this.tnMeContactUpdate; //Callback when presence change
    me.onSubsUpdated = this.tnMeSubsUpdated.bind(this, me); //Called after a batch of subscription changes have been received and cached.
    me.onMetaSub = this.tnMeMetaSub.bind(this, me); //	Called for a single subscription record change.
    // me.onDeleteTopic = console.log // Called after the topic is deleted.

    if (ctrl.code >= 300 && ctrl.text === 'validate credentials') {
      chatUtils.handleCredentialsRequest(navigation, ctrl.params);
    } else {
      chatUtils.saveLoginData(ctrl.params.user, oldUserId, ctrl.params.token);
      const resetAction = StackActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName: screensList.ChatList.label })],
      });
      navigation.dispatch(resetAction);
      // this.handleLoginSuccessful();
    }
  }
  
  bindWallet(walletAddress) {
    return this.tinode.setMeta("me", {desc: {pubaddr: walletAddress}})
  }

  tnMeMetaSub(meTopic, topicData) {
    store.dispatch(chatAction.updateChatMap(topicData));
  
    const topicId = topicData.topic;
    if(topicData.seq === defaultUnsubscribedChatSeq) {
      TinodeAPI.getDescription(topicId).then(topicData => {
        store.dispatch(topicsAction.updateTopic(topicId, _.assign(topicData, {vote: null})));
      })
    }
  }

  onData(data) {
    console.log('data is', data);
  }

  leaveTopic(topicId, txParams) {
    if (!topicId) {
      return;
    }
    let topic = this.tinode.getTopic(topicId);
    if (topic && topic.isSubscribed()) {
      return topic
        .leave(true, txParams)
        .catch(err => this.handleError(err))
        .then(ctrl => {
          if (ctrl.code === 200) {
            store.dispatch(chatAction.unsubscribeChat(topicId));
          }
          return Promise.resolve(ctrl);
        });
    }
    return Promise.resolve();
  }

  fetchMoreTopics(topicId) {
    let topic = this.tinode.getTopic(topicId);
    if (!topic.isSubscribed() || !topic.msgHasMoreMessages()) {
      return Promise.resolve();
    }
    return topic.getMessagesPage(chatConfig.messagePerPage).catch(err => {
      this.handleError(err.message);
    });
  }

  fetchTopics() {
    const me = this.tinode.getMeTopic();
    const subscribePromise = me.subscribe(
      me
        .startMetaQuery()
        .withLaterSub()
        .withDesc()
        .build()
    );
    if (me.isSubscribed()) {
      return me
        .leave(false)
        .then(() => subscribePromise)
        .catch(err => {
          this.handleError(err.message, 'err');
        });
    } else {
      return subscribePromise.catch(err => {
        this.handleError(err.message, 'err');
      });
    }
  }

  tnMeMetaDesc(meTopics) {
    console.log('tnMeMetaDesc, ', meTopics);
    chatUtils.saveUserData(meTopics);
  }

  tnMeContactUpdate(what, count) {
    console.log('contact update', what, count);
  }

  tnMeSubsUpdated(meTopics, topicIds) {
    console.log('me subs updates!', topicIds);
    // let chatList = [];
    // meTopics.contacts(c => {
    //   if(c.topic==='grp_aauZ9a8yFU'){
    //     console.log('contact is', c);
    //   }
    //
    //   chatList.push(c);
    // });
  }

  lightSubscribe(topicId, txParams) {
    let topic = this.tinode.getTopic(topicId);
    return topic.subscribe(undefined, undefined, txParams);
  }

  subscribe(topicId, userId) {
    let topic = this.tinode.getTopic(topicId);
    let newGroupTopic = Tinode.isNewGroupTopicName(topicId);

    topic.onData = this.handleNewMessage.bind(this, topic, topicId);
    // topic.onAllMessagesReceived = this.handleAllMessagesReceived;
    topic.onInfo = this.handleInfoReceipt.bind(this, topic, topicId);
    topic.onMetaDesc = this.handleDescChange.bind(this, topic, topicId);
    // topic.onMetaSub = this.handleMetaSubChange.bind(this, topic, topicId);
    topic.onSubsUpdated = this.handleSubsUpdated.bind(this, topic, topicId, userId);

    // topic.onPres = this.handleSubsUpdated.bind(this, topic, topicId, userId);

    //TODO why? add title and avatar?
    this.handleDescChange(topic, topicId, 'first desc');
    this.handleSubsUpdated(topic, topicId, userId, 'first update Subs');
    store.dispatch(chatAction.subscribeChat(topicId));

    if (!topic.isSubscribed()) {
      // Don't request the tags. They are useless unless the user
      // is the owner and is editing the topic.
      let getQuery = topic
        .startMetaQuery()
        .withLaterDesc()
        .withLaterSub()
        .withLaterData(chatConfig.messagePerPage)
        .withLaterDel()
        .withTags();
      let setQuery = newGroupTopic ? newGroupTopicParams : undefined;

      topic
        .subscribe(getQuery.build(), setQuery)
        .then(ctrl => {
          console.log('subscribe callback ctrl is ', ctrl);
          // If there are unsent messages, try sending them now.
          topic.queuedMessages(pub => {
            if (!pub._sending && topic.isSubscribed()) {
              topic.publishMessage(pub);
            }
          });
        })
        .catch(err => {
          console.log(err.message, 'err');
        });
    }
  }

  unsubscribe(oldTopicId) {
    if (!oldTopic) {
      return;
    }
    let oldTopic = this.tinode.getTopic(oldTopicId);
    if (oldTopic && oldTopic.isSubscribed()) {
      oldTopic
        .leave(false)
        .catch(() => {
          /* do nothing here */
        })
        .finally(() => {
          // We don't care if the request succeeded or failed.
          // The topic is dead regardless.
          oldTopic.onData = undefined;
          oldTopic.onAllMessagesReceived = undefined;
          oldTopic.onInfo = undefined;
          oldTopic.onMetaDesc = undefined;
          oldTopic.onSubsUpdated = undefined;
          oldTopic.onPres = undefined;
        });
    }
    store.dispatch(chatAction.subscribeChat(null));
  }

  handleNewMessage(topic, topicId, msg) {
    console.log('in handle News messages, msg are:', msg);
    const messages = [];
    topic.messages(function(m) {
      if (!m.deleted) {
        messages.push(m);
      }
    });
    let status = topic.msgStatus(msg);
    if (status >= Tinode.MESSAGE_STATUS_SENT) {
      topic.noteRead(msg.seq);
    }
    store.dispatch(loaderAction.saveChatCache(topicId, messages));
    store.dispatch(topicsAction.updateTopicMessages(topicId, messages));
  }

  handleServerResponse(topic, tx) {
    if (!tx) {
      tx = topic;
      topic = null;
    }
    console.log('topic is', topic, 'receive response', tx);
    if (tx.hasOwnProperty('confirmed')) {
      switch (tx.confirmed) {
        case confirmStatus.OK:
          return store.dispatch(popupAction.showPopup('transaction successfully deployed'));
        case confirmStatus.NOK:
          return store.dispatch(popupAction.showPopup('transaction deployment failed'));
        case confirmStatus.SENT:
          return store.dispatch(
            popupAction.showPopup('transaction sent to the blockchain network')
          );
      }
    }
    const txRaw = {
      nonce: tx.nonce,
      gasLimit: tx.gaslimit,
      gasPrice: tx.gasprice,
      data: tx.data,
      value: contractInfo.defaultValue,
    };
    let txRawWithTo;
  }

  handleInfoReceipt(topic, topicId, info) {
    console.log('in handleInfoReceipt, info are:', info);
    switch (info.what) {
      case 'kp':
      case 'read':
      case 'recv':
      default:
        console.log('receipt info is', info);
    }
  }

  handleDescChange(topic, topicId, desc) {
    console.log('topics Info is', desc);
    if (desc.public) {
      store.dispatch(
        topicsAction.updateTopicMeta(
          topicId,
          _.pick(
            topic,
            _.concat(
              [
                'private',
                'public',
                'topic',
                'created',
                'touched',
                'updated',
                '_tags',
                'online',
                'acs',
                'name',
              ],
              countryProps,
              contractProps
            )
          )
        )
      );
    } else {
      store.dispatch(topicsAction.updateTopicMeta(topicId, '', '', ''));
    }
  }
  //TODO which in the future could be optimized with group user, only fetch the user id
  handleSubsUpdated(topic, topicId, userId, memberIdList) {
    console.log('in handle Subs Update, subsUpdated are:', memberIdList);
    const subs = [];
    const topicName = topic.topic || topic.name;
    topic.subscribers(sub => {
      if (topic.getType() === 'grp') {
        console.log('subs user is', sub);
        return subs.push(sub);
      }
      if (sub.user !== userId) {
        subs.push(sub);
      }
    });
    store.dispatch(topicsAction.updateTopicSubs(topicName, subs));
  }

  handleCreateNewAccount(navigation, email, password, username, photo) {
    console.log('create public is', chatUtils.generatePublicInfo(username, photo));
    return this.tinode
      .createAccountBasic(email, password, {
        public: chatUtils.generatePublicInfo(username, photo),
        tags: undefined,
        cred: Tinode.credential({ meth: 'email', val: email }),
      })
      .then(ctrl => {
        console.log('ctrl is', ctrl);
        if (ctrl.code >= 300 && ctrl.text === 'validate credentials') {
          chatUtils.handleCredentialsRequest(navigation, ctrl.params);
        } else {
          this.handleLoginSuccessful(ctrl, navigation);
        }
      })
      .catch(err => {
        this.handleError(err.message, 'err');
      });
  }

  createAndSubscribeNewTopic(cachedVote, txParams, constructorParams) {
    const { countryName, profile, countrydesc } = cachedVote;
    const publicInfo = chatUtils.generatePublicInfo(countryName, profile);
    const topicName = this.tinode.newGroupTopicName();
    let topic = this.tinode.getTopic(topicName);
    const newTopicParams = {
      desc: { ...constructorParams, public: publicInfo, private: { comment: countrydesc } },
    };
    let getQuery = topic
      .startMetaQuery()
      .withLaterDesc()
      .withLaterSub()
      .withLaterData(chatConfig.messagePerPage)
      .withLaterDel();
    return topic
      .subscribe(getQuery.build(), newTopicParams, txParams)
      .then(ctrl => {
        console.log('create new topic ctrl is', ctrl);
        this.unsubscribe(topicName);
        return Promise.resolve(ctrl);
      })
      .catch(err => {
        this.handleError(err.message);
      });
  }

  logout(navigation) {
    if (this.tinode) {
      this.tinode.onDisconnect = () => {
        store.dispatch(loaderAction.clearAppData());

        const navigateAction = NavigationActions.navigate({
          routeName: 'Login',
          params: {},
          action: StackActions.popToTop(),
        });
        
        navigation.dispatch(navigateAction);
        store.dispatch(chatAction.clearChat());
        this.init();
        this.connect();
      };
      this.tinode.disconnect();
    }
  }
}

const TinodeAPI = new TinodeAPIClass();
Object.freeze(TinodeAPI);

export default TinodeAPI;
