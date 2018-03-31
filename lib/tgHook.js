
assistant.order( 'kkbox/tgHook', function ( self ) {
    log.setMsg( {
        kkbox_tgHookRequestNotExpected: '電報網絡鉤子請求不符合預期。(dbKey: %s)',
    } );

    var botName = 'trialKKboxBot';

    /***
     * 電報鉤子。
     *
     * @memberof module:kkbox.
     * @func tgHook
     */
    function tgHook( numDbKey, objRequest ) {
        var tgData;
        var postData = objRequest.postData;
        var webRecordInfo = {
            err: null,
            item: '未知',
        };

        if ( !( objRequest.contentLength > 0 )
            && postData.type !== 'application/json'
        ) {
            webRecordInfo.err = Error(
                log.err( 121, 'kkbox_tgHookRequestNotExpected', numDbKey )
            );
        }

        tgData = JSON.parse( postData.contents );

        try {
            if ( tgData.hasOwnProperty( 'callback_query' ) ) {
                tgHook_callbackQuery( webRecordInfo, numDbKey, tgData );
            } else {
                throw Error(
                    log.err( 121, 'kkbox_tgHookRequestNotExpected', numDbKey )
                );
            }
        } catch ( err ) {
            webRecordInfo.err = err;
        }

        return webRecordInfo;
    }

    function tgHook_callbackQuery( objWebRecordInfo, numDbKey, objTgData ) {
        var router = tgHook_callbackQuery.router;
        var msgData = JSON.parse( objTgData.callback_query.data );

        switch ( msgData.func ) {
            case 'musicPoll':
                objWebRecordInfo.item = '音樂民調';
                router[ 'musicPoll' ]( numDbKey, objTgData, msgData );
                break;
            default:
                throw Error(
                    log.err( 121, 'kkbox_tgHookRequestNotExpected', numDbKey )
                );
                break;
        }
    }

    tgHook_callbackQuery.router = {};

    tgHook_callbackQuery.answerCallbackQuery = function (
        objTgData, strText, bisShowAlert, strUrl, numCacheTime
    ) {
        var fhr;
        var valTime = +new Date();
        var payloadData = {
            callback_query_id: objTgData.callback_query.id,
        };

        if ( strText != null )      payloadData.text       = strText;
        if ( bisShowAlert != null ) payloadData.show_alert = bisShowAlert;
        if ( strUrl != null )       payloadData.url        = strUrl;
        if ( numCacheTime != null ) payloadData.cache_time = numCacheTime;

        fhr = assistant.tgbot(
            _service, _env, '回覆回調查詢',
            botName, 'answerCallbackQuery',
            'JSON', payloadData, true
        );

        if ( !fhr.content || !fhr.content.ok ) {
            fhr.replyState( '失敗', +new Date() - valTime );
            throw Error(
                log.err( 121, 'assistant_fetchHTTPStatusCode', fhr.statusCode )
            );
        }

        fhr.replyState( '成功', +new Date() - valTime );
    };

    /***
     * 音樂民調。
     */
    tgHook_callbackQuery.router.musicPoll = function ( numDbKey, objTgData, objMsgData ) {
        var userId, dbKey, dbRow;
        var dbsA;
        var dbSheet_tgRecord;
        var readLine, recordInfo, pollCountInfo;
        var tgMsg;
        var valTime, fhr;
        var tg_callbackQuery = objTgData.callback_query;
        var tgFrom = tg_callbackQuery.from;

        if ( tgFrom.is_bot ) return;

        valTime = +new Date();

        userId  = tgFrom.id;
        dbKey   = objMsgData.dbKey;
        dbRow   = objMsgData.dbRow;

        dbSheet_tgRecord = dbsA = assistant.gasdb( 'kkbox', 'tgRecord' );
        readLine = dbSheet_tgRecord.read( [ dbRow, 1 ] )[ 0 ];

        if ( dbKey > 0 && readLine[ 0 ] !== dbKey ) {
            dbRow = musicPollTool.findKeyRow(
                dbSheet_tgRecord.read( [ 1, dbsA.RowLast() ] ),
                dbKey
            );

            if ( ~dbRow ) {
                objMsgData.dbRow = dbRow;
                readLine = dbSheet_tgRecord.read( [ dbRow, 1 ] )[ 0 ];
            }
        }

        if ( ~dbRow ) {
            recordInfo = JSON.parse( readLine[ 1 ] );

            pollCountInfo = musicPollTool.pollCount(
                userId, objMsgData.ballot,
                recordInfo.poll.like_register,
                recordInfo.poll.hate_register
            );
        } else {
            tgMsg = tg_callbackQuery.message;
            recordInfo = {
                chatId:      tgMsg.chat.id,
                audio_msgId: tgMsg.message_id,
                originText:  tgMsg.caption,
            };
        }

        fhr = assistant.tgbot(
            _service, _env,
            '音樂民調 ' + ( ~dbRow ? '新數據' : '移除投票鈕' ),
            botName, 'editMessageCaption',
            'JSON',
            musicPollTool[ dbRow !== -1 ? 'editMsg' : 'rmPoll' ](
                recordInfo, objMsgData, pollCountInfo
            ),
            true
        );

        if ( !fhr.content || !fhr.content.ok ) {
            fhr.replyState( '失敗', +new Date() - valTime );
            throw Error(
                log.err( 121, 'assistant_fetchHTTPStatusCode', fhr.statusCode )
            );
        }

        if ( ~dbRow ) {
            dbSheet_tgRecord.updateRange( [ dbRow, 2, 1, 3 ], [
                [ JSON.stringify( recordInfo ), pollCountInfo.like, pollCountInfo.hate ]
            ] );
        }

        tgHook_callbackQuery.answerCallbackQuery( objTgData );
        fhr.replyState( '成功', +new Date() - valTime );
    };

    self.tgHook = tgHook;
} );

