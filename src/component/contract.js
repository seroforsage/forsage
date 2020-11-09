import serojs from "serojs";
import seropp from "sero-pp";
import BigNumber from 'bignumber.js'
import {Toast} from "antd-mobile";
import {encode, decode} from "./code";
import {JsonRpc} from "./jsonrpc";

const config = {
    name: "Forsage",
    contractAddress: "2SAF9hcFvW41NnvuGstgUEyzV72dxV1sE1fERwd8x2ratGh1eaXEgALdM2Hatu2DmkCeuo5QHEdVGKqTeuAXiXaB",
    github: "https://github.com/Forsage",
    author: "forsage",
    url: window.location.origin + window.location.pathname,
    logo: window.location.origin + window.location.pathname + '/logo.png'
};


const abiJson = [{"inputs":[{"internalType":"uint8","name":"matrix","type":"uint8"},{"internalType":"uint8","name":"level","type":"uint8"}],"name":"buyNewLevel","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"info","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"registration","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"userInfo","outputs":[{"internalType":"uint256","name":"referId","type":"uint256"},{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"uint256","name":"partnersCount","type":"uint256"},{"internalType":"uint256","name":"x3Income","type":"uint256"},{"internalType":"uint256","name":"x6Income","type":"uint256"},{"components":[{"internalType":"uint256","name":"currentReferrerId","type":"uint256"},{"internalType":"uint256[]","name":"referrals","type":"uint256[]"},{"internalType":"uint8[]","name":"relationships","type":"uint8[]"},{"internalType":"bool","name":"blocked","type":"bool"},{"internalType":"uint256","name":"reinvestCount","type":"uint256"},{"internalType":"uint256","name":"partnersCount","type":"uint256"},{"internalType":"bool","name":"isExtraDividends","type":"bool"},{"internalType":"bool","name":"active","type":"bool"}],"internalType":"struct SeroForsage.X3Info[]","name":"x3Matrix","type":"tuple[]"},{"components":[{"internalType":"uint256","name":"currentReferrerId","type":"uint256"},{"internalType":"uint256[]","name":"firstLevelReferrals","type":"uint256[]"},{"internalType":"uint8[]","name":"firstLevelRelationships","type":"uint8[]"},{"internalType":"uint256[]","name":"secondLevelReferrals","type":"uint256[]"},{"internalType":"uint8[]","name":"secondLevelRelationships","type":"uint8[]"},{"internalType":"bool","name":"blocked","type":"bool"},{"internalType":"uint256","name":"reinvestCount","type":"uint256"},{"internalType":"uint256","name":"partnersCount","type":"uint256"},{"internalType":"bool","name":"isExtraDividends","type":"bool"},{"internalType":"bool","name":"active","type":"bool"}],"internalType":"struct SeroForsage.X6Info[]","name":"x6Matrix","type":"tuple[]"}],"stateMutability":"view","type":"function"}];

const contract = serojs.callContract(abiJson, "2SAF9hcFvW41NnvuGstgUEyzV72dxV1sE1fERwd8x2ratGh1eaXEgALdM2Hatu2DmkCeuo5QHEdVGKqTeuAXiXaBs");

var prices = new Map();
prices.set(1, 100e18);
for (var i = 1; i < 15; i++) {
    prices.set(i + 1, prices.get(i) * 2);
}

const rpc = new JsonRpc();

class Abi {
    constructor() {
        let self = this;
        self.init = new Promise(
            (resolve, reject) => {
                seropp.init(config, function (rest) {
                    if (rest === 'success') {
                        return resolve()
                    } else {
                        return reject(rest)
                    }
                });
            }
        )
    }

    getTransactionReceipt(txHash, callback){
        seropp.getInfo(function (info) {
            rpc.seroRpc(info.rpc, "sero_getTransactionReceipt", [txHash], function (rest) {
                callback(rest)
            });
        });
    }

    startGetTxReceipt(hash, callback) {
        const self = this;
        this.getTransactionReceipt(hash, function (res) {
            if (res && res.result) {
                if (callback) {
                    callback();
                }
            } else {
                setTimeout(function () {
                    self.startGetTxReceipt(hash, callback)
                }, 2000)
            }
        });
    }


    getCurrentAccount(callback) {
        seropp.getAccountList(function (datas) {
            let account;
            for (var i = 0; i < datas.length; i++) {
                if (datas[i].IsCurrent == undefined || datas[i].IsCurrent) {
                    callback({
                        pk: datas[i].PK,
                        mainPKr: datas[i].MainPKr,
                        name: datas[i].Name,
                    });
                    break;
                }
            }
        });
    }

    accountDetails(pk, callback) {
        if (!pk) {
            return;
        }
        let self = this;
        seropp.getAccountDetail(pk, function (item) {
            callback({pk: item.PK, mainPKr: item.MainPKr, name: item.Name})
        });
    }

    accountList(callback) {
        seropp.getAccountList(function (data) {
            let accounts = [];
            data.forEach(function (item, index) {
                accounts.push({
                    pk: item.PK,
                    mainPKr: item.MainPKr,
                    name: item.Name
                })
            });
            callback(accounts)
        });
    }

    callMethod(contract, _method, from, _args, callback) {
        let that = this;
        let packData = contract.packData(_method, _args, true);
        // console.log(contract.packData,"contract.packData");
        let callParams = {
            from: from,
            to: contract.address,
            data: packData
        };

        seropp.call(callParams, function (callData) {
            if (callData !== "0x") {
                let res = contract.unPackDataEx(_method, callData);

                if (callback) {
                    callback(res);
                }
            } else {
                callback("0x0");
            }
        });
    }

    executeMethod(contract, _method, pk, mainPKr, args, tokenName, value, callback) {
        let packData = "0x";
        if ("" !== _method) {
            packData = contract.packData(_method, args, true);
        }

        let executeData = {
            from: pk,
            to: contract.address,
            value: "0x" + value.toString(16),
            data: packData,
            gasPrice: "0x" + new BigNumber("1000000000").toString(16),
            cy: tokenName,
        };
        let estimateParam = {
            from: mainPKr,
            to: contract.address,
            value: "0x" + value.toString(16),
            data: packData,
            gasPrice: "0x" + new BigNumber("1000000000").toString(16),
            cy: tokenName,
        };

        console.log(estimateParam);
        seropp.estimateGas(estimateParam, function (gas, error) {
            if (error) {
                Toast.fail("Failed to execute smart contract", 2)
            } else {
                executeData["gas"] = "0x" + (gas * 2).toString(16);
                seropp.executeContract(executeData, function (res, error) {
                    if (callback) {
                        callback(res, error)
                    }
                })
            }
        });
    }

    info(from, callback) {
        this.callMethod(contract, 'info', from, [], function (ret) {
            console.log(ret);
            callback({participants: ret[0], joinedOf24H: ret[1], amount: ret[2]});
        });
    }

    userInfo(from, callback) {
        this.callMethod(contract, 'userInfo', from, [], function (ret) {
            console.log("userInfo", ret);
            callback({
                id: ret.id,
                code: encode(ret.id),
                referCode: encode(ret.referId),
                partnersCount: ret.partnersCount,
                x3Income: ret.x3Income,
                x6Income: ret.x6Income,
                x3Matrix: ret.x3Matrix,
                x6Matrix: ret.x6Matrix
            });
        });
    }

    registration(pk, mainPKr, code, callback) {
        this.executeMethod(contract, 'registration', pk, mainPKr, [decode(code)], "SERO", prices.get(1) * 2, callback);
    }

    buyNewLevel(pk, mainPKr, matrix, level, callback) {
        this.executeMethod(contract, 'buyNewLevel', pk, mainPKr, [matrix, level], "SERO", prices.get(level), callback);
    }
}

const abi = new Abi();
export default abi;