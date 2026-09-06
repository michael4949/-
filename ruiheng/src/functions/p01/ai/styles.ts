/** 智慧获客 AI 共用样式（前缀 ai-）；全部渐变，无纯色块。 */
export const AI_CSS = `
.ai-hl{animation:aiHl 2.6s ease}
@keyframes aiHl{0%{box-shadow:0 0 0 3px rgba(195,39,43,.45),0 10px 24px rgba(227,169,60,.25);background:linear-gradient(120deg,rgba(255,241,239,.98),rgba(255,248,230,.98))}100%{box-shadow:none}}
.ai-sec{display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;letter-spacing:.14em;color:var(--gold-3);margin:14px 0 8px}
.ai-sec:first-child{margin-top:0}
.ai-sec::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(201,162,77,.45),rgba(61,187,134,.25),rgba(255,255,255,0))}
.ai-muted{color:var(--ink-3);font-size:12px}
.ai-ul{list-style:none;display:flex;flex-direction:column;gap:5px}
.ai-ul li{position:relative;padding-left:14px;font-size:12.5px;color:var(--ink-2)}
.ai-ul li::before{content:"";position:absolute;left:0;top:8px;width:7px;height:7px;border-radius:50%;background:var(--g-iris)}
.ai-seg{display:inline-flex;gap:4px;padding:3px;border-radius:10px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.2)}
.ai-seg button{border:0;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,rgba(255,255,255,.6),rgba(255,255,255,.25));color:var(--ink-2);font-family:inherit}
.ai-seg button.on{background:var(--g-red);color:#fff;box-shadow:0 6px 14px rgba(195,39,43,.22)}
.ai-seg button.on.green{background:var(--g-green)}
.ai-seg button.on.gold{background:var(--g-gold);color:#3a2a08}
.ai-toast{position:fixed;left:50%;bottom:46px;transform:translateX(-50%);z-index:70;padding:10px 18px;border-radius:999px;background:var(--g-green);color:#fff;font-weight:700;font-size:13px;box-shadow:0 12px 30px rgba(31,138,90,.3);display:inline-flex;align-items:center;gap:8px}
.ai-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.ai-form .f{display:flex;flex-direction:column;gap:5px;font-size:11.5px;color:var(--ink-3);font-weight:800;letter-spacing:.06em}
@media(max-width:1100px){.ai-form{grid-template-columns:1fr}}
.ai-evref{display:inline-flex;align-items:center;gap:3px;font-size:10.5px;font-weight:800;padding:1px 7px;border-radius:999px;cursor:pointer;background:var(--g-blue-soft);color:#1d4ed8;box-shadow:inset 0 0 0 1px rgba(58,134,255,.3);margin:0 2px;vertical-align:1px;white-space:nowrap}
.ai-evref.off{background:var(--g-red-soft);color:var(--red-3);text-decoration:line-through;box-shadow:inset 0 0 0 1px rgba(195,39,43,.3)}
.ai-evref.up{background:var(--g-gold-soft);color:var(--gold-3);box-shadow:inset 0 0 0 1px rgba(201,162,77,.35)}

/* 目标 / 约束输入 */
.ai-intent textarea{width:100%;min-height:74px;border:0;outline:0;resize:vertical;padding:10px 12px;border-radius:12px;font-family:inherit;font-size:13px;color:var(--ink);background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.3)}
.ai-intent textarea:focus{box-shadow:inset 0 0 0 1.5px rgba(195,39,43,.45)}
.ai-ex{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px;align-items:center}
.ai-ex button{border:0;cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:999px;color:var(--ink-2);background:linear-gradient(135deg,rgba(255,255,255,.85),rgba(255,247,236,.7));box-shadow:inset 0 0 0 1px rgba(201,162,77,.22)}
.ai-ex button:hover{background:var(--g-gold-soft)}
.ai-under{margin-top:10px;padding:10px 12px;border-radius:12px;background:linear-gradient(120deg,rgba(255,248,230,.9),rgba(255,255,255,.9) 45%,rgba(236,248,243,.9));box-shadow:inset 0 0 0 1px rgba(201,162,77,.3)}
.ai-under .h{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;margin-bottom:6px}
.ai-under .h .ai-muted{font-weight:600}
.ai-cs{display:flex;flex-wrap:wrap;gap:6px}
.ai-c{display:inline-flex;align-items:center;gap:6px;padding:4px 8px 4px 10px;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;user-select:none;background:var(--g-green-soft);color:var(--green-3);box-shadow:inset 0 0 0 1px rgba(31,138,90,.3)}
.ai-c .g{font-size:10px;font-weight:800;padding:0 6px;border-radius:999px;background:linear-gradient(135deg,rgba(255,255,255,.9),rgba(255,255,255,.5));color:var(--ink-3)}
.ai-c.off{background:linear-gradient(135deg,rgba(255,255,255,.8),rgba(245,240,232,.8));color:var(--ink-3);text-decoration:line-through;box-shadow:inset 0 0 0 1px rgba(201,162,77,.25)}
.ai-c .x{border:0;background:transparent;cursor:pointer;color:inherit;opacity:.6;display:grid;place-items:center;padding:0}
.ai-c .x:hover{opacity:1}

/* 证据检索面板 */
.ai-src{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin-bottom:10px}
@media(max-width:1100px){.ai-src{grid-template-columns:repeat(3,minmax(0,1fr))}}
.ai-src .s{padding:7px 9px;border-radius:10px;font-size:11px;font-weight:800;color:var(--ink-3);background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.16);display:flex;flex-direction:column;gap:2px}
.ai-src .s b{font-size:12px;color:var(--ink);display:flex;align-items:center;gap:6px}
.ai-src .s.run{background:var(--g-red-soft);color:var(--red-3);box-shadow:inset 0 0 0 1px rgba(195,39,43,.3)}
.ai-src .s.ok{background:var(--g-green-soft);color:var(--green-3)}
.ai-evl{display:flex;flex-direction:column;gap:8px;max-height:560px;overflow:auto;padding-right:2px}
.ai-evc{padding:10px 12px;border-radius:12px;background:linear-gradient(90deg,rgba(255,255,255,.8),rgba(255,247,236,.6) 60%,rgba(236,248,243,.55));box-shadow:inset 0 0 0 1px rgba(201,162,77,.16);cursor:pointer;transition:box-shadow .15s}
.ai-evc:hover{box-shadow:inset 0 0 0 1px rgba(201,162,77,.45)}
.ai-evc.off{opacity:.55;background:linear-gradient(90deg,rgba(255,241,239,.8),rgba(255,255,255,.6))}
.ai-evc.off .t{text-decoration:line-through}
.ai-evc .hd{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ai-evc .id{font-size:10.5px;font-weight:900;padding:1px 7px;border-radius:6px;background:var(--g-iris);color:#fff}
.ai-evc .t{font-weight:800;font-size:12.5px;flex:1;min-width:120px}
.ai-evc .tm{font-size:11px;color:var(--ink-3);white-space:nowrap}
.ai-evc .rel{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--ink-3);margin-top:5px}
.ai-evc .rel .bar{flex:1;height:5px}
.ai-evc .rel b{width:34px;text-align:right}
.ai-evc .ex{font-size:12px;color:var(--ink-2);margin-top:4px;padding-left:10px;border-left:3px solid;border-image:linear-gradient(180deg,#e3a93c,#3dbb86) 1}
.ai-evc .dt{margin-top:8px;padding:8px 10px;border-radius:10px;background:var(--g-holo-2);font-size:11.5px;color:var(--ink-2)}
.ai-evc .dt .row{display:flex;justify-content:space-between;gap:10px;padding:2px 0}
.ai-evc .dt .row span{color:var(--ink-3)}
.ai-evc .ft{display:flex;gap:6px;align-items:center;margin-top:7px;flex-wrap:wrap}
.ai-evc .ft .lnk{padding:0}
.ai-ev-empty{min-height:150px;display:grid;place-items:center;text-align:center;color:var(--ink-3);font-size:12.5px}
.ai-ev-empty .ring{width:50px;height:50px;border-radius:50%;background:var(--g-iris-soft);display:grid;place-items:center;margin:0 auto 8px;box-shadow:inset 0 0 0 1px rgba(201,162,77,.3);color:var(--red)}

/* 推理链 */
.ai-chain{display:grid;grid-template-columns:minmax(0,1fr) 18px minmax(0,1.1fr) 18px minmax(0,1.2fr);gap:6px;align-items:stretch;margin-top:8px}
@media(max-width:1100px){.ai-chain{grid-template-columns:1fr}.ai-chain .arr{transform:rotate(90deg);height:18px}}
.ai-chain .st{padding:8px 10px;border-radius:10px;font-size:12px;color:var(--ink-2);background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.18)}
.ai-chain .st b{display:block;font-size:10.5px;letter-spacing:.12em;color:var(--gold-3);margin-bottom:3px}
.ai-chain .st.e{background:var(--g-blue-soft)} .ai-chain .st.j{background:var(--g-gold-soft)} .ai-chain .st.s{background:var(--g-green-soft)}
.ai-chain .arr{display:grid;place-items:center;color:var(--gold-3)}
.ai-conf{display:flex;align-items:center;gap:8px;margin-top:7px;font-size:11.5px;color:var(--ink-3);flex-wrap:wrap}
.ai-conf .bar{width:120px;height:6px}
.ai-conf b{color:var(--ink)}
.ai-counter{margin-top:6px;padding:7px 10px;border-radius:10px;font-size:12px;color:var(--red-3);background:var(--g-red-soft);box-shadow:inset 0 0 0 1px rgba(195,39,43,.18);display:flex;gap:6px;align-items:flex-start}
.ai-chain-acts{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;align-items:center}
.ai-item{padding:12px 14px;border-radius:14px;margin-bottom:10px;background:linear-gradient(135deg,rgba(255,255,255,.85),rgba(255,247,236,.65) 60%,rgba(236,248,243,.6));box-shadow:inset 0 0 0 1px rgba(201,162,77,.16)}
.ai-item .ih{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ai-item .ih b{font-size:13.5px;font-weight:900}
.ai-item .ib{font-size:12.5px;color:var(--ink-2);margin-top:5px}
.ai-item.alt{box-shadow:inset 0 0 0 1px rgba(155,93,229,.4)}
.ai-item[contenteditable="true"],.ai-editable[contenteditable="true"]{outline:2px dashed rgba(201,162,77,.6);outline-offset:4px;border-radius:12px}

/* 追问 AI 抽屉 */
.ai-fab{position:fixed;right:22px;bottom:22px;z-index:80;display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:999px;border:0;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:800;color:#fff;background:var(--g-red);box-shadow:0 14px 30px rgba(195,39,43,.35);transition:transform .15s}
.ai-fab:hover{transform:translateY(-2px)}
.ai-fab .n{font-size:10.5px;padding:0 6px;border-radius:999px;background:linear-gradient(135deg,rgba(255,255,255,.4),rgba(255,255,255,.2))}
.ai-ask{position:fixed;right:22px;bottom:22px;z-index:85;width:min(420px,94vw);max-height:min(640px,86vh);display:flex;flex-direction:column;border-radius:18px;background:var(--g-holo);box-shadow:var(--shadow),inset 0 0 0 1px rgba(201,162,77,.35);overflow:hidden}
.ai-ask .hd{display:flex;align-items:center;gap:8px;padding:12px 14px;background:linear-gradient(120deg,rgba(195,39,43,.14),rgba(227,169,60,.18) 50%,rgba(61,187,134,.16))}
.ai-ask .hd b{font-size:13.5px;flex:1}
.ai-ask .body{flex:1;overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px;min-height:200px}
.ai-msg{max-width:92%;padding:9px 12px;border-radius:14px;font-size:12.5px;line-height:1.6;color:var(--ink-2);background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.2);align-self:flex-start;white-space:pre-line}
.ai-msg.user{align-self:flex-end;background:var(--g-red-soft);color:var(--red-3);box-shadow:inset 0 0 0 1px rgba(195,39,43,.2)}
.ai-msg .ev{margin-top:6px;display:flex;flex-wrap:wrap;gap:3px;align-items:center}
.ai-msg .ap{margin-top:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.ai-presets{display:flex;flex-wrap:wrap;gap:5px;padding:0 14px 8px}
.ai-presets button{border:0;cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:999px;color:var(--ink-2);background:linear-gradient(135deg,rgba(255,255,255,.9),rgba(255,247,236,.75));box-shadow:inset 0 0 0 1px rgba(201,162,77,.25)}
.ai-presets button:hover{background:var(--g-gold-soft)}
.ai-ask .in{display:flex;gap:8px;padding:10px 14px 12px;border-top:1px dashed rgba(201,162,77,.4);background:linear-gradient(180deg,rgba(255,255,255,.4),rgba(255,247,236,.5))}
.ai-ask .in input{flex:1;border:0;outline:0;padding:9px 12px;border-radius:10px;font-family:inherit;font-size:13px;color:var(--ink);background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.3)}
.ai-typing{display:inline-flex;gap:3px;align-items:center}
.ai-typing i{width:6px;height:6px;border-radius:50%;background:var(--g-red);animation:aiDot 1s infinite}
.ai-typing i:nth-child(2){animation-delay:.2s}.ai-typing i:nth-child(3){animation-delay:.4s}
@keyframes aiDot{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}

/* A/B 版本对比 */
.ai-vers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
@media(max-width:1100px){.ai-vers{grid-template-columns:1fr}}
.ai-ver{padding:12px 14px;border-radius:14px;background:linear-gradient(135deg,rgba(255,255,255,.85),rgba(255,247,236,.7) 60%,rgba(236,248,243,.6));box-shadow:inset 0 0 0 1px rgba(201,162,77,.2);cursor:pointer}
.ai-ver.B{background:linear-gradient(135deg,rgba(255,255,255,.85),rgba(245,238,255,.75) 60%,rgba(255,241,239,.6))}
.ai-ver.on{box-shadow:inset 0 0 0 2px rgba(195,39,43,.5),var(--shadow-sm)}
.ai-ver .vh{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ai-ver .vh b{font-size:14px;font-weight:900}
.ai-ver .keep{margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;cursor:pointer}
.ai-ver .vk{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:8px}
.ai-ver .vk div{padding:6px 8px;border-radius:9px;background:var(--g-holo-2);font-size:11px;color:var(--ink-3)}
.ai-ver .vk div b{display:block;font-size:14px;color:var(--ink)}
.ai-ver .vl{margin-top:8px}

/* 计算构成 */
.ai-formula{width:100%;border-collapse:collapse;font-size:12px}
.ai-formula td{padding:5px 6px;border-bottom:1px dashed var(--line)}
.ai-formula td:nth-child(2){text-align:right;font-weight:900;white-space:nowrap}
.ai-formula td:nth-child(3){color:var(--ink-3);font-size:11px}
.ai-formula tr.sum td{border-bottom:0;font-weight:900;background:var(--g-gold-soft)}
.ai-formula tr.sum td:first-child{border-radius:8px 0 0 8px}.ai-formula tr.sum td:last-child{border-radius:0 8px 8px 0}
.ai-formula .neg{color:var(--red)} .ai-formula .pos{color:var(--green)}

/* 权重滑杆 */
.ai-w{display:flex;align-items:center;gap:10px;font-size:12px;margin-top:8px}
.ai-w .l{width:150px;flex-shrink:0;color:var(--ink-2);font-weight:700}
.ai-w input[type=range]{flex:1;accent-color:#c3272b}
.ai-w b{width:28px;text-align:right}
.ai-w .pct{width:44px;text-align:right;color:var(--ink-3);font-size:11px}
.ai-basis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:8px}
@media(max-width:1100px){.ai-basis{grid-template-columns:repeat(2,minmax(0,1fr))}}
.ai-basis .b{padding:7px 9px;border-radius:10px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.16);font-size:11px;color:var(--ink-3)}
.ai-basis .b b{display:block;font-size:13px;color:var(--ink)}
.ai-basis .b .bar{height:5px;margin-top:4px}
.ai-basis .b small{display:block;font-size:10.5px;margin-top:2px}
@media print{.ai-fab,.ai-ask{display:none!important}}
`;
