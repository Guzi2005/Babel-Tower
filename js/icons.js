// 微软 Fluent 扁平风格 / 像素质感 SVG 图标库
(function () {
  const ICONS = {
    // 关卡 Babel Tower 图标
    tower: `<svg class="hud-svg" viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M11 2h2l1 4h-4l1-4z" fill="#ffe066"/>
      <path d="M7.5 6h9l-1 5h-7l-1-5z" fill="#f59e0b"/>
      <path d="M5.5 11h13l-1.2 5.5H6.7L5.5 11z" fill="#d97706"/>
      <path d="M3.5 16.5h17V22h-17v-5.5z" fill="#92400e"/>
      <rect x="10.5" y="17.5" width="3" height="4.5" rx="1" fill="#2d1506"/>
      <circle cx="12" cy="13.5" r="1.3" fill="#2d1506"/>
      <circle cx="12" cy="8.5" r="1" fill="#2d1506"/>
      <circle cx="12" cy="2" r="1.5" fill="#fef08a"/>
    </svg>`,

    // 塔内地图
    map: `<svg class="hud-svg" viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path d="M3 5.5l5.5-2.5 7 3L21 3.5v15l-5.5 2.5-7-3L3 20.5v-15z" fill="#e0f2fe"/>
      <path d="M3 5.5L8.5 3v15L3 20.5V5.5z" fill="#38bdf8"/>
      <path d="M8.5 3l7 3v15l-7-3V3z" fill="#0284c7"/>
      <path d="M15.5 6l5.5-2.5v15l-5.5 2.5V6z" fill="#0369a1"/>
      <circle cx="12" cy="11.5" r="2.8" fill="#ef4444"/>
      <circle cx="12" cy="11.5" r="1.2" fill="#ffffff"/>
    </svg>`,

    // 指令 1: 移动 (红色远征旌旗)
    move: `<svg class="hud-svg" viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M5 2.5v19" stroke="#b45309" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M6.3 3.5L20 8.5 6.3 13.5V3.5z" fill="#ef4444"/>
      <circle cx="11.5" cy="8.5" r="2.2" fill="#ffd24a"/>
      <circle cx="5" cy="2.5" r="1.6" fill="#ffd24a"/>
    </svg>`,

    // 指令 2: 集结 (并肩双人小队)
    rally: `<svg class="hud-svg" viewBox="0 0 24 24" width="22" height="22" fill="none">
      <circle cx="8.5" cy="7" r="3.5" fill="#38bdf8"/>
      <path d="M2.5 18c0-3.5 2.6-5 6-5s6 1.5 6 5v2.5h-12V18z" fill="#0284c7"/>
      <circle cx="16" cy="8.5" r="3" fill="#fbbf24"/>
      <path d="M12.5 18c0-2.8 1.8-4 4.5-4s4.5 1.2 4.5 4v2.5h-9V18z" fill="#d97706"/>
    </svg>`,

    // 指令 3: 互动 (黄金手掌)
    interact: `<svg class="hud-svg" viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M12 2a1 1 0 011 1v7h1.5a1 1 0 011-1 1 1 0 011 1v1h1a1 1 0 011-1 1 1 0 011 1v6c0 3.3-2.7 6-6 6h-2c-2.5 0-4.5-1-6-3.5L3.3 12.5a1.2 1.2 0 01.4-1.6 1.2 1.2 0 011.6.4L7 13.5V5a1 1 0 011-1 1 1 0 011 1v4H11V3a1 1 0 011-1z" fill="#fbbf24"/>
      <path d="M10 11h9v5c0 2.2-1.8 4-4 4h-2c-1.8 0-3.2-.8-4.3-2.7l-2.9-4.5.7-.5V14h2.5v-3H10z" fill="#f59e0b"/>
    </svg>`,

    // 指令 4: 传语 (语言广播脉冲波 - 对应 P1 参考图)
    link: `<svg class="hud-svg" viewBox="0 0 24 24" width="22" height="22" fill="none">
      <circle cx="12" cy="12" r="3.2" fill="#ffd24a"/>
      <path d="M7.8 7.8A6 6 0 007.8 16.2" stroke="#06b6d4" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M16.2 7.8a6 6 0 010 8.4" stroke="#06b6d4" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M4.8 4.8A10.2 10.2 0 004.8 19.2" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M19.2 4.8a10.2 10.2 0 010 14.4" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`,

    // 指令 5: 修筑 (木工锤与尺)
    build: `<svg class="hud-svg" viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M6 18l9-9" stroke="#b45309" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M14 4l6 6-2 2-6-6 2-2z" fill="#94a3b8"/>
      <path d="M16 2l6 6-2 2-6-6 2-2z" fill="#cbd5e1"/>
      <circle cx="5" cy="19" r="2.2" fill="#78350f"/>
      <path d="M3.5 13.5l4.5-4.5 2 2-4.5 4.5-2-2z" fill="#f59e0b"/>
    </svg>`,

    // 指令 6: 卸载 (物资木箱与下落指示)
    drop: `<svg class="hud-svg" viewBox="0 0 24 24" width="22" height="22" fill="none">
      <rect x="3.5" y="11" width="17" height="11" rx="2" fill="#d97706"/>
      <path d="M3.5 14h17M12 11v11" stroke="#b45309" stroke-width="1.6"/>
      <path d="M12 2v7.5m0 0l-3.2-3.2m3.2 3.2l3.2-3.2" stroke="#22c55e" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    // 指令 7: 驻留 (防卫哨塔 / 锚定营地)
    hold: `<svg class="hud-svg" viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M12 3l-8 4v6c0 5.5 3.8 9.5 8 10 4.2-.5 8-4.5 8-10V7l-8-4z" fill="#2563eb"/>
      <path d="M12 5.5l-6 3v4.5c0 4.2 2.8 7.2 6 7.7 3.2-.5 6-3.5 6-7.7V8.5l-6-3z" fill="#1d4ed8"/>
      <circle cx="12" cy="12" r="3.2" fill="#ffd24a"/>
    </svg>`,

    // 指令 8: 手语/队内信号 (双手手势与光芒)
    signal: `<svg class="hud-svg" viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M7 11V5a1.5 1.5 0 013 0v6" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
      <path d="M10 7V4a1.5 1.5 0 013 0v7" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
      <path d="M13 8V5a1.5 1.5 0 013 0v6" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
      <path d="M7 11c0 4 3 7 7 7s5-2 5-5v-2" stroke="#d97706" stroke-width="2" stroke-linecap="round"/>
      <circle cx="12" cy="13" r="2" fill="#ffd24a"/>
    </svg>`,

    // 口粮面包 (微软扁平风格圆胖面包)
    bread: `<svg class="hud-svg" viewBox="0 0 24 24" width="16" height="16" fill="none">
      <path d="M3 13c0-4.8 4-8 9-8s9 3.2 9 8c0 3-3 5.5-9 5.5S3 16 3 13z" fill="#d97706"/>
      <path d="M4.5 13c0-3.6 3.4-6.5 7.5-6.5s7.5 2.9 7.5 6.5c0 1.8-2 3.8-7.5 3.8s-7.5-2-7.5-3.8z" fill="#f59e0b"/>
      <path d="M8 8.5l1.6 3M12 7.8v3.2M16 8.5l-1.6 3" stroke="#fef3c7" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`,

    // 符文宝石
    rune: `<svg class="hud-svg" viewBox="0 0 24 24" width="16" height="16" fill="none">
      <path d="M12 2l8 5v10l-8 5-8-5V7l8-5z" fill="#0284c7"/>
      <path d="M12 4.2l6.2 3.8v8l-6.2 4-6.2-4V8L12 4.2z" fill="#38bdf8"/>
      <path d="M12 7l1.4 3.5 3.6 1.5-3.6 1.5L12 17l-1.4-3.5-3.6-1.5 3.6-1.5L12 7z" fill="#fef08a"/>
    </svg>`,

    // 传送门出口
    exit: `<svg class="hud-svg" viewBox="0 0 24 24" width="16" height="16" fill="none">
      <path d="M4 21V6a4 4 0 014-4h8a4 4 0 014 4v15H4z" fill="#92400e"/>
      <path d="M6.5 21V7a2.5 2.5 0 012.5-2.5h6a2.5 2.5 0 012.5 2.5v14h-11z" fill="#fef08a"/>
      <circle cx="8.5" cy="13.5" r="1.3" fill="#78350f"/>
    </svg>`,

    // 目标达成勾选
    check: `<svg class="hud-svg" viewBox="0 0 16 16" width="14" height="14" fill="none">
      <circle cx="8" cy="8" r="7" fill="#15803d"/>
      <path d="M4.5 8.2l2.3 2.3 4.7-4.7" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    // 未完成目标菱形
    diamond: `<svg class="hud-svg" viewBox="0 0 16 16" width="12" height="12" fill="none">
      <path d="M8 2l5 6-5 6-5-6 5-6z" fill="#ffd24a"/>
    </svg>`,

    // 横幅通知图标
    info: `<svg class="hud-svg" viewBox="0 0 16 16" width="15" height="15" fill="none"><circle cx="8" cy="8" r="7" fill="#0284c7"/><path d="M8 7v4.5M8 4.5v.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/></svg>`,
    warn: `<svg class="hud-svg" viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M8 1.8l6.8 11.8H1.2L8 1.8z" fill="#f59e0b"/><path d="M8 6.5v3.2M8 11.8v.5" stroke="#271a06" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    good: `<svg class="hud-svg" viewBox="0 0 16 16" width="15" height="15" fill="none"><circle cx="8" cy="8" r="7" fill="#16a34a"/><path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    story: `<svg class="hud-svg" viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M8 2l5 6-5 6-5-6 5-6z" fill="#a855f7"/><circle cx="8" cy="8" r="2" fill="#fdf4ff"/></svg>`,
    danger: `<svg class="hud-svg" viewBox="0 0 16 16" width="15" height="15" fill="none"><circle cx="8" cy="8" r="7" fill="#dc2626"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/></svg>`
  };

  window.ICONS = ICONS;
})();
