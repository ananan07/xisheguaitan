(function(){
  var EVIDENCE_IDS = ['ev_victim_list', 'ev_register_form', 'ev_messages', 'ev_guestbook', 'ev_police_info'];
  var EVIDENCE_NAMES = {
    'ev_victim_list': '重点关注人员名单',
    'ev_register_form': '游客入住登记表原件',
    'ev_messages': '内部消息记录',
    'ev_guestbook': '归隐民宿留言记录',
    'ev_police_info': '警方举报渠道信息'
  };
  var COUNTDOWN_HOURS = 48;

  function getCollected() {
    try { return JSON.parse(localStorage.getItem('xsg_evidence') || '[]'); }
    catch(e) { return []; }
  }
  function saveCollected(arr) { localStorage.setItem('xsg_evidence', JSON.stringify(arr)); }

  function getDeadline() {
    var v = localStorage.getItem('xsg_deadline');
    return v ? parseInt(v) : 0;
  }
  function setDeadline(ts) { localStorage.setItem('xsg_deadline', ts); }

  function isExpired() { return getDeadline() > 0 && Date.now() >= getDeadline(); }

  function formatCountdown(remaining) {
    if (remaining <= 0) return '00:00:00';
    var h = Math.floor(remaining / 3600000);
    var m = Math.floor((remaining % 3600000) / 60000);
    var s = Math.floor((remaining % 60000) / 1000);
    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }

  window.collectEvidence = function(id) {
    var collected = getCollected();
    if (collected.indexOf(id) === -1) {
      collected.push(id);
      saveCollected(collected);
      if (id === 'ev_victim_list' && !getDeadline()) {
        setDeadline(Date.now() + COUNTDOWN_HOURS * 3600000);
      }
    }
    updatePanel();
  };

  var panel = document.createElement('div');
  panel.id = 'evidence-panel';
  panel.style.display = 'none';
  panel.innerHTML = '<div class="ep-bar" id="ep-bar">'
    + '<span class="ep-icon">📋</span>'
    + '<span class="ep-label">已收集证据</span>'
    + '<span class="ep-timer" id="ep-timer"></span>'
    + '<span class="ep-arrow">▲</span>'
    + '</div>'
    + '<div class="ep-list" id="ep-list" style="display:none;"></div>'
    + '<div class="ep-report" id="ep-report" style="display:none;"></div>'
    + '<div class="ep-reset" id="ep-reset" style="display:none;"><button id="btn-reset">🔄 重置进度</button></div>';
  document.body.appendChild(panel);

  var style = document.createElement('style');
  style.textContent = ''
    + '#evidence-panel { position:fixed; bottom:16px; left:16px; z-index:9999; font-family:"Microsoft YaHei","SimSun",sans-serif; }'
    + '#evidence-panel .ep-bar { background:#2c2c2c; color:#ddd; padding:8px 14px; display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none; border-radius:8px; border:1px solid #444; }'
    + '#evidence-panel .ep-bar:hover { background:#333; }'
    + '#evidence-panel .ep-icon { font-size:18px; }'
    + '#evidence-panel .ep-label { font-size:13px; font-weight:bold; }'
    + '#evidence-panel .ep-timer { font-size:12px; color:#ff6666; font-family:monospace; background:#331111; padding:1px 6px; border-radius:4px; }'
    + '#evidence-panel .ep-timer.warn { animation:epBlink 0.8s infinite; }'
    + '#evidence-panel .ep-timer.dead { color:#888; background:#222; }'
    + '#evidence-panel .ep-arrow { font-size:10px; transition:transform 0.3s; }'
    + '#evidence-panel.open .ep-arrow { transform:rotate(180deg); }'
    + '#evidence-panel .ep-list { background:#1c1c1c; padding:10px 14px; border-radius:6px; margin-top:4px; border:1px solid #333; }'
    + '#evidence-panel .ep-list .ep-item { padding:6px 0; color:#8f8; font-size:12px; }'
    + '#evidence-panel .ep-list .ep-item::before { content:"✓"; color:#4a4; font-weight:bold; margin-right:8px; }'
    + '#evidence-panel .ep-report { padding:12px 20px 4px; background:#1c1c1c; text-align:center; }'
    + '#evidence-panel .ep-report button { padding:8px 28px; background:#8b1a1a; color:#fff; border:none; font-size:14px; font-weight:bold; cursor:pointer; border-radius:4px; letter-spacing:2px; }'
    + '#evidence-panel .ep-reset { padding:4px 0 10px; background:#1c1c1c; text-align:center; border-radius:0 0 6px 6px; border-top:1px solid #222; }'
    + '#evidence-panel .ep-reset button { background:transparent; border:1px solid #444; color:#666; font-size:10px; padding:3px 10px; cursor:pointer; border-radius:3px; }'
    + '#evidence-panel .ep-reset button:hover { color:#aaa; border-color:#888; }'
    + '#evidence-panel .ep-toast { position:fixed; bottom:60px; left:50%; transform:translateX(-50%); background:#2a7a2a; color:#fff; padding:8px 20px; border-radius:20px; font-size:13px; z-index:9999; animation:epFade 2s ease forwards; }'
    + '@keyframes epFade { 0%{opacity:0;transform:translateX(-50%) translateY(10px);} 20%{opacity:1;transform:translateX(-50%) translateY(0);} 80%{opacity:1;} 100%{opacity:0;} }'
    + '@keyframes epBlink { 0%,100%{opacity:1;} 50%{opacity:0.4;} }';
  document.head.appendChild(style);

  document.getElementById('btn-reset').addEventListener('click', function(){
    if (confirm('重置所有进度？')) { localStorage.clear(); location.reload(); }
  });

  document.getElementById('ep-bar').addEventListener('click', function(){
    panel.classList.toggle('open');
    var list = document.getElementById('ep-list');
    var reset = document.getElementById('ep-reset');
    list.style.display = panel.classList.contains('open') ? 'block' : 'none';
    reset.style.display = panel.classList.contains('open') ? 'block' : 'none';
    document.getElementById('ep-report').style.display = panel.classList.contains('open') ? 'block' : 'none';
  });

  var timerInterval;
  function updatePanel() {
    var collected = getCollected();
    var count = collected.length;
    var total = EVIDENCE_IDS.length;

    if (count === 0) { panel.style.display = 'none'; return; }
    panel.style.display = 'block';

    var listHtml = '';
    for (var i = 0; i < collected.length; i++) {
      var name = EVIDENCE_NAMES[collected[i]] || collected[i];
      listHtml += '<div class="ep-item">' + name + '</div>';
    }

    var deadline = getDeadline();
    var timerEl = document.getElementById('ep-timer');
    if (deadline) {
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(function(){
        var rem = getDeadline() - Date.now();
        if (rem <= 0) {
          document.getElementById('ep-timer').textContent = '⏰ 已超时';
          document.getElementById('ep-timer').className = 'ep-timer dead';
          clearInterval(timerInterval);
          localStorage.setItem('xsg_expired', '1');
          // 如果当前在证据面板展开状态，更新按钮
          updateReportButton();
        } else if (rem < 3600000) {
          document.getElementById('ep-timer').textContent = '⏰ ' + formatCountdown(rem);
          document.getElementById('ep-timer').className = 'ep-timer warn';
        } else {
          document.getElementById('ep-timer').textContent = '⏰ ' + formatCountdown(rem);
          document.getElementById('ep-timer').className = 'ep-timer';
        }
      }, 1000);
    }

    document.getElementById('ep-list').innerHTML = listHtml;

    updateReportButton();
  }

  function updateReportButton() {
    var count = getCollected().length;
    var total = EVIDENCE_IDS.length;
    var expired = isExpired();
    var allDone = count === total;
    var btnHtml = '';
    if (expired) {
      btnHtml = '<button id="btn-report-dead" style="background:#333;color:#888;">📤 提交举报（已超时）</button>';
    } else if (allDone) {
      btnHtml = '<button id="btn-report-full">📤 提交举报（证据完整）</button>';
    } else {
      btnHtml = '<button id="btn-report-bad">📤 提交举报（证据不足）</button>';
    }
    document.getElementById('ep-report').innerHTML = btnHtml;
    document.getElementById('ep-report').style.display = panel.classList.contains('open') ? 'block' : 'none';

    // 绑定事件
    var btnBad = document.getElementById('btn-report-bad');
    var btnFull = document.getElementById('btn-report-full');
    var btnDead = document.getElementById('btn-report-dead');
    if (btnBad) {
      btnBad.onclick = function(){
        if (confirm('我感觉证据还不全……\n你确定要现在提交举报吗？')) {
          window.location.href = 'report-bad.html';
        }
      };
    }
    if (btnFull) { btnFull.onclick = function(){ window.location.href = 'report.html'; }; }
    if (btnDead) { btnDead.onclick = function(){ window.location.href = 'report-dead.html'; }; }
  }

  window.showEvidenceToast = function(name) {
    var toast = document.createElement('div');
    toast.className = 'ep-toast';
    toast.textContent = '📥 已保存：' + name;
    document.body.appendChild(toast);
    setTimeout(function(){ if(toast.parentNode) toast.parentNode.removeChild(toast); }, 2000);
  };

  updatePanel();
})();
