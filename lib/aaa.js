
/**
 * 科科的盒子
 *
 * @module kkbox
 */

"use strict";

var timestamp = +new Date();

assistant.order(
    'kkbox', this, [
        'kkbox/preRun',
        'kkbox/_config',
        'kkbox/tgbot',
    ]
);

assistant.order( 'kkbox/preRun', function ( self ) {
    self.log = assistant.log;
} );

