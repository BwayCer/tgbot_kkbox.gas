
assistant.order( 'kkbox/tgbot', function ( self ) {
    log.setMsg( {
        tgbot_notExistTgbot: 'The "%s" of Telegram Bot is not exist.',
    } );

    /**
     * 電報機器人。
     *
     * @memberof module:kkbox.
     * @class tgbot
     * @param {String} item - 項目。
     * @param {String} botName - 機器人名稱。
     * @param {String} method - 電報程式介面方法。
     * @param {String} contentType - 內容類型。
     * @param {String} payload - 有效負載。
     * @param {Boolean} [showRequestContent] - 是否顯示請求內容。
     * @param {Boolean} [showReceiveContent] - 是否顯示接收內容。
     * @throws {Error} Error(21, tgbot_notExistTgbot)
     * @return {module:assistant.gasFetch} 谷歌腳本抓取。
     */
    function tgbot(
        strItem, strBotName, strMethod,
        strContentType, anyPayload,
        bisShowRequestContent, bisShowReceiveContent
    ) {
        var fhr, tgBotToken, tgBotUrl, fetchOpt;
        var configList_tgBotToken = assistant._config.tgBotToken;

        if ( configList_tgBotToken.hasOwnProperty( strBotName ) )
            tgBotToken = configList_tgBotToken[ strBotName ];
        else
            throw Error( log.err( 21, 'tgbot_notExistTgbot', strBotName ) );

        tgBotUrl = 'https://api.telegram.org/' + tgBotToken + '/' + strMethod;
        fetchOpt = {
            method: 'post',
            contentType: strContentType,
            payload: anyPayload,
        };

        fhr = new assistant.gasFetch(
            self._service, self._env, strItem, tgBotUrl, fetchOpt,
            bisShowRequestContent, bisShowReceiveContent
        );

        return fhr;
    }

    self.tgbot = tgbot;
} );

