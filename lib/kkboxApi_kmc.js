
assistant.order( 'kkbox/kkboxApi_kmc', function ( self ) {
    var kmcCategoryInfo = JSON.parse(
        assistant.gasdb( 'kkbox', 'keyVal' ).readRange( [ 3, 2 ] )
    );

    /**
     * KKbox 程式介面 - 音樂排行榜。
     *
     * @memberof module:kkbox.
     * @func kkboxApi_kmc
     * @param {Array} kkboxCollectIdList - 已收集的 KKbox 音樂識別碼。
     * @param {String} kmcCategory - 音樂排行榜曲風分類。
     * @param {Number} offsetDate - 指定日與當日的偏移日數。
     * @throws {Error} Error(121, assistant_fetchHTTPStatusCode)
     * @return {Array} 新增的收集清單。
     */
    function kkboxApi_kmc(
        arrKkboxCollectIdList,
        strKmcCategory, numOffsetDate
    ) {
        var len, idx, val;
        var dataChartDaily, dataSong, dataSong_content;
        var newCollectList = [];

        dataChartDaily = fhrData_chartDaily( strKmcCategory, numOffsetDate );

        for ( idx = 0, len = dataChartDaily.length; idx < len ; idx++ ) {
            val = dataChartDaily[ idx ];

            if ( ~arrKkboxCollectIdList.indexOf( val.id ) ) continue;

            dataSong = fhrKkboxData(
                '音樂文件',
                getSongUrl( val.id, val.type )
            );
            dataSong_content = dataSong.content;
            val.songName   = dataSong_content.song_name;
            val.artistName = dataSong_content.artist_name;
            val.albumName  = dataSong_content.album_name;
            val.auditVoice = dataSong_content.mp3_url;

            val.releaseDateInfo = getDateFormat( val.releaseDate, 'info' );
            val.category = kmcCategoryInfo[ strKmcCategory ][ 1 ];

            newCollectList.push( val );
        }

        return newCollectList;
    }

    function fhrData_chartDaily( strKmcCategory, numOffsetDate ) {
        var fhr, songList;
        var dataChartDaily;

        fhr = fhrKkboxData(
            '排行榜資料',
            getChartDailyUrl( strKmcCategory, numOffsetDate )
        );

        dataChartDaily = fhr.content.data.charts.song.reduce( function ( arrAccumlator, val ) {
            if ( val.is_auth ) {
                arrAccumlator.push( {
                    type:          val.type,
                    id:            val.song_id,
                    releaseDate:   val.release_date * 1000,
                    songName:      val.song_name,
                    songUrl:       val.song_url,
                    artistName:    val.artist_name,
                    artistUrl:     val.artist_url,
                    albumName:     val.album_name,
                    albumImage:    val.cover_image.normal,
                    albumUrl:      val.album_url,
                } );
            }

            return arrAccumlator;
        }, [] );

        return dataChartDaily;
    }

    function fhrKkboxData( strItem, strUrl ) {
        var valTime, fhr, receiveContent;

        valTime = +new Date();

        fhr = new assistant.gasFetch(
            self._service, self._env, strItem, strUrl, null, false, false
        );

        if ( fhr.statusCode !== 200 )
            throw Error(
                log.err( 121, 'assistant_fetchHTTPStatusCode', fhr.statusCode )
            );

        receiveContent = fhr.receive.info.getContentText();
        fhr._dbSheet.updateRange(
            [ fhr._newRow, 23, 1, 2 ],
            [ [ 'JSON', receiveContent ] ]
        );

        fhr.content = JSON.parse( receiveContent );

        fhr.replyState( '成功', +new Date() - valTime );

        return fhr;
    };

    /**
     * 取得圖表每日網址： 取得 KKbox 排行榜資料。
     *
     * @memberof module:kkbox~
     * @func getChartDailyUrl
     * @param {String} kmcCategory - 音樂排行榜曲風分類。
     * @param {Number} offsetDate - 指定日與當日的偏移日數。
     * @return {String}
     */
    function getChartDailyUrl( strKmcCategory, numOffsetDate ) {
        return 'https://kma.kkbox.com/charts/api/v1/daily'
            + '?category=' + kmcCategoryInfo[ strKmcCategory ][ 0 ]
            + '&date=' + getDateOffsetFormat( numOffsetDate, 'date' )
            + '&lang=tc'
            + '&limit=' + kmcCategoryInfo[ strKmcCategory ][ 2 ]
            + '&terr=tw'
            + '&type=song'
        ;
    }

    /**
     * 取得歌曲網址： 取得 KKbox 歌曲資料。
     *
     * @memberof module:kkbox~
     * @func getSongUrl
     * @param {String} songId - 歌曲識別碼。
     * @param {String} songType - 歌曲類型。
     * @return {String}
     */
    function getSongUrl( strSongId, strSongType ) {
        return 'https://www.kkbox.com/tw/tc/ajax/wp_songinfo.php'
            + '?crypt_id=' + strSongId
            + '&type=' + strSongType
        ;
    }

    function getDateOffsetFormat( numOffsetDate, strFormat ) {
        var offsetMS = ( numOffsetDate || 0 ) * 86400000;
        var now = new Date( +new Date() + offsetMS );
        return getDateFormat( +now, strFormat );
    }

    function getDateFormat( numTimeMs, strFormat ) {
        var now = new Date( numTimeMs );

        if ( strFormat === 'timeMS' ) return now.getTime();

        var nowYear = '' + now.getFullYear();
        var nowMonth = now.getMonth() + 1;
        var nowDay = now.getDate();

        nowMonth = ( nowMonth < 10 ? '0' : '' ) + nowMonth;
        nowDay   = ( nowDay   < 10 ? '0' : '' ) + nowDay;

        switch ( strFormat ) {
            case 'info':
                return [ nowYear, nowMonth, nowDay ];
            case 'date':
                return nowYear + '-' + nowMonth + '-' + nowDay;
        }
    }

    self.kkboxApi_kmc = kkboxApi_kmc;
} );

