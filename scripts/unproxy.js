
var UnProxy = {
    
    getData: function() {
        
        var _this = this;
        this.sendMessageBack('getData', {}, function(res) {
            console.log(res);
            if (res.status == 0) {
                var siteList = res.siteList;
                var host = res.host;
                var port = res.port;
                // 显示站点列表
                var _html = ['<ul>'];
                for (var i in siteList) {
                    var item = '<li><span class="fl site_list_name">'+ siteList[i] +'</span><span class="fr radius3 site_list_del" data-site="'+ siteList[i] +'">x</span></li>';
                    _html.push(item)
                }
                _html.push('</ul>');
                $('#site_list').html(_html.join(''));
                // 显示host
                $('#host').val(host);
                // 显示port
                $('#port').val(port);
                // 监听删除
                _this.listen.siteDel();
            }
        });
    },
    
    listen: {
        save: function() {
            // 保存server
            $('#save_server').click(function() {
                var host = $.trim($('#host').val());
                var port = $.trim($('#port').val());
                
                if (!host || !port) {
                    alert('host和port都不能为空');
                    return false;
                }
                
                UnProxy.sendMessageBack('saveServer', {
                    'host': host,
                    'port': port
                }, function(res) {
                    alert(res.msg);
                });
            });
            
            // 保存站点
            $('#save_site').click(function() {
                var site = $.trim($('#site').val());
                if (!site) {
                    return false;
                }
                
                UnProxy.sendMessageBack('saveSite', {
                    'site': site
                }, function(res) {
                    if (res.status == 0) {
                        UnProxy.getData();
                    }
                    alert(res.msg);
                });
            });
            
            // 开关
            $('#switch').click(function() {
                if (confirm('确定要关闭代理吗？')) {
                    alert('怎么可能会有这样的功能呢!^^');
                }
            });
        }, 
        
        siteDel: function() {
            $('.site_list_del').unbind('click').click(function() {
                
                if (confirm('确定要删除该记录吗？')) {
                    var self = $(this);
                    var site = $(this).attr('data-site');
                    if (!site) {
                        alert('数据有误，请刷新重试');
                        return false;
                    }
                    
                    UnProxy.sendMessageBack('delSite', {
                        'site': site
                    }, function(res) {
                        if (res.status != 0) {
                            alert(res.msg);
                            return false;
                        }
                        
                        self.parent().fadeOut(function() {
                            $(this).remove();
                        });
                    });
                }
            });
        }
    },

    /**
     * 向background发送消息
     * @param method
     * @param data
     * @param callback
     */
    sendMessageBack: function(method, data, callback) {
        chrome.extension.sendRequest({'method': method, 'data': data}, callback);
    },
    
    init: function() {
        // 请求初始数据
        this.getData();
        // 监听
        this.listen.save();
    }
};

UnProxy.init();
