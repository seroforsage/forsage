import React, {Component} from 'react';
import {Modal, Button, WhiteSpace, WingBlank, Toast, Flex} from 'antd-mobile';
import './App.css';
import './css/jquery.fancybox.min.css';
import './themes/default/styles/css/style.css';
import './themes/default/styles/css/responsive.css';
import './css/animate/animate.min.css'
import './css/common.css';
import './css/cabinet.css';

import forsageLogo from './themes/default/img/logo-forsage.svg';
import x3Logo from './themes/default/upload/logo-x3.svg';
import x4Logo from './themes/default/upload/logo-x4.svg'

import copy from 'copy-to-clipboard';

import BigNumber from "bignumber.js";
import abi from './component/contract';

const alert = Modal.alert;
const operation = Modal.operation;

class App extends Component {

    constructor(props) {
        super(props);
        this.state = {
            userInfo: {
                id: 0,
                referrer: 0,
                partnersCount: 0,
                s3Income: 0,
                s4Income: 0,
                x3Matrix: [],
                x6Matrix: []
            },
            info: {
                total: 0,
                regNumOf24H: 0,
                lastUserId: 2
            },
            x3Show: true,
            x4Show: true
        };
    }

    fetchInfo(mainPKr) {
        if (!mainPKr && this.state.account) {
            mainPKr = this.state.account.mainPKr;
        }
        if (!mainPKr) {
            return;
        }

        let self = this;
        abi.info(mainPKr, function (info) {
            self.setState({info: info});
        });
        abi.userInfo(mainPKr, function (user) {
            self.setState({userInfo: user});
        });
    }

    componentDidMount() {
        let self = this;
        abi.init
            .then(() => {
                if (self.state.account) {
                    self.fetchInfo(self.state.account.mainPKr);
                } else {
                    abi.getCurrentAccount(function (account) {
                        console.log("account", account);
                        self.setState({account: account});
                        self.fetchInfo(account.mainPKr);
                    });
                }
                self.timer = setInterval(function () {
                    self.fetchInfo();
                }, 20000);
            });
    }

    componentWillUnmount() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    changAccount() {
        let self = this;
        abi.accountList(function (accounts) {
            let actions = [];
            accounts.forEach(function (account, index) {
                actions.push(
                    {
                        text: <span>{self.showAccount(account)}</span>, onPress: () => {
                            self.setState({account: account});
                            self.fetchInfo(account.mainPKr);
                        }
                    }
                );
            });
            operation(actions);
        });
    }

    showAccount(account) {
        if (!account) {
            return "user"
        }
        return account.name + " " + account.mainPKr.slice(0, 5) + "..." + account.mainPKr.slice(-5)
    }

    showName(account) {
        if (!account) {
            return "user"
        }
        if (account.name) {
            return account.name
        } else {
            return account.mainPKr.slice(0, 3) + "..." + account.mainPKr.slice(-3)
        }
    }

    showAddress(addr) {
        return addr.slice(0, 5) + "..." + addr.slice(-5)
    }

    showValue(val, decimal, decimalPlaces) {
        if (!val) {
            return "0"
        }
        if (!decimalPlaces) {
            decimalPlaces = 0;
        }
        let text = new BigNumber(val).dividedBy(new BigNumber(10).pow(decimal)).toFixed(decimalPlaces);
        return text;
    }

    render() {
        let self = this;
        let x3 = this.state.userInfo.x3Matrix.map((level, index) => {
            let referrals = [0, 0, 0];
            let relationships = [0, 0, 0];
            level.referrals.forEach((val, index) => {
                referrals[index] = val;
                relationships[index] = level.relationships[index];
            });
            var firstActive = false;
            if (this.state.userInfo.id > 0 && (index == 0 || this.state.userInfo.x3Matrix[index - 1].active) && !this.state.userInfo.x3Matrix[index].active) {
                firstActive = true;
            }
            let isExtraDividends = false;
            if (!level.active && index > 0) {
                isExtraDividends = this.state.userInfo.x3Matrix[index - 1].isExtraDividends;
            }

            return (
                <div className={level.active ? "buy__item buy__item_selected" : "buy__item"}>
                    <div className="buy__inner">
                        <a className="buy__wrap">
                            <span className="buy__number">{index + 1}</span>
                            <span className="buy__count">{100 * Math.pow(2, index)}</span>
                            {
                                isExtraDividends && <span className="buy__label buy__label_alert">
                                    <i className="icon icon-alert-yellow"
                                       title="Your partner is ahead of you on this site!"></i>
                                </span>
                            }
                        </a>
                        {
                            level.active ? <div className="buy__dots buy__dots_3 row">
                                    {
                                        referrals.map((r, index) => {
                                            let classValue = "buy__dot empty__dot";
                                            if (r != 0) {
                                                if (relationships[index] == 0) {
                                                    classValue = "buy__dot sale__dot";
                                                } else if (relationships[index] == 1) {
                                                    classValue = "buy__dot sale-overflow-up__dot";
                                                } else if (relationships[index] == 2) {
                                                    classValue = "buy__dot sale-overflow-down__dot ";
                                                } else if (relationships[index] == 3) {
                                                    classValue = "buy__dot gift__dot";
                                                }
                                            }
                                            return (
                                                <a className={classValue}
                                                   title={"id:" + referrals[index]}></a>
                                            )
                                        })
                                    }
                                    <div className="buy__data">
                                        <div className="buy__data-item">
                                            <div className="buy__data-count">{level.partnersCount}</div>
                                            <div className="buy__data-icon"><i
                                                className="icon icon-partners-blue icon_xs"></i></div>
                                        </div>
                                        <div className="buy__data-item">
                                            <div className="buy__data-count">{level.reinvestCount}</div>
                                            <div className="buy__data-icon"><i
                                                className="icon icon-reinvest icon_xs"></i></div>
                                        </div>
                                    </div>
                                </div> :
                                <div className="buy__dots buy__dots_3 row">
                                    {
                                        firstActive ? <div className="upgrade-level_available buy_level_dots">
                                            <i className="fas fa-shopping-cart" data-matrix="1" onClick={() => {
                                                abi.buyNewLevel(this.state.account.pk, this.state.account.mainPKr, 1, index + 1, function (hash) {
                                                    if (hash) {
                                                        Toast.loading("正在进行交易打包...", 120)
                                                        abi.startGetTxReceipt(hash, () => {
                                                            Toast.success("success");
                                                            self.fetchInfo();
                                                        })
                                                    }
                                                });
                                            }
                                            }>
                                                <span>Activate</span></i>
                                        </div> : <div className="buy_level_dots buy_level_n-available">
                                            <i className="fas fa-shopping-cart"></i>
                                        </div>
                                    }
                                </div>
                        }

                    </div>
                </div>
            )
        });

        let x6 = this.state.userInfo.x6Matrix.map((level, index) => {
            let referrals = [0, 0, 0, 0, 0, 0];
            let relationships = [0, 0, 0, 0, 0, 0];
            level.firstLevelReferrals.forEach((val, index) => {
                referrals[index] = val;
                relationships[index] = level.firstLevelRelationships[index];
            });
            level.secondLevelReferrals.forEach((val, index) => {
                referrals[index + 2] = val;
                relationships[index + 2] = level.secondLevelRelationships[index];
            });
            var firstActive = false;
            if (this.state.userInfo.id > 0 && (index == 0 || this.state.userInfo.x6Matrix[index - 1].active) && !this.state.userInfo.x6Matrix[index].active) {
                firstActive = true;
            }

            let isExtraDividends = false
            if (!level.active && index > 0) {
                isExtraDividends = this.state.userInfo.x6Matrix[index - 1].isExtraDividends;
            }

            return (
                <div className={level.active ? "buy__item buy__item_selected" : "buy__item"}>
                    <div className="buy__inner">
                        <a className={level.active ? "buy__wrap buy__item_selected " : "buy__wrap"}>
                            <span className="buy__number">{index + 1}</span>
                            <span className="buy__count">{100 * Math.pow(2, index)}</span>
                            {
                                isExtraDividends && <span className="buy__label buy__label_alert">
                                    <i className="icon icon-alert-yellow"
                                       title="Your partner is ahead of you on this site!"></i>
                                </span>
                            }
                        </a>
                        {
                            level.active ? <div className="buy__dots buy__dots_2-2 row">
                                    {
                                        referrals.map((r, index) => {
                                            let classValue = "buy__dot empty__dot";
                                            if (r != 0) {
                                                if (relationships[index] == 0) {
                                                    classValue = "buy__dot sale__dot";
                                                } else if (relationships[index] == 1) {
                                                    classValue = "buy__dot sale-overflow-up__dot";
                                                } else if (relationships[index] == 2) {
                                                    classValue = "buy__dot sale-overflow-down__dot ";
                                                } else if (relationships[index] == 3) {
                                                    classValue = "buy__dot gift__dot";
                                                }
                                            }
                                            return (
                                                <a className={classValue}
                                                   title={"id:" + referrals[index]}></a>
                                            )
                                        })
                                    }
                                    <div className="buy__data">
                                        <div className="buy__data-item">
                                            <div className="buy__data-count">{level.partnersCount}</div>
                                            <div className="buy__data-icon"><i
                                                className="icon icon-partners-blue icon_xs"></i></div>
                                        </div>
                                        <div className="buy__data-item">
                                            <div className="buy__data-count">{level.reinvestCount}</div>
                                            <div className="buy__data-icon"><i
                                                className="icon icon-reinvest icon_xs"></i></div>
                                        </div>
                                    </div>
                                </div> :
                                <div className="buy__dots buy__dots_2-2 row">
                                    {
                                        firstActive ?
                                            <div className="upgrade-level_available buy_level_dots">
                                                <i className="fas fa-shopping-cart" data-matrix="2" onClick={() => {
                                                    abi.buyNewLevel(this.state.account.pk, this.state.account.mainPKr, 2, index + 1, function (hash) {
                                                        if (hash) {
                                                            Toast.loading("正在进行交易打包...", 120)
                                                            abi.startGetTxReceipt(hash, () => {
                                                                Toast.success("success");
                                                                self.fetchInfo();
                                                            })
                                                        }
                                                    });
                                                }
                                                }>
                                                    <span>Activate</span></i>
                                            </div> :
                                            <div className="buy_level_dots buy_level_n-available">
                                                <i className="fas fa-shopping-cart"></i>
                                            </div>
                                    }

                                </div>
                        }
                    </div>
                </div>
            )
        });

        return <div class="main-wrap">

            <header className="header">
                <div className="panel">
                    <div className="case">
                        <div className="panel__wrap row i-mid">

                            <a className="panel__logo logo" href="" style={{paddingTop: '25px'}}>
                                <img src={forsageLogo} alt=""/></a>
                        </div>
                    </div>
                </div>
            </header>
            <main class="main">
                <div class="counts">
                    <div class="case">
                        <div class="counts__list row">
                            <div class="counts__item">
                                <div class="counts__title">参与人数量</div>
                                <div class="counts__text">{this.state.info.participants - 2}</div>
                            </div>
                            <div class="counts__item">
                                <div class="counts__title">24小时内加入数量</div>
                                <div class="counts__text">+{this.state.info.joinedOf24H}</div>
                            </div>
                            <div class="counts__item">
                                <div class="counts__title">参与者总获得</div>
                                <div class="counts__text">{this.showValue(this.state.info.amount, 18)} SERO</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="page">
                    <div class="case">
                        <div class="page__wrap row">
                            <aside class="page__aside aside">
                                <div class="aside__block block">
                                    <div class="block__head">
                                        <div className="eth">
                                            <div className="eth__wrap row">
                                                <div className="eth__list">
                                                    <div
                                                        className="eth__item user-trigger__id">
                                                                <span
                                                                    style={{float: 'left'}} onClick={() => {
                                                                    this.changAccount();
                                                                }}>{this.showName(this.state.account)}</span>
                                                        {
                                                            this.state.userInfo.id == 0 ?
                                                                <span style={{fontSize: '20px'}}
                                                                      onClick={() => {
                                                                          alert('', <div className="eth">
                                                                              <div
                                                                                  className="auth__id input input_border-gray input_radius input_md">
                                                                                  <input className="input__area"
                                                                                         type="text"
                                                                                      // defaultValue="dmw887"
                                                                                         placeholder="请输入推荐码"
                                                                                         ref={el => this.code = el}
                                                                                         onChange={(event) => {
                                                                                             this.code.value = event.target.value;
                                                                                         }}/>
                                                                              </div>
                                                                          </div>, [
                                                                              {
                                                                                  text: '取消',
                                                                                  onPress: () => console.log('cancel')
                                                                              },
                                                                              {
                                                                                  text: '注册', onPress: () => {
                                                                                      abi.registration(this.state.account.pk, this.state.account.mainPKr, this.code.value, function (hash) {
                                                                                          if (hash) {
                                                                                              Toast.loading("正在进行交易打包...", 60)
                                                                                              abi.startGetTxReceipt(hash, () => {
                                                                                                  Toast.success("success");
                                                                                                  self.fetchInfo();
                                                                                              })
                                                                                          }
                                                                                      });
                                                                                  }
                                                                              },
                                                                          ])
                                                                      }}>注册</span> :
                                                                <span> ID<span>{this.state.userInfo.id}</span></span>
                                                        }
                                                    </div>
                                                    <div className="eth__item"><i
                                                        className="icon icon-partners-blue icon_md"></i><var>{this.state.userInfo.partnersCount}</var>
                                                    </div>
                                                    <div className="eth__item color-yellow">
                                                        <nobr>$ {this.showValue(parseInt(this.state.userInfo.x3Income) + parseInt(this.state.userInfo.x6Income), 18)}</nobr>
                                                    </div>
                                                </div>

                                            </div>
                                            <div className="eth__btn-wrap">
                                                <div
                                                    className="eth__btn btn btn_bg-pink btn_md btn_radius btn_fz-lg">
                                                    {/*<a><u><i className="icon icon-alert-white"></i><i*/}
                                                    {/*    className="icon icon-alert-violet"></i></u></a>*/}
                                                    <span>{this.showValue(parseInt(this.state.userInfo.x3Income) + parseInt(this.state.userInfo.x6Income), 18)} SERO</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {
                                        <div className="block__body">
                                            <div className="balance">
                                                <div className="balance__list">
                                                    <div className="balance__item">
                                                        <div className="balance__head">
                                                            <div className="balance__logo">
                                                                <a><img src={x3Logo} alt=""/></a>
                                                            </div>
                                                        </div>
                                                        <div className="balance__body">
                                                            <div
                                                                className="balance__eth">{this.showValue(this.state.userInfo.x3Income, 18)} SERO
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="balance__item">
                                                        <div className="balance__head">
                                                            <div className="balance__logo">
                                                                <a href="/#x4">
                                                                    <img src={x4Logo} alt=""/>
                                                                </a>
                                                            </div>
                                                        </div>
                                                        <div className="balance__body">
                                                            <div
                                                                className="balance__eth">{this.showValue(this.state.userInfo.x6Income, 18)} SERO
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    }
                                </div>
                                {
                                    <div className="aside__block block user-trigger__reflink ">
                                        <div className="block__body">

                                            <div className="block__copy copy cp-wrap">
                                                <div
                                                    className="copy__input input input_border-gray input_md input_color-violet input_radius input_fz-sm input_padding-more">
                                                    <input className="input__area cp-target" type="text"
                                                           value={this.state.userInfo.code}
                                                           readOnly="readonly"/>
                                                </div>
                                                <a className="copy__btn btn btn_bg-violet btn_md btn_radius btn_hover-bg-gray cp-btn"
                                                   href="javascript:;"
                                                   onClick={() => {
                                                       if (copy(this.state.userInfo.code)) {
                                                           Toast.success("复制成功!");
                                                       }
                                                   }}>
                                                    <u><i className="icon icon-copy-white icon_md"></i><i
                                                        className="icon icon-copy-gray icon_md"></i></u>复制
                                                </a>

                                                <div
                                                    className="copy__btn btn btn_bg-violet btn_md btn_radius btn_hover-bg-gray cp-btn"
                                                    style={{marginTop: '20px'}}>
                                                    <span>邀请人:</span>&nbsp;&nbsp;&nbsp;&nbsp;
                                                    <span>{this.state.userInfo.referCode}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                }

                            </aside>
                            <div class="page__section">
                                <div
                                    className={this.state.x3Show ? "page__buy block buy drop-wrap drop-wrap_open" : "page__buy block buy drop-wrap"}>
                                    <div className="block__body buy__body">
                                        <div className="buy__logo"><img src={x3Logo} alt="" id="x3"/>
                                            <div class="auth__drop drop">
                                                <div className="drop__icon">
                                                    <i className="icon icon-chevron-white icon_md" onClick={() => {
                                                        this.setState({x3Show: !this.state.x3Show});
                                                    }}></i>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="buy__list row drop-target"
                                             style={{display: !this.state.x3Show && 'none'}}>
                                            {x3}
                                        </div>
                                    </div>
                                    <div className="block__foot buy__foot drop-target"
                                         style={{display: !this.state.x3Show && 'none'}}>
                                        <div className="buy__desc">
                                            <div className="buy__desc-list row">
                                                <div className="buy__desc-item">
                                                    <div className="buy__desc-icon"><i
                                                        className="icon icon-reinvest icon_xs"></i></div>
                                                    <div className="buy__desc-title">循环次数</div>
                                                </div>
                                                <div className="buy__desc-item">
                                                    <div className="buy__desc-icon"><i
                                                        className="icon icon-partners-blue icon_xs"></i></div>
                                                    <div className="buy__desc-title">平台上的合作伙伴</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className={this.state.x4Show ? "page__buy block buy drop-wrap drop-wrap_open" : "page__buy block buy drop-wrap"}>
                                    <div className="block__body buy__body">
                                        <div className="buy__logo"><img src={x4Logo} alt="" id="x4"/>
                                            <div className="auth__drop drop">
                                                <div className="drop__icon"><i
                                                    className="icon icon-chevron-white icon_md" onClick={() => {
                                                    this.setState({x4Show: !this.state.x4Show})
                                                }}></i>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="buy__list row drop-target"
                                             style={{display: !this.state.x4Show && 'none'}}>
                                            {x6}
                                        </div>
                                    </div>
                                    <div className="block__foot buy__foot drop-target"
                                         style={{display: !this.state.x4Show && 'none'}}>
                                        <div className="buy__designations designations row">
                                            <div className="designations__col">
                                                <div className="designations__item">
                                                    <div className="designations__color designations__color_blue"></div>
                                                    <div className="designations__title">你邀请的伙伴</div>
                                                </div>
                                                <div className="designations__item">
                                                    <div
                                                        className="designations__color designations__color_blue-light"></div>
                                                    <div className="designations__title">从上溢出</div>
                                                </div>
                                            </div>
                                            <div className="designations__col">
                                                <div className="designations__item">
                                                    <div
                                                        className="designations__color designations__color_blue-dark"></div>
                                                    <div className="designations__title">从下面溢出</div>
                                                </div>
                                                <div class="designations__item">
                                                    <div className="designations__color designations__color_pink"></div>
                                                    <div className="designations__title">超过上级的伙伴</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    }
}


export default App;
