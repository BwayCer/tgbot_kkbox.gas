
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
        'kkbox/kkboxApi_kmc',
        'kkbox/getKmcData',
    ]
);


