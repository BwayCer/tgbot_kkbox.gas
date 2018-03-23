
/**
 * 科科的盒子
 *
 * @module kkbox
 */

"use strict";

var timestamp = +new Date();
var log = assistant.log;

var _service = 'KKbok';
var _env = '正式';

assistant.order(
    'kkbox', this, [
        'kkbox/_config',
        'kkbox/tgbot',
    ]
);


