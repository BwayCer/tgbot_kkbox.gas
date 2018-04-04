
assistant.order( 'kkbox/tgPush', function ( self ) {
    log.setMsg( {
        kkbox_quarterOfHourTagFailed: '電報標記一刻鐘錨點失敗。',
    } );

    /**
     * 取得排行榜資料。
     *
     * @memberof module:kkbox.
     * @var tgPush
     */
    var tgPush = {
        botName: 'trialKKboxBot',
    };

    tgPush.botPushJson = tgBotPushJson;
    function tgBotPushJson( strItem, strMethod, objPayloadData ) {
        var valTime, fhr;

        valTime = +new Date();

        fhr = assistant.tgbot(
            _service, _env, strItem, tgPush.botName, strMethod,
            'JSON', objPayloadData, true
        );

        if ( !fhr.content || !fhr.content.ok ) {
            fhr.replyState( '失敗', +new Date() - valTime );

            if ( !fhr.content ) {
                throw Error(
                    log.err( 121, 'assistant_fetchHTTPStatusCode', fhr.statusCode )
                );
            }
        } else {
            fhr.replyState( '成功', +new Date() - valTime );
        }

        return fhr;
    }

    /**
     * 推送多個新音頻。
     *
     * @memberof module:kkbox.tgPush.
     * @func pushNewAudio
     * @param {String} chatId - 電報群識別碼。
     * @param {Array} kkboxIdList - 已收錄的 KKbox 識別碼清單。
     * @param {Array} audioInfoList - 音頻資訊清單。
     */
    tgPush.pushNewAudioAll =  function ( strChatId, arrKkboxIdList, arrAudioInfoList ) {
        var dbSheet_keyVal;

        if ( strChatId == null || arrKkboxIdList == null ) {
            dbSheet_keyVal = assistant.gasdb( 'kkbox', 'keyVal' );

            strChatId = strChatId || dbSheet_keyVal.readRange( [ 2, 2 ] );
            arrKkboxIdList
                = arrKkboxIdList
                || JSON.parse( dbSheet_keyVal.readRange( [ 5, 2 ] ) );
        }

        var len, idx;

        for ( idx = 0, len = arrAudioInfoList.length; idx < len ; idx++ )
            tgPush.pushNewAudio( strChatId, arrKkboxIdList, arrAudioInfoList[ idx ] );
    };

    /**
     * 推送新音頻。
     *
     * @memberof module:kkbox.tgPush.
     * @func pushNewAudio
     * @param {String} chatId - 電報群識別碼。
     * @param {Array} kkboxIdList - 已收錄的 KKbox 識別碼清單。
     * @param {Object} audioInfo - 音頻資訊。
     * @param {String} audioInfo.id - 唯一識別碼，判斷是否載過的依據。
     * @param {Array} audioInfo.releaseDateInfo - 發行日期，
     * 如： `[ '1911', '10', '10' ]`。
     * @param {String} audioInfo.category - 曲風、特殊分類。
     * @param {String} audioInfo.songName - 單曲名。
     * @param {String} audioInfo.songUrl - 單曲連結網址。
     * @param {String} audioInfo.artistName - 藝人名。
     * @param {String} audioInfo.artistUrl - 藝人連結網址。
     * @param {String} audioInfo.albumName - 專輯名。
     * @param {String} audioInfo.albumImage - 專輯照片網址。
     * @param {String} audioInfo.albumUrl - 專輯連結網址。
     * @param {String} audioInfo.auditVoice - 30 秒音頻的文件識別碼或網址。
     */
    tgPush.pushNewAudio =  function pushNewAudio(
        strChatId, arrKkboxIdList, objAudioInfo
    ) {
        var timeStamp = assistant.getTimeStamping();

        var recordInfo;

        var dbsB, dbKeyB, dbsC, dbKeyC, dbsD, dbKeyD;
        var dbSheet_keyVal, dbSheet_relation, dbSheet_collect, dbSheet_tgRecord;
        var newRowC, newRowD;

        dbSheet_keyVal   = assistant.gasdb( 'kkbox', 'keyVal' );
        dbSheet_relation = dbsB = assistant.gasdb( 'kkbox', 'relation' );
        dbSheet_collect  = dbsC = assistant.gasdb( 'kkbox', 'collectList' );
        dbSheet_tgRecord = dbsD = assistant.gasdb( 'kkbox', 'tgRecord' );

        // 先佔位
        newRowD = dbsD.RowNew();
        dbKeyD  = dbSheet_tgRecord.readRange( [ newRowD - 1, 1 ] ) + 1;
        dbSheet_tgRecord.create( dbsD.fill( [ dbKeyD ] ) );

        recordInfo = handleTgBotMsg(
            strChatId, objAudioInfo,
            objAudioInfo.albumImage,
            objAudioInfo.auditVoice,
            dbKeyD, newRowD
        );
        musicPollTool.wrapPollInRecordInfo( recordInfo );

        if ( recordInfo.errPhoto || recordInfo.errAudio ) {
            dbSheet_tgRecord.updateRange( [ newRowD, 1 ], '' );
            return;
        }

        if ( objAudioInfo.id !== '---' )
            arrKkboxIdList.push( objAudioInfo.id );
        dbKeyB  = dbSheet_relation.readRange( [ dbsB.RowLast(), 1 ] ) + 1;
        newRowC =  dbSheet_collect.RowNew();
        dbKeyC  =  dbSheet_collect.readRange( [ newRowC - 1, 1 ] ) + 1;

        dbSheet_relation.create( [
            dbKeyB, timeStamp.time, timeStamp.readable, objAudioInfo.id,
            dbsC.getUrlLinkFunc( newRowC, dbKeyC ), dbKeyC,
            dbsD.getUrlLinkFunc( newRowD, dbKeyD ), dbKeyD,
        ] );
        dbSheet_collect.create( [
            dbKeyC, objAudioInfo.releaseDateInfo.join( '-' ),
            objAudioInfo.category,
            objAudioInfo.artistName,
            objAudioInfo.albumName,
            objAudioInfo.songName,
            objAudioInfo.songUrl
        ] );
        dbSheet_tgRecord.updateRange(
            [ newRowD, 2, 1, 3 ],
            [ [ JSON.stringify( recordInfo ), 0, 0 ] ]
        );

        dbSheet_keyVal.updateRange(
            [ 5, 2 ],
            JSON.stringify( arrKkboxIdList )
        );

        if ( dbKeyB % 30 === 0 )
            tagQuarterOfHour( strChatId, ( dbKeyB / 30 ).toFixed() );
    };

    function handleTgBotMsg(
        strChatId, objSongData,
        strPhotoId, strAudioId,
        numDbKey, numDbRow
    ) {
        var fhr, result, mdCaption;
        var recordInfo = {
            chatId:  strChatId,
            originText:   null,
            errPhoto:     null,
            errAudio:     null,
            photo_msgId:  null,
            audio_msgId:  null,
            photo_fileId: null,
            audio_fileId: null,
        };

        // 發送圖片
        fhr = tgBotPushJson(
            'TgBot 傳送圖片 ' + objSongData.id,
            'sendPhoto',
            {
                chat_id: strChatId,
                photo:   strPhotoId,
            }
        );
        if ( fhr.content.ok ) {
            result = fhr.content.result;
            recordInfo.photo_msgId = result.message_id;
            recordInfo.photo_fileId
                = result.photo[ result.photo.length - 1 ][ 'file_id' ];
        } else {
            recordInfo.errPhoto = fhr.content;
            return recordInfo;
        }

        // 發送試聽
        mdCaption = getReadableMdSongMsg( objSongData );
        fhr = tgBotPushJson(
            'TgBot 傳送聲音 ' + objSongData.id,
            'sendAudio',
            {
                chat_id: strChatId,
                audio:     strAudioId,
                performer: objSongData.artistName,
                title:     objSongData.songName,
                parse_mode: 'Markdown',
                caption: mdCaption,
                reply_markup: musicPollTool.newInlineKeyboard( numDbKey, numDbRow ),
            }
        );
        if ( fhr.content.ok ) {
            result = fhr.content.result;
            recordInfo.originText = mdCaption;
            recordInfo.audio_msgId = result.message_id;
            recordInfo.audio_fileId = result.audio.file_id;
        } else {
            recordInfo.errAudio = fhr.content;
            return recordInfo;
        }

        return recordInfo;
    }

    function getReadableMdSongMsg( objSongData ) {
        var ytSearchUrl = 'https://www.youtube.com/results?search_query=';
        var songName   = objSongData.songName;
        var artistName = objSongData.artistName;
        var albumName = objSongData.albumName;

        var mdCaption
            = markDownLinkFilter(
                  '【開啟 YouTube 搜尋】',
                   ytSearchUrl + encodeURI( songName + ' ' + artistName )
              )
            + '\n發行： ' + objSongData.releaseDateInfo.join( '-' )
            + '\n曲風： ' + objSongData.category
            + '\n單曲： ' + markDownLinkFilter( songName, objSongData.songUrl )
            + '\n藝人： ' + markDownLinkFilter( artistName, objSongData.artistUrl )
            + '\n專輯： ' + markDownLinkFilter( albumName, objSongData.albumUrl )
        ;

        return mdCaption;
    }

    function markDownLinkFilter( strTitle, strUrl ) {
        if ( strUrl === '' ) return strTitle;

        return '['
            + strTitle.replace( /\[/g, '⌜' ).replace( /\]/g, '⌟' )
            + ']('
            + strUrl.replace( /\(/g, '%28' ).replace( /\)/g, '%29' )
            + ')'
        ;
    }

    function tagQuarterOfHour( strChatId, strTagCount, runTimes ) {
        var fhr;

        fhr = tgBotPushJson(
            'TgBot 一刻鐘標籤',
            'sendMessage',
            {
                chat_id: strChatId,
                text: '#科科盒子一刻鐘-' + strTagCount,
            }
        );

        if ( !fhr.content.ok ) {
            runTimes = runTimes > 0 ? runTimes++ : 1;

            if ( runTimes < 2 )
                tagQuarterOfHour( strChatId, strTagCount, runTimes );
            else
                throw Error( log.err( 121, 'kkbox_quarterOfHourTagFailed' ) );
        }
    }

    tgPush.answerCallbackQuery = function (
        objTgData, strText, bisShowAlert, strUrl, numCacheTime
    ) {
        var fhr;
        var payloadData = {
            callback_query_id: objTgData.callback_query.id,
        };

        if ( strText != null )      payloadData.text       = strText;
        if ( bisShowAlert != null ) payloadData.show_alert = bisShowAlert;
        if ( strUrl != null )       payloadData.url        = strUrl;
        if ( numCacheTime != null ) payloadData.cache_time = numCacheTime;

        fhr = tgBotPushJson( '回覆回調查詢', 'answerCallbackQuery', payloadData );

        if ( !fhr.content.ok ) {
            throw Error(
                log.err( 121, 'assistant_fetchHTTPStatusCode', fhr.statusCode )
            );
        }
    };

    self.tgPush = tgPush;
} );

