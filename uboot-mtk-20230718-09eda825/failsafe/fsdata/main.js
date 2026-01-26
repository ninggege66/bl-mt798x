/* 
 * K25PRO Cyber-Terminal Main Logic V3.7 - DEFINITIVE HARMONY
 * Precision Physical Sequence & Active-Low Auto-Marquee
 */

var marqueeInterval = null;
var flashLocked = false;

// Physical sequence restored: PWR(25), NET(24), SIFI(23), SIGNAL2(12), SIGNAL1(13), 5G(10)
// GPIO 11 (4G) is EXCLUDED from sequence and suppressed.
var ledPins = [25, 24, 23, 12, 13, 10];

function ajax(options) {
    if (flashLocked && options.url === '/setled') return; // Silence background traffic during flash
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) { if (options.done) options.done(xhr.responseText); }
            else { if (options.fail) options.fail(xhr.status); }
        }
    };
    xhr.open(options.method || 'GET', options.url, true);
    xhr.send(options.data || null);
}

function showMsg(id, text, isError) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerText = (isError ? "✖ ERROR: " : "✔ SUCCESS: ") + text;
    el.className = "msg " + (isError ? "msg-err" : "msg-ok");
    el.style.display = "block";
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* --- Hardware LED Engine (Active-Low: 0=ON, 1=OFF) --- */
function setPin(pin, state) {
    if (flashLocked && !state._override) return;
    // Map web lit(1) to hardware low(0)
    var hwVal = (state === 1) ? 0 : 1;
    var fd = new FormData();
    fd.append('pin', pin);
    fd.append('state', hwVal);
    ajax({ url: '/setled', method: 'POST', data: fd });
}

function updateVisualLEDs(activePins) {
    ledPins.forEach(p => {
        var el = document.getElementById('led-' + p);
        if (!el) return;
        if (activePins.includes(p)) el.classList.add('active');
        else el.classList.remove('active');
    });
}

function setMarquee(mode) {
    if (flashLocked) return;
    if (marqueeInterval) clearInterval(marqueeInterval);
    var speed = parseInt(document.getElementById('led_speed').value) || 600;
    var step = 0;

    // Phase 0: Reset core pins to OFF (HW 1)
    ledPins.forEach(p => setPin(p, 0));

    if (mode === 'stop') {
        updateVisualLEDs([]);
        return;
    }

    if (mode === 'allon') {
        ledPins.forEach(p => setPin(p, 1));
        updateVisualLEDs(ledPins);
        return;
    }

    marqueeInterval = setInterval(() => {
        var active = [];
        if (mode === 'loop' || mode === 'down') {
            active = [ledPins[step % ledPins.length]];
        } else if (mode === 'up') {
            active = [ledPins[(ledPins.length - 1 - step) % ledPins.length]];
        } else if (mode === 'blink') {
            active = (step % 2 === 0) ? ledPins : [];
        }

        ledPins.forEach(p => setPin(p, active.includes(p) ? 1 : 0));
        updateVisualLEDs(active);
        step++;
    }, speed);
}

/* --- Navigation --- */
function navTo(id, el) {
    document.getElementById('sec-' + id).scrollIntoView({ behavior: 'smooth' });
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
}

/* --- Binary Engine --- */
function upload(type, inputId, msgId, confirmId) {
    if (flashLocked) return;
    if (marqueeInterval) setMarquee('stop');

    var fileInput = document.getElementById(inputId);
    if (!fileInput || fileInput.files.length == 0) { showMsg(msgId, 'NO BINARY detected', true); return; }

    var formData = new FormData();
    formData.append(type, fileInput.files[0]);
    var bContainer = document.getElementById('up-container');
    var bBar = document.getElementById('up-bar');
    var bPct = document.getElementById('up-pct');

    if (bContainer) bContainer.style.display = 'block';

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload', true);
    xhr.upload.onprogress = e => {
        if (e.lengthComputable && bBar && bPct) {
            var p = Math.round((e.loaded / e.total) * 100);
            bBar.style.setProperty('--percent', p);
            bPct.innerText = p + "%";
        }
    };

    xhr.onreadystatechange = () => {
        if (xhr.readyState == 4) {
            if (xhr.status == 200 && xhr.responseText != 'fail') {
                var info = xhr.responseText.split(' ');
                var cPanel = document.getElementById(confirmId);
                if (cPanel) {
                    cPanel.style.display = 'block';
                    var sEl = cPanel.querySelector('[id$="-size"]');
                    var mEl = cPanel.querySelector('[id$="-md5"]');
                    if (sEl) sEl.innerText = "STREAM SIZE: " + info[0] + " Bytes";
                    if (mEl) mEl.innerText = "BLOCK MD5: " + info[1];
                }
                showMsg(msgId, 'BINARY VALIDATED. SYSTEM READY.', false);
            } else { showMsg(msgId, 'CHANNEL TIMEOUT', true); }
        }
    };
    xhr.send(formData);
}

function flashInline(msgId) {
    // Phase 1: STOP background noise
    if (marqueeInterval) clearInterval(marqueeInterval);

    // Authorization: Turn all LEDs ON for physical feedback
    var overrideOn = { valueOf: () => 1, _override: true };
    ledPins.forEach(p => setPin(p, overrideOn));
    updateVisualLEDs(ledPins);

    // CRITICAL: Block all future setled traffic
    flashLocked = true;

    document.querySelectorAll('input').forEach(i => i.disabled = true);
    showMsg(msgId, 'AUTHORIZING NAND WRITE... DO NOT POWER OFF.', false);

    // Trigger /doflash (Backend handles cleanup and commit)
    ajax({
        url: '/doflash',
        method: 'POST',
        done: res => {
            if (res === 'commit_accepted') {
                showMsg(msgId, 'OK. NAND WRITE STARTED. AUTO-REBOOT IN ~90 SECONDS.', false);
            } else {
                showMsg(msgId, 'NAND WRITE REJECTED: HW LOCK', true);
                flashLocked = false;
                document.querySelectorAll('input').forEach(i => i.disabled = false);
            }
        },
        fail: () => {
            showMsg(msgId, 'WAIT FOR REBOOT: SYSTEM DISCONNECTED (OVERWRITING...).', false);
        }
    });
}

/* --- MAC Core --- */
function generateMAC(id) {
    if (flashLocked) return;
    var hex = "0123456789ABCDEF";
    var mac = "";
    for (var i = 0; i < 6; i++) {
        var part = hex.charAt(Math.floor(Math.random() * 16)) + hex.charAt(Math.floor(Math.random() * 16));
        if (i == 0) {
            var firstByte = (parseInt(part, 16) & 0xFE) | 0x02;
            part = firstByte.toString(16).toUpperCase().padStart(2, '0');
        }
        mac += part + (i < 5 ? ":" : "");
    }
    document.getElementById(id).value = mac;
}

function setDefaultMACs() {
    if (flashLocked) return;
    document.getElementById('wan_mac').value = "62:88:9F:78:7D:A4";
    document.getElementById('lan1_mac').value = "62:88:9F:78:7D:A5";
    document.getElementById('lan2_mac').value = "62:88:9F:78:7D:A6";
}

function saveMACs() {
    if (flashLocked) return;
    var w = document.getElementById('wan_mac').value.trim();
    var l1 = document.getElementById('lan1_mac').value.trim();
    var l2 = document.getElementById('lan2_mac').value.trim();
    if (!/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(w)) { showMsg('mac-msg', 'INVALID WAN FORMAT', true); return; }

    var fd = new FormData();
    fd.append('wan_mac', w); fd.append('lan1_mac', l1); fd.append('lan2_mac', l2);
    ajax({
        url: '/setmac', method: 'POST', data: fd,
        done: res => {
            if (res === 'success') showMsg('mac-msg', 'NVRAM PERSISTENCE SAVED', false);
            else showMsg('mac-msg', 'HARDWARE BUS ERROR', true);
        }
    });
}

function saveAndReboot() {
    if (flashLocked) return;
    saveMACs();
    setTimeout(() => { ajax({ url: '/reboot', method: 'POST' }); }, 1500);
}

/* --- System Bootstrap --- */
function startup() {
    var c = document.getElementById('particles');
    for (var i = 0; i < 45; i++) {
        var p = document.createElement('div'); p.className = 'particle';
        p.style.width = p.style.height = (Math.random() * 4 + 2) + 'px';
        p.style.left = Math.random() * 100 + 'vw'; p.style.top = Math.random() * 100 + 'vh';
        c.appendChild(p);
    }

    // EXPLICIT 4G DISABLE: GPIO 11 Active-Low -> HW 1
    var fd = new FormData(); fd.append('pin', 11); fd.append('state', 1);
    ajax({ url: '/setled', method: 'POST', data: fd });

    // Core Init: Sequence LEDs dark (Active-Low 1)
    ledPins.forEach(p => {
        var fd2 = new FormData(); fd2.append('pin', p); fd2.append('state', 1);
        ajax({ url: '/setled', method: 'POST', data: fd2 });
    });

    // AUTO-BOOT MARQUEE (0.6s / 600ms)
    document.getElementById('led_speed').value = 600;
    setTimeout(() => { setMarquee('loop'); }, 1000);

    // Scroll Management
    document.getElementById('content').addEventListener('scroll', function () {
        var t = ['sys', 'led', 'fw', 'mac', 'adv'];
        var side = document.querySelectorAll('#sidebar .nav-item');
        t.forEach((id, idx) => {
            var el = document.getElementById('sec-' + id); if (!el) return;
            var r = el.getBoundingClientRect();
            if (r.top >= 0 && r.top <= 400) {
                side.forEach(s => s.classList.remove('active'));
                if (side[idx]) side[idx].classList.add('active');
            }
        });
    });

    ajax({
        url: '/getmac',
        done: res => {
            var m = res.split(';');
            if (m[0]) document.getElementById('wan_mac').value = m[0];
            if (m[1]) document.getElementById('lan1_mac').value = m[1];
            if (m[2]) document.getElementById('lan2_mac').value = m[2];
        }
    });

    ajax({
        url: '/getmtdlayout',
        done: res => {
            if (res == "error") return;
            var list = res.split(';');
            var select = document.getElementById('mtd_layout_label');
            for (var i = 1; i < list.length; i++) if (list[i]) select.options.add(new Option(list[i], list[i]));
            document.getElementById('mtd_layout').style.display = 'block';
        }
    });
}
