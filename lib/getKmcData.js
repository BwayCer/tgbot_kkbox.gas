
assistant.order( 'kkbox/getKmcData', function ( self ) {
    log.setMsg( {
        kkbox_quarterOfHourTagFailed: '電報標記一刻鐘錨點失敗。',
    } );

    /**
     * 取得排行榜資料。
     *
     * @memberof module:kkbox.
     * @func getKmcData
     */
    function getKmcData() {
        var lenA, lenB, lenD;
        var idxA, idxB, idxD;
        var chatId, kkboxIdList, weekUpdateList, todayKmcTargetList;
        var kmcCategory, kmcNewCollectList;
        var chatId, tgResultList, photoId, audioId;
        var kkbokSongInfo, recordInfo;
        var timeStamp;
        var botName = 'trialKKboxBot';
        var numOffsetDate = -1;

        var dbsB, dbKeyB, dbsC, dbKeyC, dbsD, dbKeyD;
        var dbSheet_keyVal, dbSheet_relation, dbSheet_collect, dbSheet_tgRecord;
        var newRowC, newRowD;

        dbSheet_keyVal   = dbsA = assistant.gasdb( 'kkbox', 'keyVal' );
        dbSheet_relation = dbsB = assistant.gasdb( 'kkbox', 'relation' );
        dbSheet_collect  = dbsC = assistant.gasdb( 'kkbox', 'collectList' );
        dbSheet_tgRecord = dbsD = assistant.gasdb( 'kkbox', 'tgRecord' );

        chatId = dbSheet_keyVal.readRange( [ 2, 2 ] );
        weekUpdateList = JSON.parse( dbSheet_keyVal.readRange( [ 4, 2 ] ) );
        kkboxIdList = JSON.parse( dbSheet_keyVal.readRange( [ 5, 2 ] ) );

        todayKmcTargetList = weekUpdateList[
            ( new Date( +new Date() + ( ( numOffsetDate || 0 ) * 86400000 ) ) ).getDay()
        ];

        for ( idxA = 0, lenA = todayKmcTargetList.length; idxA < lenA ; idxA++ ) {
            kmcCategory = todayKmcTargetList[ idxA ];

            kmcNewCollectList = kkboxApi_kmc( kkboxIdList, kmcCategory, numOffsetDate );

            for ( idxB = 0, lenB = kmcNewCollectList.length; idxB < lenB ; idxB++ ) {
                kkbokSongInfo = kmcNewCollectList[ idxB ];
                timeStamp = assistant.getTimeStamping();

                // 先佔位
                newRowD = dbsD.RowNew();
                dbKeyD  = dbSheet_tgRecord.readRange( [ newRowD - 1, 1 ] ) + 1;
                dbSheet_tgRecord.create( dbsD.fill( [ dbKeyD ] ) );

                recordInfo = handleTgBotMsg(
                    botName, chatId, kkbokSongInfo,
                    kkbokSongInfo.albumImage,
                    kkbokSongInfo.auditVoice,
                    dbKeyD, newRowD
                );
                musicPollTool.wrapPollInRecordInfo( recordInfo );

                if ( recordInfo.errPhoto || recordInfo.errAudio ) {
                    dbSheet_tgRecord.updateRange( [ newRowD, 1 ], '' );
                    continue;
                }

                kkboxIdList.push( kkbokSongInfo.id );
                dbKeyB  = dbSheet_relation.readRange( [ dbsB.RowLast(), 1 ] ) + 1;
                dbKeyC  =  dbSheet_collect.readRange( [ dbsC.RowLast(), 1 ] ) + 1;
                newRowC =  dbSheet_collect.RowNew();

                dbSheet_relation.create( [
                    dbKeyB, timeStamp.time, timeStamp.readable, kkbokSongInfo.id,
                    dbsC.getUrlLinkFunc( newRowC, dbKeyC ), dbKeyC,
                    dbsD.getUrlLinkFunc( newRowD, dbKeyD ), dbKeyD,
                ] );
                dbSheet_collect.create( [
                    dbKeyC, kkbokSongInfo.releaseDateInfo.join( '-' ),
                    kkbokSongInfo.category,
                    kkbokSongInfo.artistName,
                    kkbokSongInfo.albumName,
                    kkbokSongInfo.songName,
                    kkbokSongInfo.songUrl
                ] );
                dbSheet_tgRecord.updateRange(
                    [ newRowD, 2, 1, 3 ],
                    [ [ JSON.stringify( recordInfo ), 0, 0 ] ]
                );

                dbSheet_keyVal.updateRange(
                    [ 5, 2 ],
                    JSON.stringify( kkboxIdList )
                );

                if ( dbKeyB % 30 === 0 )
                    tagQuarterOfHour(
                        botName, chatId,
                        ( dbKeyB / 30 ).toFixed()
                    );
            }
        }
    }

    function tagQuarterOfHour( strBotName, strChatId, strTagCount, runTimes ) {
        var fhr;

        fhr = tgBotPushJson(
            'TgBot 一刻鐘標籤',
            strBotName, 'sendMessage',
            {
                chat_id: strChatId,
                text: '#科科盒子一刻鐘-' + strTagCount,
            }
        );

        if ( !fhr.content.ok ) {
            runTimes = runTimes > 0 ? runTimes++ : 1;

            if ( runTimes < 2 )
                tagQuarterOfHour( strBotName, strChatId, strTagCount, runTimes );
            else
                throw Error( log.err( 121, 'kkbox_quarterOfHourTagFailed' ) );
        }
    }

    function handleTgBotMsg(
        strBotName, strChatId, objSongData, strPhotoId, strAudioId, numDbKey, numDbRow
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
            strBotName, 'sendPhoto',
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
            strBotName, 'sendAudio',
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

    function markDownLinkFilter( strTitle, strUrl ) {
        return '['
            + strTitle.replace( /\[/g, '⌜' ).replace( /\]/g, '⌟' )
            + ']('
            + strUrl.replace( /\(/g, '%28' ).replace( /\)/g, '%29' )
            + ')'
        ;
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

    function tgBotPushJson( strItem, strBotName, strMethod, objPayloadData ) {
        var valTime, fhr;

        valTime = +new Date();

        fhr = assistant.tgbot(
            _service, _env, strItem, strBotName, strMethod,
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
    };

    self.getKmcData = getKmcData;
} );

