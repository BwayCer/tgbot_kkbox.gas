
assistant.order( 'kkbox/getKmcData', function ( self ) {
    /**
     * 取得排行榜資料。
     *
     * @memberof module:kkbox.
     * @func getKmcData
     */
    function getKmcData() {
        var lenA, lenB, lenD;
        var idxA, idxB, idxD;
        var chatId, kkboxIdList, kmcCategoryList;
        var kmcCategory, kmcNewCollectList;
        var chatId, tgResultList, photoId, audioId;
        var kkbokSongInfo, recordInfo;
        var timeStamp;
        var botName = 'trialKKboxBot';

        var dbsB, dbKeyB, dbsC, dbKeyC, dbsD, dbKeyD, dbsD_nowRow;
        var dbSheet_keyVal, dbSheet_relation, dbSheet_collect, dbSheet_tgRecord;
        var newRowC, newRowD;

        dbSheet_keyVal   = dbsA = assistant.gasdb( 'kkbox', 'keyVal' );
        dbSheet_relation = dbsB = assistant.gasdb( 'kkbox', 'relation' );
        dbSheet_collect  = dbsC = assistant.gasdb( 'kkbox', 'collectList' );
        dbSheet_tgRecord = dbsD = assistant.gasdb( 'kkbox', 'tgRecord' );

        chatId = dbSheet_keyVal.readRange( [ 2, 2 ] );
        kkboxIdList = JSON.parse( dbSheet_keyVal.readRange( [ 3, 2 ] ) );
        kmcCategoryList = kkboxApi_kmc.kmcCategoryList;

        for ( idxA = 0, lenA = kmcCategoryList.length; idxA < lenA ; idxA++ ) {
            kmcCategory = kmcCategoryList[ idxA ];

            kmcNewCollectList = kkboxApi_kmc( kkboxIdList, kmcCategory, -1, 2 );

            for ( idxB = 0, lenB = kmcNewCollectList.length; idxB < lenB ; idxB++ ) {
                kkbokSongInfo = kmcNewCollectList[ idxB ];
                timeStamp = assistant.getTimeStamping();

                recordInfo = handleTgBotMsg(
                    botName, chatId, kkbokSongInfo,
                    kkbokSongInfo.albumImage,
                    kkbokSongInfo.auditVoice
                );

                if ( recordInfo.errPhoto || recordInfo.errAudio ) continue;

                kkboxIdList.push( kkbokSongInfo.id );
                dbKeyB  = dbSheet_relation.readRange( [ dbsB.RowLast(), 1 ] ) + 1;
                dbKeyC  =  dbSheet_collect.readRange( [ dbsC.RowLast(), 1 ] ) + 1;
                dbKeyD  = dbSheet_tgRecord.readRange( [ dbsD.RowLast(), 1 ] ) + 1;
                newRowC =  dbSheet_collect.RowNew();
                newRowD = dbSheet_tgRecord.RowNew();

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
                dbSheet_tgRecord.create( dbsD.fill( [
                    dbKeyD,
                    JSON.stringify( tgRecordInfo ),
                ] ) );
            }
        }

        dbSheet_keyVal.updateRange(
            [ 2, 2 ],
            JSON.stringify( kkboxIdList )
        );
    }

    function handleTgBotMsg(
        strBotName, strChatId, objSongData, strPhotoId, strAudioId
    ) {
        var fhr, result;
        var recordInfo = {
            chatId:  strChatId,
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
        fhr = tgBotPushJson(
            'TgBot 傳送聲音 ' + objSongData.id,
            strBotName, 'sendAudio',
            {
                chat_id: strChatId,
                audio:     strAudioId,
                performer: objSongData.artistName,
                title:     objSongData.songName,
                parse_mode: 'Markdown',
                caption: '發行： ' + objSongData.releaseDateInfo.join( '-' ) + '\n'
                       + '曲風： ' + objSongData.category + '\n'
                       + '單曲： [' + objSongData.songName + ']('
                            + objSongData.songUrl +')\n'
                       + '藝人： [' + objSongData.artistName + ']('
                            + objSongData.artistUrl +')\n'
                       + '專輯： [' + objSongData.albumName + ']('
                            + objSongData.albumUrl +')',
            }
        );
        if ( fhr.content.ok ) {
            result = fhr.content.result;
            recordInfo.audio_msgId = result.message_id;
            recordInfo.audio_fileId = result.audio.file_id;
        } else {
            recordInfo.errAudio = fhr.content;
            return recordInfo;
        }

        return recordInfo;
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

