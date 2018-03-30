
assistant.order( 'kkbox/musicPollTool', function ( self ) {
    /**
     * 音樂民調工具。
     *
     * @var {Object} musicPollTool
     * @param {Function} musicPollTool.wrapPollInRecordInfo - 包裝民調所需資訊。
     * @param {Function} musicPollTool.pollCount - 民調計數。
     * @param {Function} musicPollTool.findKeyRow - 搜尋指定 `key` 的橫列。
     * @param {Function} musicPollTool.newInlineKeyboard - 新的內嵌鍵盤。
     * @param {Function} musicPollTool.editMsg - 編輯訊息。
     * @param {Function} musicPollTool.rmPoll - 刪除民調。
     */
    var musicPollTool = {};

    musicPollTool.wrapPollInRecordInfo = function ( objRecordInfo ) {
        objRecordInfo.poll = {
            like_register: [],
            hate_register: [],
        };
    };

    musicPollTool.pollCount = function (
        numUserId, strBallot, arrLikeRegister, arrHateRegister
    ) {
        var idxHadVote, checkList, registerList;
        var likeCount, hateCount;

        switch ( strBallot ) {
            case 'like':
                checkList    = arrHateRegister;
                registerList = arrLikeRegister;
                break;
            case 'hate':
                checkList    = arrLikeRegister;
                registerList = arrHateRegister;
                break;
            default:
                throw Error(
                    log.err( 121, 'kkbox_tgHookRequestNotExpected', numDbKey )
                );
                break;
        }

        idxHadVote = checkList.indexOf( numUserId );
        if ( ~idxHadVote ) checkList.splice( idxHadVote, 1 );
        registerList.push( numUserId );

        likeCount = arrLikeRegister.length;
        hateCount = arrHateRegister.length;

        return {
            like: likeCount,
            likeFormat: showCountString( likeCount ),
            hate: hateCount,
            hateFormat: showCountString( hateCount ),
        };
    };

    function showCountString( numCount ) {
        var strCount = numCount.toString();
        var unit = '';

        if ( numCount > 199998 ) {
            unit = ' 萬';
            strCount = strCount.substring( 0, strCount.length - 4 );
        }

        strCount = strCount.replace( /\B(?=(\d{3})+(?!\d))/, ',' );

        return strCount + unit;
    }

    musicPollTool.findKeyRow = function ( arrTable, numDbKey ) {
        var len, idx;
        var bisFind = false;

        for ( idx = 0, len = arrTable.length; idx < len ; idx++ ) {
            if ( arrTable[ idx ][ 0 ] === numDbKey ) {
                bisFind = true;
                break;
            }
        }

        return bisFind ? idx : -1;
    };

    musicPollTool.newInlineKeyboard = function ( numDbKey, numDbRow ) {
        var msgData = {
            func: 'musicPoll',
            dbKey: numDbKey,
            dbRow: numDbRow,
            ballot: '',
        };

        return {
            inline_keyboard: [
                [
                    {
                        text: '\ud83d\udc4d',
                        callback_data: JSON.stringify( (
                            msgData.ballot = 'like', msgData
                        ) ),
                    },
                    {
                        text: '\ud83d\udc4e',
                        callback_data: JSON.stringify( (
                            msgData.ballot = 'hate', msgData
                        ) ),
                    },
                ],
            ],
        };
    };

    musicPollTool.editMsg = function ( objRecordInfo, objMsgData, objPollCountInfo ) {
        return {
            chat_id:    objRecordInfo.chatId,
            message_id: objRecordInfo.audio_msgId,
            caption:    objRecordInfo.originText,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '\ud83d\udc4d ' +  objPollCountInfo.like,
                            callback_data: JSON.stringify( (
                                objMsgData.ballot = 'like', objMsgData
                            ) ),
                        },
                        {
                            text: '\ud83d\udc4e ' +  objPollCountInfo.hate,
                            callback_data: JSON.stringify( (
                                objMsgData.ballot = 'hate', objMsgData
                            ) ),
                        },
                    ],
                ],
            },
        };
    };

    musicPollTool.rmPoll = function ( objRecordInfo, objMsgData ) {
        return {
            chat_id:    objRecordInfo.chatId,
            message_id: objRecordInfo.audio_msgId,
            caption:    objRecordInfo.originText,
            parse_mode: 'Markdown',
        };
    };

    self.musicPollTool = musicPollTool;
} );

