/* 
 * Premium High-Tech main.js with Tech animations
 * Created by Antigravity for K25pro
 * Developed by: 企业专用K25pro专业网络设备
 */

function ajax(options) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                if (options.done) options.done(xhr.responseText);
            } else {
                if (options.fail) options.fail(xhr.status);
            }
        }
    };
    xhr.open(options.method || 'GET', options.url, true);
    xhr.timeout = options.timeout || 10000;
    xhr.ontimeout = function () {
        if (options.fail) options.fail('timeout');
    };
    xhr.send(options.data || null);
}

function upload(type) {
    var fileInput = document.getElementById('file');
    if (fileInput.files.length == 0) {
        alert('请先选择固件文件！');
        return;
    }

    var file = fileInput.files[0];
    var formData = new FormData();
    formData.append(type, file);

    // 添加 MTD 布局选择参数
    var mtd_layout_list = document.getElementById('mtd_layout_label');
    if (mtd_layout_list && mtd_layout_list.options.length > 0) {
        var mtd_idx = mtd_layout_list.selectedIndex;
        formData.append('mtd_layout', mtd_layout_list.options[mtd_idx].value);
    }

    var bar = document.getElementById('bar');
    var size = document.getElementById('size');
    var md5 = document.getElementById('md5');
    var upgrade = document.getElementById('upgrade');
    var hint = document.getElementById('hint');
    var form = document.getElementById('form');

    bar.style.display = 'block';
    size.style.display = 'none';
    md5.style.display = 'none';
    upgrade.style.display = 'none';
    form.style.display = 'none';
    hint.innerHTML = '正在上传并校验固件，请勿关闭浏览器页面...';

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload', true);

    // 添加上传进度回调，显示百分数
    xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
            var percent = Math.round((e.loaded / e.total) * 100);
            bar.style.setProperty('--percent', percent);
            bar.textContent = percent + '%';  // 显示百分数文字
        }
    };

    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                var resp = xhr.responseText;

                // 检查是否是失败响应
                if (resp == 'fail') {
                    location = '/fail.html';
                    return;
                }

                // 尝试解析 JSON 格式响应
                try {
                    var response = JSON.parse(resp);
                    size.innerHTML = '文件大小: ' + response.size + ' 字节';
                    md5.innerHTML = '校验值(MD5): ' + response.md5;
                    if (response.mtd_layout) {
                        var mtd = document.getElementById('mtd');
                        mtd.innerHTML = '分区布局: ' + response.mtd_layout;
                        mtd.style.display = 'block';
                    }
                } catch (e) {
                    // 如果不是 JSON，尝试解析空格分隔格式 (兼容旧版本)
                    var info = resp.split(' ');
                    size.innerHTML = '文件大小: ' + info[0];
                    md5.innerHTML = '校验值(MD5): ' + info[1];
                    if (info[2]) {
                        var mtd = document.getElementById('mtd');
                        mtd.innerHTML = '分区布局: ' + info[2];
                        mtd.style.display = 'block';
                    }
                }

                size.style.display = 'block';
                md5.style.display = 'block';
                upgrade.style.display = 'block';
                hint.innerHTML = '固件上传成功！请仔细核对以下信息：';

                // Tech animation for success
                upgrade.classList.add('glow-pulse');
            } else {
                alert('上传失败，错误代码: ' + xhr.status);
                location.reload();
            }
        }
    };

    xhr.send(formData);
}

function getversion() {
    ajax({
        url: '/version',
        done: function (res) {
            document.getElementById('version').innerHTML = '控制台内核版本: ' + res + '<br>设备型号: K25pro | 企业专用K25pro专业网络设备';
        }
    });
}

function startup() {
    getversion();

    // 尝试新版本 API
    ajax({
        url: '/mtd_layouts',
        done: function (res) {
            try {
                var layouts = JSON.parse(res);
                if (layouts && layouts.length > 0) {
                    var container = document.getElementById('mtd_layout');
                    var select = document.getElementById('mtd_layout_label');
                    var current = document.getElementById('current_mtd_layout');

                    container.style.display = 'block';
                    select.innerHTML = '';
                    layouts.forEach(function (l) {
                        var opt = document.createElement('option');
                        opt.value = l.label;
                        opt.text = l.label + (l.current ? ' (当前使用)' : '');
                        if (l.current) {
                            opt.selected = true;
                            current.innerHTML = '当前分区布局: <strong>' + l.label + '</strong>';
                        }
                        select.appendChild(opt);
                    });
                }
            } catch (e) {
                // 如果新版本 API 失败，尝试旧版本 API
                tryOldMtdLayoutApi();
            }
        },
        fail: function () {
            // 如果新版本 API 失败，尝试旧版本 API
            tryOldMtdLayoutApi();
        }
    });

    // Add high-tech background animation
    createStars();

    // Add typewriter effect for hint
    var hint = document.getElementById('hint');
    if (hint) {
        var text = hint.innerText;
        hint.innerText = '';
        var i = 0;
        var interval = setInterval(function () {
            if (i < text.length) {
                hint.innerText += text.charAt(i);
                i++;
            } else {
                clearInterval(interval);
            }
        }, 30);
    }
}

function tryOldMtdLayoutApi() {
    ajax({
        url: '/getmtdlayout',
        done: function (mtd_layout_list) {
            if (mtd_layout_list == "error")
                return;

            var mtd_layout = mtd_layout_list.split(';');
            var container = document.getElementById('mtd_layout');
            var current = document.getElementById('current_mtd_layout');
            var select = document.getElementById('mtd_layout_label');

            current.innerHTML = '当前分区布局: <strong>' + mtd_layout[0] + '</strong>';

            for (var i = 1; i < mtd_layout.length; i++) {
                if (mtd_layout[i].length > 0) {
                    select.options.add(new Option(mtd_layout[i], mtd_layout[i]));
                }
            }
            container.style.display = 'block';
        }
    });
}

function createStars() {
    const starCount = 80;
    const body = document.body;
    for (let i = 0; i < starCount; i++) {
        let star = document.createElement('div');
        star.className = 'tech-star';
        star.style.left = Math.random() * 100 + 'vw';
        star.style.top = Math.random() * 100 + 'vh';
        star.style.animationDelay = Math.random() * 8 + 's';
        star.style.width = (Math.random() * 3 + 1) + 'px';
        star.style.height = star.style.width;
        body.appendChild(star);
    }
}
