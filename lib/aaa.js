
/**
 * 科科的盒子
 *
 * @module kkbox
 */

"use strict";

var timestamp = +new Date();
var _config = assistant._config;
var log = assistant.log;

var _service = 'KKbok';
var _env = '正式';
// var _env = '測試';

assistant.order(
    'kkbox', this, [
        'kkbox/_config',
        'kkbox/tgHook',
        'kkbox/tgPush',
        'kkbox/getKmcData',
        'kkbox/musicPollTool',
    ]
);

function doGet( objRequest ){
    var webRecorder;
    var item = '未知';

    webRecorder = new assistant.webRecorder( _service, _env, objRequest );

    webRecorder.replyState(
        item, '成功',
        +new Date() - assistant.timestamp_origin
    );
}

function doPost( objRequest ){
    var webRecorder, queryString;
    var webRecordInfo;

    webRecorder = new assistant.webRecorder( _service, _env, objRequest );
    queryString = objRequest.parameter;

    if ( queryString.comeBack + '_' + queryString.enter === 'tgTrialKKboxBot_kkbox' ) {
        webRecordInfo = tgHook( webRecorder.dbKey, objRequest );
    }

    webRecorder.replyState(
        webRecordInfo.item,
        !webRecordInfo.err ? '成功' : '失敗',
        +new Date() - assistant.timestamp_origin
    );
    if ( !!webRecordInfo.err ) throw webRecordInfo.err;
}

function run_getKmcData() {
    getKmcData.run();
}

