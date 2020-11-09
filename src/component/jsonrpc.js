import axios from 'axios'


class JsonRpc {

    constructor() {
    }

    seroRpc(rpc, _method, _params, callback) {
        let data = {
            id: 0,
            jsonrpc: "2.0",
            method: _method,
            params: _params,
        };
        axios.post(rpc, data).then(function (response) {
            let data = response.data
            if (callback) {
                callback(data);
            }
        }).catch(function (error) {
            console.log("req error: ", error);
        })
    }

    post(url, data, timeout, callback) {
        axios.post(url, data, {timeout: timeout}).then(function (response) {
            let data = response.data
            if (callback) {
                callback(data);
            }
        }).catch(function (error) {
            callback(null, error);
        })
    }

    get(url, cb) {
        axios.get(url).then(function (rest) {
            if (cb) {
                cb(rest.data)
            }
        })
    }
}

export {JsonRpc}
