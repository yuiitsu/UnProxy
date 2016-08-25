/**
 * background script
 */
var UnProxyBack = {

    /**
     * 配置 
     */
    config: {
        cacheKey: {
            'switch': 'switch',
            'siteList': 'siteList',
            'pacScript': 'pacScript',
            'server': 'server'
        }, 
        defaultSiteList: [
            '*amazon\.com*',
            '*facebook\.com*',
            '*facebook\.net*',
            '*twitter\.com*',
            '*twimg\.com*',
            '*github\.com*',
            '*wikipedia\.org*',
            '*gstatic\.com*',
            '*chrome\.com*',
            '*googleapis\.com*',
            '*gmail\.com*',
            '*googleusercontent\.com*',
            '*google\.com*'
        ],
        defaultServer: {
            'host': '112.124.25.173',
            'port': '7071'
        }
    },

    /**
     * 请求方法
     */
    requestFunc: {

        /**
         * 获取数据
         * @param req
         * @param sendRes
         */
        getData: function(req, sendRes) {
            
            var returnData = {
                'status': 0,
                'msg': 'ok'
            };
            // 获取siteList
            var siteList = localStorage.getItem(UnProxyBack.config.cacheKey.siteList);
            if (!siteList) {
                returnData = {
                    'status': 1,
                    'msg': 'siteList error'
                };
            } else {
                // 获取server
                var server = localStorage.getItem(UnProxyBack.config.cacheKey.server);
                if (!server) {
                    returnData = {
                        'status': 1,
                        'msg': 'server error'
                    }
                } else {
                    var serverList = server.split(":");
                    var host = serverList[0];
                    var port = serverList[1];

                    returnData['siteList'] = JSON.parse(siteList);
                    returnData['host'] = host;
                    returnData['port'] = port;
                }
            }
            
            sendRes(returnData);
        },

        /**
         * 保存服务
         * @param req
         * @param sendRes
         */
        saveServer: function(req, sendRes) {
            
            var host = req.data.host;
            var port = req.data.port;
            
            UnProxyBack.createServer(host, port);
            
            // 重新设置代理
            UnProxyBack.getPacScript(true);
            UnProxyBack.checkSwitch();
            
            sendRes({
                'status': 0,
                'msg': '保存成功'
            });
        },
        
        /**
         * 保存站点
         * @param req
         * @param sendRes
         */
        saveSite: function(req, sendRes) {
            var site = req.data.site;
            if (!site) {
                sendRes({
                    'status': 1,
                    'msg': 'error'
                });
            }

            var savedItem = false;
            var siteListCache = UnProxyBack.getSiteList();
            for (var i in siteListCache) {
                if (site == siteListCache) {
                    savedItem = true;
                }
            }
            
            if (savedItem) {
                sendRes({
                    'status': 1,
                    'msg': '站点已经存在'
                });
            } else {
                var siteList = ['*'+ site + '*'];
                for (var i in siteListCache) {
                    siteList.push(siteListCache[i]);
                }
                localStorage.setItem(UnProxyBack.config.cacheKey.siteList, JSON.stringify(siteList));
                // 重新设置代理
                UnProxyBack.getPacScript(true);
                UnProxyBack.checkSwitch();
            }
            
            sendRes({
                'status': 0,
                'msg': '保存成功'
            });
        },
        
        delSite: function(req, sendRes) {
            
            var site = req.data.site;
            var siteListCache = UnProxyBack.getSiteList();
            var siteList = [];
            for (var i in siteListCache) {
                if (site != siteListCache[i]) {
                    siteList.push(siteListCache[i]);
                }
            }
            
            localStorage.setItem(UnProxyBack.config.cacheKey.siteList, JSON.stringify(siteList));
            
            // 重新设置代理
            UnProxyBack.getPacScript(true);
            UnProxyBack.checkSwitch();
            
            sendRes({
                'status': 0,
                'msg': 'ok'
            });
        }
    },

    /**
     * 监听content_script的请求
     */
    messageListener: function() {
        var _this = this;
        chrome.extension.onRequest.addListener(function(request, _, sendResponse){
            
            if ($.isFunction(_this.requestFunc[request.method])) {
                _this.requestFunc[request.method](request, sendResponse);
            } else {
                sendResponse({
                    'returnValue': 1,
                    'returnMsg': '未找到执行方法'
                });
            }
        });
    }, 
    
    proxy: {
        on: function() {
            // 检查缓存中是否有pac script
            var pacScript = localStorage.getItem(UnProxyBack.config.cacheKey.pacScript);
            if (!pacScript) {
                // 没有，使用默认server和site list生成
                pacScript = UnProxyBack.getPacScript();
            }
            
            this.set(pacScript);
        },
        off: function() {
            var pac = "var FindProxyForUrl = function(url, host){return 'DIRECT';}";
            this.set(pac);
        },
        set: function(pac) {
            var config = {
                mode: "pac_script",
                pacScript: {
                    data: pac
                }
            };
            
            chrome.proxy.settings.set({value: config, scope: 'regular'},function() {});
        }
    },

    /**
     * 获取pac script
     */
    getPacScript: function(reCreate) {

        var pacScript = localStorage.getItem(UnProxyBack.config.cacheKey.pacScript);
        if (!pacScript || reCreate) {
            // 没有，使用默认server和site list生成
            pacScript = this.createPacScript();
        } 
        
        return pacScript;
    },

    /**
     * 生成pac script
     */
    createPacScript: function() {
        
        var pacScriptList = ["var FindProxyForURL = function(url,host){if("];
        var server = this.getServer();
        var siteList = this.getSiteList();
        var itemList = [];
        for (var i in siteList) {
            var item = "shExpMatch(url,'"+ siteList[i].replace('.', '\\.') +"')";
            itemList.push(item);
        }
        pacScriptList.push(itemList.join('||'));
        pacScriptList.push("){return 'PROXY "+ server +"';}return 'DIRECT';}");
        var pacScript = pacScriptList.join('');
        // 写入缓存
        localStorage.setItem(this.config.cacheKey.pacScript, pacScript);
        return pacScript;
    },

    /**
     * 获取服务
     */
    getServer: function() {

        var server = localStorage.getItem(this.config.cacheKey.server);
        if (!server) {
            // 没有，使用默认数据生成
            server = this.createServer(null, null);
        }
        
        return server;
    },

    /**
     * 生成server
     * @param host
     * @param port
     */
    createServer: function(host, port) {
        
        host = host ? host : this.config.defaultServer.host;
        port = port ? port : this.config.defaultServer.port;
        var server = host + ':' + port;
        // 写入缓存
        localStorage.setItem(this.config.cacheKey.server, server);
        
        return server;
    },

    /**
     * 获取支持站点列表 
     */
    getSiteList: function() {

        var siteList = localStorage.getItem(UnProxyBack.config.cacheKey.siteList);
        if (!siteList) {
            // 没有，使用默认站点列表生成缓存数据
            localStorage.setItem(this.config.cacheKey.siteList, JSON.stringify(this.config.defaultSiteList));
            return this.config.defaultSiteList;
        }
        
        return JSON.parse(siteList);
    },
    
    /**
     * 检查代理是否开起，如果开启运行代理设置 
     */
    checkSwitch: function() {
        
        var _this = this;
        // 从缓存中获取开头值 
        var switchVal = localStorage.getItem(_this.config.cacheKey.switch);
        if (!switchVal || switchVal == 'true') {
            // 打开状态
            localStorage.setItem(_this.config.cacheKey.switch, 'true');
            _this.proxy.on();
        } else {
            _this.proxy.off();
        }
    },

    /**
     * 初始化
     */
    init: function() {
        // 监听请求
        this.messageListener();
        // 检查代理开头是否开启
        this.checkSwitch();
    }
};

UnProxyBack.init();
